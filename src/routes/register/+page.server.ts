import { fail, redirect, type ActionFailure, type Actions } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import { db, users } from "$lib/server/db";
import { eq, and, gt } from "drizzle-orm";
import { FingerprintJsServerApiClient, Region } from "@fingerprintjs/fingerprintjs-pro-server-api";
import { SECRET_FINGERPRINT_API_KEY } from '$env/static/private';

type ValidationCheckResult = ActionFailure<{ message: string }> | void;

export const ssr = false;

export const actions: Actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        const email = formData.get("email");
        const password = formData.get("password");
        // Retrieve the visitorId and requestId form values
        const visitorId = formData.get("visitorId");
        const requestId = formData.get("requestId");

        if (!email || typeof email !== "string" || email.indexOf("@") === -1) {
            return fail(400, {
                message: "Invalid email"
            });
        }

        if (!password || typeof password !== "string" || password.length < 8 || password.length > 255) {
            return fail(400, {
                message: "Invalid password"
            });
        }

        // Validate that the visitorId and requestId are present and are strings
        if (!visitorId || !requestId || typeof visitorId !== "string" || typeof requestId !== "string") {
            return fail(400, {
                message: "Please turn off any ad blockers and try again."
            });
        }

        const userExists = await checkUserExists(email);
        if (userExists) return userExists;

        // Use the Fingerprint API to verify the visitorId and requestId
        const validVisitorAndRequestId = await verifyVisitorId(visitorId, requestId);
        if (validVisitorAndRequestId) return validVisitorAndRequestId;

        // Use the visitorId to check if the user has registered too many accounts from the same browser
        const browserLimitReached = await checkUsersRegisteredForBrowser(visitorId);
        if (browserLimitReached) return browserLimitReached;

        const userId = await registerUser(email, password, visitorId);

        const session = await lucia.createSession(userId, {});
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: ".",
            ...sessionCookie.attributes
        });

        redirect(302, "/protected");
    }
}

/**
 * Checks if the user already exists in the database and, if they do, returns an error.
 * @param email The email address of the new user registering that will be checked
 * @returns An error if the user already exists, otherwise void
 */
async function checkUserExists(email: string): Promise<ValidationCheckResult>{
    const existingUsers = await db.select().from(users).where(eq(users.username, email));

    if (existingUsers.length > 0) {
        return fail(400, {
            message: "You are already registered. Please log in."
        });
    }
}

/**
 * Verifies the visitor ID and request ID using the Fingerprint API. This includes
 * checking that the visitorId belongs to the requestId, that the requestId is not
 * older than 2 minutes, and that the confidence score is above 0.9.
 * @param visitorId The user's Fingerprint Visitor ID
 * @param requestId The request ID from Fingerprint
 * @returns An error if the visitor ID is invalid, otherwise void
 */
async function verifyVisitorId(visitorId: string, requestId: string): Promise<ValidationCheckResult>{
    const client = new FingerprintJsServerApiClient({
        apiKey: SECRET_FINGERPRINT_API_KEY,
        region: Region.Global
    });

    const eventData = await client.getEvent(requestId);
    const identification = eventData.products?.identification?.data;

    if (!identification) {
        return fail(400, {
            message: "Invalid identification data."
        });
    }

    // If the visitor IDs don't match, return an error
    if (identification.visitorId !== visitorId) {
        return fail(400, {
            message: "Forged Visitor ID."
        });
    }

    // Make sure the identification is not older than 2 minutes
    if (new Date(identification.timestamp) < new Date(Date.now() - 1000 * 60 * 2)) {
        return fail(400, {
            message: "Expired identification timestamp."
        });
    }

    // Make sure the confidence score is above 0.9
    if (identification.confidence.score < 0.9) {
        return fail(400, {
            message: "Low confidence identification score."
        });
    }
}

/**
 * Checks if the user has registered more than 5 accounts from the same browser in the last 7 days.
 * @param visitorId The user's Fingerprint Visitor ID
 * @returns An error if the user has registered too many accounts from the same browser, otherwise void
 */
async function checkUsersRegisteredForBrowser(visitorId: string): Promise<ValidationCheckResult>{
    // Get Date object for seven days ago
    const sevenDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    // Query the users table for any users created in the last 7 days
    // with the same visitor ID 
    const existingUsers = await db.select().from(users)
        .where(
            and(
                eq(users.visitorId, visitorId), 
                gt(users.createdAt, sevenDaysAgo)));

    // If the user has registered more than 5 accounts in the last 7 days, return an error
    if (existingUsers.length >= 5) {
        return fail(400, {
            message: "You cannot register any more accounts from this browser."
        });
    }
}

/**
 * Registers a new user in the database.
 * @param email The email address of the new user registering
 * @param password The password of the new user registering
 * @param visitorId The user's Fingerprint Visitor ID
 * @returns The ID of the newly registered user
 */
async function registerUser(email: string, password: string, visitorId: string): Promise<string> {
    const userId = generateId(15);
    const hashedPassword = await new Argon2id().hash(password);

    await db.insert(users)
        .values({
            id: userId,
            username: email,
            hashedPassword: hashedPassword,
            createdAt: new Date(),
            // Add the visitor ID to the user record
            visitorId: visitorId
        });

    return userId;
}
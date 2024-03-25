# Fingerprint Svelte Demo Application

This repository demonstrates how to add Fingerprint to a Svelte application to prevent users from registering an excessive number of accounts for a web app.

## Getting Started

Clone this repository and install the dependencies using this command:

```shell
npm i
```

You'll need a Postgres database to store user details. You can use Docker to host one locally using the following command:

```shell
docker run --name svelte-postgres -p 5432:5432 -e POSTGRES_PASSWORD=verysecurepassword -e POSTGRES_DB=svelte -d postgres
```

Copy the `.env.example` file and call it `.env`. Then, update the database details in that file:

```
DB_HOST=<YOUR_DB_HOST>
DB_PORT=<YOUR_DB_PORT>
DB_NAME=<YOUR_DB_NAME>
DB_USER=<YOUR_DB_USER>
DB_PASSWORD=<YOUR_DB_PASSWORD>
```

You'll also need a Fingerprint account to run this demo app. If you don't have one, sign up for a trial today. Once you've signed up, create a public and secret API key. Once you have them, add the API Keys to the `.env` file:

```
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
PUBLIC_FINGERPRINT_API_KEY=<YOUR_PUBLIC_API_KEY>
SECRET_FINGERPRINT_API_KEY=<YOUR_SECRET_API_KEY>
```

Once you've configured the database and Fingerprint API Keys in the app, use the following command to run the Drizzle ORM migrations:

```shell
npm run push
```

Then, start the application using the following command:

```shell
npm run dev
```

## Technologies

The web app is built using Svelte and SvelteKit. In addition to that:

- **Drizzle ORM** is used to access the Postgres database
- **Lucia** is used to manage auth
- **Skeleton** and **Tailwind** are used to build the UI
- **Fingerprint** is used to generate browser fingerprints
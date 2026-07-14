# Persuade Backend

This backend exposes the API used by the Persuade frontend. It manages users, courses, masterclasses, chat, follow-up requests, referral logic, and learner progress using Firebase Authentication and Firestore.

## Stack

- Node.js
- Express
- Firebase Admin SDK
- Firestore

## Requirements

- Node.js 18 or newer
- npm
- A Firebase project
- A Firebase Admin service account

## Setup

Install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

## Environment Variables

The backend supports two ways to load Firebase Admin credentials.

### Option 1: local file

- put the service account JSON at `backend/serviceAccountKey.json`
- set:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

### Option 2: environment variable

- set:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Main variables

```bash
PORT=3001
JSON_LIMIT=6mb
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

## Run

Development:

```bash
npm run dev
```

Production-like local run:

```bash
npm start
```

## Available Scripts

```bash
npm run dev
npm start
npm run audit:coach-roles
npm run delete:coaches
npm run reset:data
```

### Script Notes

- `audit:coach-roles`: dry-run audit for suspicious role mismatches between learner and coach accounts
- `delete:coaches`: deletes coach profiles and linked coach-owned data
- `reset:data`: recursively clears Firestore root collections and deletes Auth users

## API Overview

Base URL:

```text
/api
```

### Health

- `GET /health`

### Users

- `GET /users/me`
- `GET /users`
- `GET /users/referral/:code/validate`
- `PATCH /users/me`
- `POST /users/referral/claim`
- `GET /users/progress/me`
- `PUT /users/progress/me`
- `GET /users/progress/:userId`

### Courses

- `GET /courses`
- `GET /courses/coach`
- `POST /courses/reorder`
- `POST /courses`
- `PATCH /courses/:id`
- `DELETE /courses/:id`
- `GET /courses/:id`

### Course Requests

- `GET /requests/me`
- `GET /requests/coach`
- `POST /requests`
- `PATCH /requests/:id`
- `DELETE /requests/:id`

### Masterclasses

- `GET /masterclasses`
- `GET /masterclasses/registrations/summary`
- `GET /masterclasses/registrations/me`
- `GET /masterclasses/registrations/coach`
- `GET /masterclasses/coach`
- `POST /masterclasses/reorder`
- `POST /masterclasses`
- `PATCH /masterclasses/:id`
- `DELETE /masterclasses/:id`
- `POST /masterclasses/:id/register`
- `DELETE /masterclasses/registrations/:id`
- `PATCH /masterclasses/registrations/:id`

### Chat

- `GET /chat/conversations`
- `POST /chat/conversations`
- `GET /chat/conversations/:id/messages`
- `POST /chat/conversations/:id/messages`

### Follow-Up

- `GET /follow-up/me`
- `GET /follow-up/coach`
- `POST /follow-up`
- `PATCH /follow-up/:id`

## Auth Model

Protected routes use Firebase ID tokens in the `Authorization` header:

```text
Authorization: Bearer <firebase-id-token>
```

The token is verified by `verifyToken` in:

- [src/middleware/authMiddleware.js](/mnt/c/Users/salma/Desktop/New%20folder/Persuade.prod/backend/src/middleware/authMiddleware.js)

## High-Level Backend Structure

- [src/index.js](/mnt/c/Users/salma/Desktop/New%20folder/Persuade.prod/backend/src/index.js): app bootstrap, middleware, route mounting
- `src/routes/`: route modules grouped by domain
- `src/utils/`: normalization, Firestore error handling, coach directory helpers
- `src/data/`: seed data for courses and masterclasses
- `scripts/`: maintenance and audit scripts

## Security Notes

- CORS is restricted through `CORS_ORIGIN`
- security headers are set at the Express level
- Firestore access control still matters for any direct frontend Firestore usage
- role updates are intentionally locked down to avoid accidental learner/coach role drift

## Operational Notes

- public course and masterclass endpoints use in-memory caching
- several routes include Firestore fallback/error translation
- role-related account audits can be run before any manual repair

## Troubleshooting

### Firebase Admin credentials not found

Make sure one of these is configured:

- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `backend/serviceAccountKey.json`

### CORS errors

Check that the frontend origin is included in `CORS_ORIGIN`.

### Port conflicts

Change:

```bash
PORT=3001
```

### Firestore / DNS failures in sandboxed environments

Some maintenance scripts require network access to Google services and may need to be run outside restricted sandboxes.

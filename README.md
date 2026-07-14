# Persuade

Persuade is a full-stack learning platform built around negotiation training, coach-led content, guided follow-up, chat, courses, and masterclasses.

## Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project with Authentication and Firestore enabled

## Project Structure

- `front/`: Vue 3 + Vite + Vuetify frontend
- `backend/`: Node.js + Express + Firebase Admin API

## Installation

```bash
cd front
npm install

cd ../backend
npm install
```

## Configuration

### Frontend

Copy `front/.env.example` to `front/.env` and fill in the values:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### Backend

Copy `backend/.env.example` to `backend/.env`.

Local option:

- place the Firebase Admin key in `backend/serviceAccountKey.json`
- keep `FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json`

Production option:

- provide `FIREBASE_SERVICE_ACCOUNT` as a single-line JSON string

Main backend variables:

```bash
PORT=3001
JSON_LIMIT=6mb
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

## Run Locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd front
npm run dev
```

## Useful Local URLs

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`
- Health check: `GET /api/health`
- Basic protected route: `GET /api/users/me`

## First Production Deployment Checklist

- set `VITE_API_BASE_URL` to the public backend URL
- set `CORS_ORIGIN` to the public frontend URL
- do not commit `backend/serviceAccountKey.json`
- prefer `FIREBASE_SERVICE_ACCOUNT` in the hosting environment
- review Firestore rules before public release

## Firestore Rules

Deploy rules when needed:

```bash
firebase deploy --only firestore:rules
```

## Additional Documentation

- Backend documentation: [backend/README.md](/mnt/c/Users/salma/Desktop/New%20folder/Persuade.prod/backend/README.md)

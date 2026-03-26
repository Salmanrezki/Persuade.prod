Persuade - preparation front + back

## Prerequis

- Node.js 18 minimum
- npm
- Un projet Firebase actif avec Auth et Firestore

## Structure

- `front/` : Vue 3 + Vite + Vuetify
- `backend/` : Node.js + Express + Firebase Admin

## Installation

```bash
cd front
npm install
cd ../backend
npm install
```

## Configuration

### Frontend

Copier `front/.env.example` vers `front/.env` et renseigner :

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

Copier `backend/.env.example` vers `backend/.env`.

Option 1, locale :
- placer la cle Firebase Admin dans `backend/serviceAccountKey.json`
- laisser `FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json`

Option 2, production :
- injecter `FIREBASE_SERVICE_ACCOUNT` avec le JSON complet du service account sur une seule ligne

Variables principales :

```bash
PORT=3001
JSON_LIMIT=6mb
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

## Lancement

```bash
cd backend
npm run dev
```

```bash
cd front
npm run dev
```

## Verification utile

- Front local : `http://localhost:5173`
- API locale : `http://localhost:3001`
- Healthcheck API : `GET /api/health`
- Route protegee de base : `GET /api/users/me`

## Premiere mise en prod

- definir `VITE_API_BASE_URL` avec l URL publique du backend
- definir `CORS_ORIGIN` avec l URL publique du front
- ne pas committer `backend/serviceAccountKey.json`
- preferer `FIREBASE_SERVICE_ACCOUNT` cote hebergeur pour la prod
- verifier les regles Firestore avant ouverture publique

## Firestore

Deployer les regles si besoin :

```bash
firebase deploy --only firestore:rules
```

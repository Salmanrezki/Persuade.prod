# Mise en production

## Cible retenue

- Frontend : Firebase Hosting
- Backend : service Node ou conteneur Docker
- Firestore/Auth : projet Firebase existant

## 1. Variables frontend

Creer un fichier `front/.env.production.local` ou renseigner ces variables dans la phase de build :

```bash
VITE_API_BASE_URL=https://api.ton-domaine.com/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

## 2. Variables backend

Configurer ces variables sur l hebergeur backend :

```bash
NODE_ENV=production
PORT=3001
JSON_LIMIT=6mb
CORS_ORIGIN=https://ton-front.web.app,https://ton-front.firebaseapp.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

Notes :

- `CORS_ORIGIN` doit contenir l URL publique exacte du frontend
- utiliser `FIREBASE_SERVICE_ACCOUNT` en prod, pas `serviceAccountKey.json`

## 3. Build frontend

```bash
cd front
npm install
npm run build
```

Le fichier [`firebase.json`](/mnt/c/Users/salma/Desktop/PERSUADE/PROJECT/G-EIP-700-PAR-7-1-eip-38/firebase.json) est deja configure pour servir `front/dist` avec rewrite SPA.

## 4. Deploiement Firebase

```bash
firebase login
firebase use <project-id>
firebase deploy --only hosting,firestore:rules
```

## 5. Deploiement backend

Deux options :

- hebergeur Node : lancer `npm install --omit=dev` puis `npm start`
- hebergeur Docker : builder avec [`backend/Dockerfile`](/mnt/c/Users/salma/Desktop/PERSUADE/PROJECT/G-EIP-700-PAR-7-1-eip-38/backend/Dockerfile)

Commande Docker locale de reference :

```bash
cd backend
docker build -t persuade-backend .
docker run --env-file .env -p 3001:3001 persuade-backend
```

## 6. Verification finale

- ouvrir le frontend public
- verifier `GET /api/health` sur le backend
- verifier la connexion
- verifier `/api/users/me`
- verifier qu une page vide reste bien vide sans faux contenus
- verifier qu aucune erreur CORS ou Firebase n apparait dans la console

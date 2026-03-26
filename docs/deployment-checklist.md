# Checklist premiere mise en prod

## 1. Configuration

- Renseigner `front/.env` a partir de `front/.env.example`
- Renseigner `backend/.env` a partir de `backend/.env.example`
- Definir `VITE_API_BASE_URL` avec l URL publique du backend
- Definir `CORS_ORIGIN` avec l URL publique du frontend
- Injecter `FIREBASE_SERVICE_ACCOUNT` dans l hebergeur backend
- Verifier que `backend/serviceAccountKey.json` n est pas deploye en prod

## 2. Firebase

- Firebase Auth active
- Firestore actif
- Deployer les regles Firestore du repo
- Verifier que les index Firestore requis existent si une erreur d index apparait

## 3. Build et verification locale

- Lancer `npm run build` dans `front`
- Verifier la syntaxe backend avec `node --check src/index.js`
- Verifier la route `GET /api/health`
- Se connecter avec un compte apprenant
- Se connecter avec un compte coach
- Verifier dashboard, chat, cours, masterclass, profil, preferences

## 4. Verification apres deploiement

- Ouvrir le frontend public
- Verifier que l authentification fonctionne
- Verifier un appel API authentifie vers `/api/users/me`
- Verifier qu une creation de demande de cours fonctionne
- Verifier qu une inscription masterclass fonctionne
- Verifier que le chat charge les conversations existantes
- Verifier qu aucune erreur CORS n apparait dans le navigateur

## 5. Securite minimale

- Limiter `CORS_ORIGIN` au vrai domaine frontend
- Ne jamais exposer la cle Admin Firebase dans le frontend
- Utiliser HTTPS cote frontend et backend
- Garder les permissions Firestore deployees depuis le repo
- Ne pas ouvrir des routes backend sans verification Firebase

## 6. Exploitation initiale

- Surveiller les logs backend au premier lancement
- Verifier les erreurs Firestore et les refus de permissions
- Suivre la taille du bundle frontend
- Garder une copie de la configuration de prod dans le gestionnaire de secrets

## 7. Rollback simple

- Revenir a la version frontend precedente
- Revenir a la version backend precedente
- Remettre les anciennes variables d environnement si elles ont change
- Rejouer un test rapide sur `/api/health` et la connexion utilisateur

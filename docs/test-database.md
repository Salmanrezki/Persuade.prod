# Base de test locale

La base de test utilise les émulateurs Firebase Auth et Firestore avec le projet fictif `demo-persuade-test`. Aucune commande ci-dessous n'écrit dans le projet Firebase réel. Le script d'import refuse de démarrer sans les deux adresses d'émulateur locales.

## Prérequis

- Node.js et les dépendances de `front/` et `backend/` installées.
- Firebase CLI (`firebase.cmd` sous Windows).
- Java disponible dans le `PATH` pour l'émulateur Firestore.

## Démarrer les émulateurs

Depuis la racine du dépôt, dans un premier terminal PowerShell :

```powershell
$emulatorJavaHome=(Resolve-Path '.tools/java/jdk-21.0.13+9-jre').Path
$env:JAVA_HOME=$emulatorJavaHome
$env:Path=(Join-Path $emulatorJavaHome 'bin') + ';' + $env:Path
firebase.cmd emulators:start --only auth,firestore --project demo-persuade-test --export-on-exit .firebase-emulator-data
```

Ces trois premières lignes utilisent le Java portable installé dans `.tools/` sur cette machine. Si ce dossier n'existe pas, installez Java 21 et assurez-vous que `java` est dans le `PATH` avant de lancer la commande Firebase.

Après un premier arrêt propre, restaurer les données aux démarrages suivants :

```powershell
firebase.cmd emulators:start --only auth,firestore --project demo-persuade-test --import .firebase-emulator-data --export-on-exit .firebase-emulator-data
```

La console locale des émulateurs se trouve sur `http://127.0.0.1:4000`.

## Importer le contenu

Dans un second terminal PowerShell :

```powershell
cd backend
$env:FIREBASE_TEST_PROJECT_ID='demo-persuade-test'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
npm.cmd run seed:test:preview
npm.cmd run seed:test
npm.cmd run seed:test:verify
npm.cmd run smoke:test-db
```

L'import utilise des identifiants fixes et peut être relancé sans créer de doublons. Il crée deux comptes, deux cours vidéo, trois exercices avec corrigés et deux masterclass à J+7 et J+14. Les vidéos pointent vers des ressources externes déjà présentes dans le dépôt ; aucun média n'est copié dans Firebase. Les liens de visioconférence des masterclass restent vides, car il s'agit de rendez-vous fictifs.

Comptes réservés à l'émulateur :

| Rôle | Adresse | Mot de passe |
| --- | --- | --- |
| Coach | `coach@test.persuade.local` | `TestPersuade2027!` |
| Apprenant | `apprenant@test.persuade.local` | `TestPersuade2027!` |

## Utiliser l'application avec la base de test

Dans le terminal du backend, conserver les trois variables ci-dessus, définir `$env:PORT='3002'`, puis lancer `npm.cmd run dev` depuis `backend/`. Le port 3002 évite de mélanger l'API de démonstration avec un backend normal déjà lancé sur 3001.

Dans un autre terminal, depuis la racine du dépôt :

```powershell
Copy-Item front/.env.emulator.example front/.env.emulator.local
cd front
npm.cmd run dev -- --mode emulator --host localhost --port 5174 --strictPort
```

Ouvrir `http://localhost:5174/connexion` pour utiliser les comptes de test.

Le mode `emulator` connecte le navigateur à Auth et Firestore locaux. L'API reste accessible via le proxy Vite sur `/api`, redirigé vers le port 3002 dans ce mode. Le dossier `.firebase-emulator-data/` et le fichier `.env.emulator.local` sont ignorés par Git.

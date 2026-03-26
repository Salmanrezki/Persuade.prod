# Audit pre-prod initial

## Corrige dans ce passage

- URLs API et configuration Firebase sorties du code vers `.env`
- Backend avec `CORS` controle, `healthcheck`, script `start` et headers HTTP de base
- Chargement Firebase Admin compatible secrets d hebergeur
- Messages d erreur d authentification plus propres cote frontend
- Regles Firestore resserrees pour `courseRequests` et `masterclassRegistrations`
- Comptage global des inscriptions masterclass deplace vers l API

## Risques encore presents

- Les profils `users` restent lisibles par tout utilisateur connecte. C est fonctionnel pour le chat et la liste de contacts, mais ce n est pas ideal pour une prod stricte.
- Le chat, la presence, les demandes de cours et une partie des inscriptions masterclass passent encore en acces Firestore direct depuis le frontend. La securite depend donc fortement des regles Firestore.
- Il n y a pas encore de suite de tests automatisee front ou back.
- Il n y a pas encore de configuration lint exploitable malgre la presence d ESLint dans le frontend.
- Le bundle frontend est volumineux et Vite remonte deja un warning de chunk size.

## Recommandations pour le prochain passage

- Passer davantage d operations sensibles du frontend vers l API backend
- Introduire une vraie separation entre profil prive et profil public pour les utilisateurs
- Ajouter un lint minimal et au moins quelques tests smoke backend
- Decouper le bundle frontend avec du lazy loading sur les vues lourdes
- Ajouter une strategie de logs plus propre pour la prod

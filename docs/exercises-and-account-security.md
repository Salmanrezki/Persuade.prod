# Exercices et sécurité des comptes

## Exercices

- Le coach peut publier un exercice libre ou un QCM de 1 à 20 questions (2 à 6 choix, une bonne réponse par question).
- `GET /api/exercises` retire les bonnes réponses. `GET /api/exercises/coach` retourne au coach ses propres exercices avec leur corrigé.
- `POST /api/exercise-attempts/:exerciseId` exige un compte apprenant et reçoit `requestId`, `revision`, `answers` (indices des choix dans l’ordre des questions), `notes`.
- Le serveur calcule la proportion de bonnes réponses sur 100, sans faire confiance à un score envoyé par le navigateur. Les exercices libres ont un score `null`.
- La tentative est immuable, stockée dans `users/{uid}/exerciseAttempts/{requestId}`. Les règles Firestore actuelles ne donnent aucun accès direct à cette sous-collection : les lectures et écritures passent par l’API authentifiée.
- La transaction enregistre la tentative et met à jour la progression. Une même clé de requête retourne le résultat déjà enregistré, sans créer de doublon. Une nouvelle réalisation nécessite une nouvelle clé.
- Une modification d’exercice incrémente sa version ; une soumission sur une ancienne version est refusée avec HTTP 409. Les anciennes tentatives conservent titre, version, date, réponses et score.
- `GET /api/exercise-attempts?cursor=...` retourne les 20 tentatives suivantes et `nextCursor`, toujours pour l’utilisateur authentifié.

## Mot de passe et e-mail

- « Mot de passe oublié » est disponible sur la connexion. « Mon profil → Connexion et sécurité » permet de vérifier l’adresse, demander un nouveau mot de passe et corriger l’adresse après réauthentification.
- Firebase Authentication envoie les e-mails et héberge les pages de traitement des liens. Aucun mot de passe ni jeton de récupération n’est enregistré dans Firestore.
- Une adresse n’est considérée comme vérifiée que lorsque Firebase Authentication indique `emailVerified`. Le format seul ne prouve pas que la boîte mail existe ou appartient à l’utilisateur.
- `GET /api/users/security` lit le compte Firebase de l’utilisateur authentifié et remet à jour l’e-mail du profil depuis cette source. Les champs fournis par le client ne valident jamais une adresse.
- Une correction d’adresse utilise `verifyBeforeUpdateEmail` : l’adresse de connexion reste inchangée tant que la nouvelle n’a pas été confirmée.
- Les comptes existants conservent leur accès ; la vérification d’e-mail est proposée dans les espaces coach et apprenant. Aucun envoi massif ni changement forcé de mot de passe.

## Vérification avant mise en production

1. Déployer les modifications du backend et du frontend ensemble.
2. Dans Firebase Authentication, vérifier les modèles d’e-mails de réinitialisation et de vérification, l’adresse de support et les domaines autorisés. Si une URL de gestion personnalisée est déjà configurée, vérifier qu’elle traite correctement les liens ; sinon utiliser le gestionnaire Firebase par défaut.
3. Avec des comptes de test coach et apprenant et des boîtes réellement accessibles, demander les e-mails, ouvrir les liens, vérifier la reconnexion avec le nouveau mot de passe et l’état vérifié après « Actualiser ».
4. Tester un lien expiré ou déjà utilisé, une adresse inconnue, puis une correction d’adresse avec un mot de passe incorrect.

Les tests automatisés simulent Firebase et ne prouvent pas la livraison des e-mails. Les adresses des comptes existants ne peuvent pas être certifiées sans confirmation de leurs titulaires.

Référence : https://firebase.google.com/docs/auth/web/manage-users

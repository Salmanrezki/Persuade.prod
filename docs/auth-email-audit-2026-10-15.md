# Audit des e-mails d’authentification — 15 octobre 2026

## Configuration distante vérifiée en lecture seule

- Frontend et backend : projet `persuade-2b924`.
- API de configuration Firebase Authentication : HTTP 200.
- Connexion e-mail / mot de passe : activée.
- Service d’envoi : Firebase par défaut, sans SMTP personnalisé.
- Modèles de réinitialisation du mot de passe, vérification et changement d’adresse : tous présents, avec lien d’action.
- Expéditeur : `noreply`, sans nom d’expéditeur personnalisé.
- Gestionnaire des liens : `https://persuade-2b924.firebaseapp.com/__/auth/action`, accessible avec HTTP 200.
- Domaines autorisés : `localhost`, `persuade-2b924.firebaseapp.com`, `persuade-2b924.web.app`.
- Clé API frontend : acceptée par Firebase (HTTP 200). Le domaine d’authentification du frontend est autorisé.
- Langue par défaut du projet : anglais. L’application impose le français lors des trois types d’envoi.

## Tests réalisés

- Test du service applicatif : validation du format, gestion de l’adresse inconnue, échec réseau, réauthentification avant correction d’adresse.
- Test avec le véritable SDK Firebase installé et transport intercepté : les trois demandes `PASSWORD_RESET`, `VERIFY_EMAIL`, `VERIFY_AND_CHANGE_EMAIL` ont les bons paramètres et l’en-tête `X-Firebase-Locale: fr`.
- Test backend : l’état vérifié et l’adresse sont lus depuis le compte Firebase authentifié, sans faire confiance aux champs du profil ou aux paramètres fournis par le client.
- Résultat : les trois tests passent.

## Limite de la vérification

Aucun e-mail réel n’a été envoyé. Une adresse de test appartenant à l’utilisateur a été demandée pour poursuivre. La réception en boîte mail, le classement éventuel en spam et l’utilisation du lien restent à confirmer. Une réponse HTTP 200 de la configuration et un modèle correct ne prouvent pas la livraison d’un e-mail.

## Rejouer

Depuis `backend` : `node scripts/auditAuthEmailConfig.js`. Ce script ne change aucune configuration et n’envoie aucun e-mail. Sa sortie exclut les clés API, jetons d’accès et secrets SMTP.

Depuis `front` : `node --experimental-vm-modules --test tests/accountSecurity.test.js tests/accountSecurity.transport.test.js`.

Depuis `backend` : `node --experimental-vm-modules --test tests/accountSecurity.routes.test.js`.

Référence de l’API de lecture : https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getConfig

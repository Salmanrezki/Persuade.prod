# Visioconférence des rendez-vous

Les calendriers coach et apprenant proposent « Préparer la visio », puis « Rejoindre la visio » à l'heure du rendez-vous confirmé. La page vérifie l'heure serveur et actualise l'accès automatiquement. La salle privée Daily est créée à la première entrée pendant le créneau, sans tâche cron. Les deux participants obtiennent la même salle, même en cas d'arrivée simultanée. Aucun micro ni caméra n'est activé sans action de l'utilisateur.

## Activation

Les tableaux de bord des deux rôles affichent aussi « Mes cours en visio », avec les séances déjà commencées jusqu'à leur fin. Une demande apprenant doit être acceptée via « Accepter le cours » côté coach (accueil, Clients ou calendrier). Avant acceptation, le bouton vidéo est visible mais désactivé, avec une explication. Le statut est actualisé toutes les 15 secondes et au retour dans l'onglet. L'acceptation conserve l'horaire et les participants et ne peut être réalisée que par le coach concerné ; une seconde acceptation ne recrée pas la salle.

1. Créer un compte et un domaine Daily, puis ajouter `DAILY_API_KEY` aux variables **du backend uniquement** (Render ou environnement local). Ne jamais utiliser une variable `VITE_` pour cette clé.
2. Redéployer le backend et le frontend. Aucune migration Firestore n'est nécessaire ; les rendez-vous existants sont compatibles.
3. Servir le frontend en HTTPS (localhost est accepté pour le développement). Si un proxy ajoute une Permissions-Policy, autoriser caméra et micro pour le domaine Daily utilisé. Le backend API ne sert pas la page vidéo ; sa restriction caméra/micro n'affecte pas le frontend Vercel.
4. Autoriser le SDK `https://unpkg.com/@daily-co/daily-js@0.93.0/dist/daily.js` et les frames Daily si une CSP est ajoutée. Le SDK est chargé à la demande, avec délai maximal et possibilité de réessayer. Le média est fourni par Daily ; aucun serveur TURN supplémentaire n'est nécessaire dans l'application.

Sans clé, la page indique que la visio n'est pas encore activée. Aucun lien public de secours n'est généré. Vérifier les conditions, la facturation et les informations de confidentialité de Daily avant mise en production.

## Accès et cycle de vie

- `GET /api/video/:id` : métadonnées minimales, horaire serveur, état ; réservé au coach et à l'apprenant concernés.
- `POST /api/video/:id/join` : revérification des participants, statut `scheduled` et créneau `[début, fin[`. Salle privée, deux personnes maximum, sans accès invité ni permission administrateur.
- Jetons individuels liés à la salle, valables deux minutes pour entrer ; aucune persistance navigateur ni journalisation des jetons. Expiration de la salle à la fin prévue, avec expulsion des participants.
- Chaque modification du rendez-vous change la version de salle. La page revérifie le rendez-vous toutes les 15 secondes et détruit l'appel s'il est annulé, modifié, terminé ou devenu invérifiable. Quitter la page détruit également l'appel et libère les appareils.
- Limite : l'annulation n'est pas une révocation immédiate chez Daily. Une session détournée hors de l'application peut rester active jusqu'à la fin du créneau ; un jeton déjà délivré reste utilisable jusqu'à ses deux minutes d'expiration. Pour une révocation immédiate au niveau fournisseur, ajouter l'expulsion Daily aux mutations de rendez-vous.

## Messages et documents pendant la visio

La page affiche la conversation Persuade avec l'autre participant à droite de la vidéo (en dessous sur mobile). Le panneau peut être masqué sans quitter l'appel. Il réutilise la conversation existante entre les deux comptes ; les messages et documents restent accessibles dans la messagerie après la séance. Les 50 messages les plus récents sont synchronisés avec Firestore ; un lien vers un nouvel onglet donne accès à l'historique complet.

Le bouton « Joindre » accepte PDF, Word, Excel, PowerPoint, TXT, CSV, JPG, PNG et WebP, un fichier par message, jusqu'à **600 Ko**. Les fichiers restent dans le stockage de messages existant, sans nouvel abonnement ni configuration Storage. Cette limite tient compte de l'encodage base64 et de la [taille maximale d'un document Firestore](https://firebase.google.com/docs/firestore/quotas). Pour les fichiers plus volumineux, partager un lien. Les liens s'ouvrent dans un nouvel onglet et les pièces jointes sont téléchargées sans ouvrir leur contenu dans la page de l'appel.

L'envoi par l'API contrôle le participant, le format, la taille et le contenu du message. Le message et l'aperçu de la conversation sont enregistrés dans un même lot atomique. Une erreur d'envoi conserve le texte et le document sélectionné dans le panneau pour réessayer. La création simultanée de la conversation par les deux personnes n'écrase pas les messages.

Recette à deux comptes : envoyer dans les deux sens pendant la visio, joindre puis télécharger un PDF, vérifier sa présence dans la messagerie normale après l'appel, masquer/réafficher le panneau, vérifier le mode mobile et simuler un échec d'envoi. Redémarrer ou redéployer le backend et le frontend pour obtenir le nouveau champ `participantId` et les routes de messagerie mises à jour. Aucune modification des règles Firestore existantes n'est nécessaire.

## Tests automatisés

`node --experimental-vm-modules --test tests/appointmentVideo.test.js tests/video.routes.test.js tests/followupCalendar.routes.test.js` depuis `backend`.

`node --experimental-vm-modules --test tests/appointmentVideo.test.js` depuis `front` vérifie le cycle de vie : départ, annulation, modification, erreur réseau et réponse tardive après navigation.

Recette réelle indispensable après configuration : deux comptes sur deux appareils/réseaux différents, rendez-vous confirmé proche, ouverture automatique de l'accès, caméra et son dans les deux sens, refus d'autorisation puis changement de périphérique, partage d'écran, départ et retour, perte réseau, annulation et fin du créneau. Vérifier aussi un troisième compte et l'URL privée sans jeton : accès refusé. Les tests automatisés simulent Daily et ne prouvent pas la transmission audiovisuelle réelle.

Références : [salles privées et propriétés](https://docs.daily.co/reference/rest-api/rooms/create-room), [jetons de réunion](https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token), [intégration Vue de Daily Prebuilt](https://www.daily.co/blog/build-a-video-chat-app-with-vue-and-daily-prebuilt/).

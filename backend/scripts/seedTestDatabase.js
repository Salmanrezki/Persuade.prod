import admin from 'firebase-admin'
import { normalizeAssessment } from '../src/utils/exerciseScoring.js'

const projectId = process.env.FIREBASE_TEST_PROJECT_ID || 'demo-persuade-test'
const isLoopback = (value) => /^(localhost|127\.0\.0\.1):\d+$/.test(value || '')

if (!projectId.startsWith('demo-') ||
    !isLoopback(process.env.FIRESTORE_EMULATOR_HOST) ||
    !isLoopback(process.env.FIREBASE_AUTH_EMULATOR_HOST)) {
  console.error('Import refusé : projet demo-* et émulateurs Firestore/Auth locaux requis.')
  process.exit(1)
}

const apply = process.argv.includes('--apply')
const verify = process.argv.includes('--verify')
if (apply && verify) throw new Error('Choisissez --apply ou --verify.')
const coachUid = 'test-coach-persuade'
const learnerUid = 'test-learner-persuade'
const coachEmail = 'coach@test.persuade.local'
const learnerEmail = 'apprenant@test.persuade.local'
const password = 'TestPersuade2027!'
const daysFromNow = (days, hour = 18) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString()
}

const now = new Date().toISOString()
const video = (id, title, description, videoUrl, extra = {}) => ({
  id,
  data: {
    title, description, videoUrl,
    subtitle: 'Ressource vidéo pour explorer le parcours de test.',
    level: 'Tous niveaux', duration: 'À visionner', category: 'Négociation',
    language: 'Français', coachingMode: 'video', sessionCount: '1 vidéo',
    price: 'Inclus', targetAudience: 'Apprenants en négociation',
    prerequisites: [], outcomes: ['Identifier une technique applicable à une situation réelle'],
    bookingNotes: '', coverImage: '', meetingLink: '', featured: false,
    coachId: coachUid, coachName: 'Coach Démo', createdBy: coachUid,
    type: 'coach', createdAt: now, updatedAt: now, testData: true,
    ...extra,
  },
})

const courses = [
  video('test-video-preparation', 'Préparer une négociation commerciale',
    'Repérez les objectifs, les marges de manœuvre et les concessions avant l’échange.',
    'https://www.youtube.com/watch?v=9M9vP8_1Geg', { featured: true }),
  video('test-video-compromis', 'Questionner le compromis automatique',
    'Une ressource pour réfléchir aux alternatives quand les positions semblent bloquées.',
    'https://www.youtube.com/watch?v=N9duDfWSfU4'),
]

const exercise = (id, title, description, instructions, questions) => ({
  id,
  data: {
    title, description, instructions, duration: '10 min',
    assessment: normalizeAssessment({ questions }), revision: 1,
    coachId: coachUid, createdAt: now, updatedAt: now, testData: true,
  },
})

const exercises = [
  exercise('test-exercice-objectifs', 'Définir ses objectifs',
    'Préparez un entretien de négociation salariale.',
    'Notez votre objectif, votre seuil acceptable et deux arguments concrets.', [
      { prompt: 'Quel élément donne le plus de poids à une demande d’augmentation ?',
        options: ['Des résultats mesurables', 'Une comparaison vague avec les collègues', 'Une menace de départ'], correctIndex: 0 },
      { prompt: 'Que préparer avant l’entretien ?',
        options: ['Un objectif et une solution de repli', 'Une seule exigence non négociable', 'Aucun chiffre'], correctIndex: 0 },
    ]),
  exercise('test-exercice-objection', 'Répondre à une objection',
    'Entraînez-vous à maintenir le dialogue face à une contrainte budgétaire.',
    'Rédigez une réponse courte, puis choisissez l’approche qui ouvre une suite concrète.', [
      { prompt: 'Votre interlocuteur évoque un budget insuffisant. Quelle réponse aide à avancer ?',
        options: ['Demander quels critères permettraient de revoir la décision', 'Répéter la demande sans écouter', 'Mettre fin à l’échange'], correctIndex: 0 },
    ]),
  exercise('test-exercice-conclusion', 'Conclure avec une prochaine étape',
    'Transformez un report de décision en engagement précis.',
    'Proposez une date de suivi et des critères de décision.', [
      { prompt: 'Quelle conclusion est la plus exploitable ?',
        options: ['Nous verrons plus tard', 'Fixons une date et les objectifs à atteindre', 'Je reviendrai sans rendez-vous'], correctIndex: 1 },
    ]),
]

const masterclass = (id, title, description, dayOffset, extra = {}) => ({
  id,
  data: {
    title, description, subtitle: 'Atelier de démonstration en ligne',
    level: 'Tous niveaux', format: 'online', language: 'Français',
    scheduleAt: daysFromNow(dayOffset), registrationDeadline: daysFromNow(dayOffset - 1),
    duration: '90 min', capacity: 20, location: 'En ligne', city: '', address: '',
    price: 'Gratuit', tags: ['Négociation', 'Test'],
    targetAudience: 'Apprenants en négociation', prerequisites: [],
    agenda: ['Présentation de la méthode', 'Mise en situation', 'Questions et retours'],
    takeaways: ['Une trame de préparation réutilisable'],
    coverImage: '', meetingLink: '', replayAvailable: false,
    certificateAvailable: false, supportIncluded: true,
    speakerBio: 'Coach de démonstration Persuade.', featured: false,
    status: 'scheduled', coachId: coachUid, coachName: 'Coach Démo',
    createdAt: now, updatedAt: now, testData: true,
    ...extra,
  },
})

const masterclasses = [
  masterclass('test-masterclass-preparation', 'Préparer sa prochaine négociation',
    'Atelier pratique pour définir ses objectifs et structurer ses arguments.', 7, { featured: true }),
  masterclass('test-masterclass-objections', 'Répondre aux objections sans rompre le dialogue',
    'Mises en situation pour écouter, reformuler et proposer une prochaine étape.', 14),
]

const summary = { projectId, mode: apply ? 'apply' : verify ? 'verify' : 'preview',
  accounts: [coachEmail, learnerEmail],
  courses: courses.map(({ id, data }) => ({ id, title: data.title })),
  exercises: exercises.map(({ id, data }) => ({ id, title: data.title })),
  masterclasses: masterclasses.map(({ id, data }) => ({ id, title: data.title, scheduleAt: data.scheduleAt })),
}
console.log(JSON.stringify(summary, null, 2))

if (apply || verify) {
  admin.initializeApp({ projectId })
  const auth = admin.auth()
  const db = admin.firestore()
  if (apply) {
  for (const user of [
    { uid: coachUid, email: coachEmail, role: 'coach', firstname: 'Coach Démo' },
    { uid: learnerUid, email: learnerEmail, role: 'apprenant', firstname: 'Apprenant Démo' },
  ]) {
    try { await auth.createUser({ uid: user.uid, email: user.email, password, emailVerified: true }) }
    catch (error) { if (error.code !== 'auth/uid-already-exists') throw error }
    await db.collection('users').doc(user.uid).set({
      uid: user.uid, email: user.email, firstname: user.firstname,
      role: user.role, emailVerified: true, testData: true,
    }, { merge: true })
  }
  const batch = db.batch()
  for (const [collection, items] of [
    ['courses', courses], ['coachExercises', exercises], ['masterclasses', masterclasses],
  ]) {
    for (const { id, data } of items) batch.set(db.collection(collection).doc(id), data)
  }
  await batch.commit()
  }
  for (const [collection, items] of [
    ['courses', courses], ['coachExercises', exercises], ['masterclasses', masterclasses],
  ]) {
    const snapshots = await db.getAll(...items.map(({ id }) => db.collection(collection).doc(id)))
    if (snapshots.some((snapshot) => !snapshot.exists || snapshot.data()?.testData !== true)) {
      throw new Error(`Vérification de ${collection} échouée.`)
    }
  }
  const [coach, learner] = await Promise.all([auth.getUser(coachUid), auth.getUser(learnerUid)])
  if (coach.email !== coachEmail || learner.email !== learnerEmail) {
    throw new Error('Vérification des comptes de test échouée.')
  }
  console.log('Base de test vérifiée : 2 comptes, 2 cours, 3 exercices, 2 masterclass.')
}

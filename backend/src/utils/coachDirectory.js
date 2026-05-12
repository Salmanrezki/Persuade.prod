import admin from '../firebaseAdmin.js'

const usersCollection = () => admin.firestore().collection('users')
const coursesCollection = () => admin.firestore().collection('courses')
const masterclassesCollection = () => admin.firestore().collection('masterclasses')
const isSeedCoachId = (value) => typeof value === 'string' && value.startsWith('seed-coach-')

const isCoachProfile = (user) => user?.role === 'coach' || user?.coachApplicationStatus === 'pending_review'

const mergeCoach = (map, coach) => {
  if (!coach?.uid) return

  const current = map.get(coach.uid) || {}
  map.set(coach.uid, {
    uid: coach.uid,
    firstname: coach.firstname || current.firstname || '',
    email: coach.email || current.email || '',
    profilePhoto: coach.profilePhoto || current.profilePhoto || '',
    profession: coach.profession || current.profession || '',
    professionDetail: coach.professionDetail || current.professionDetail || '',
    jobTitle: coach.jobTitle || current.jobTitle || '',
    jobTitleDetail: coach.jobTitleDetail || current.jobTitleDetail || '',
    sector: coach.sector || current.sector || '',
    sectorDetail: coach.sectorDetail || current.sectorDetail || '',
    seniority: coach.seniority || current.seniority || '',
    learningFormat: coach.learningFormat || current.learningFormat || '',
    speakerBio: coach.speakerBio || current.speakerBio || '',
    coachApplicationStatus:
      coach.coachApplicationStatus || current.coachApplicationStatus || 'pending_review',
    role: coach.role || current.role || 'coach',
  })
}

export const listCoachDirectory = async ({ excludeUid } = {}) => {
  const [usersSnapshot, coursesSnapshot, masterclassesSnapshot] = await Promise.all([
    usersCollection().get(),
    coursesCollection().get(),
    masterclassesCollection().get(),
  ])

  const coachMap = new Map()

  usersSnapshot.docs.forEach((doc) => {
    const user = { uid: doc.id, ...doc.data() }
    if (!isCoachProfile(user)) return
    mergeCoach(coachMap, user)
  })

  coursesSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (!data?.coachId || isSeedCoachId(data.coachId)) return
    mergeCoach(coachMap, {
      uid: data.coachId,
      firstname: data.coachName || 'Coach',
    })
  })

  masterclassesSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    if (!data?.coachId || isSeedCoachId(data.coachId)) return
    mergeCoach(coachMap, {
      uid: data.coachId,
      firstname: data.coachName || 'Coach',
      speakerBio: data.speakerBio || '',
    })
  })

  return Array.from(coachMap.values())
    .filter((coach) => coach.uid !== excludeUid)
    .sort((a, b) =>
      (a.firstname || a.email || 'Coach').localeCompare(b.firstname || b.email || 'Coach', 'fr')
    )
}

export const findCoachProfileById = async (coachId) => {
  if (!coachId) return null
  const coaches = await listCoachDirectory()
  return coaches.find((coach) => coach.uid === coachId) || null
}

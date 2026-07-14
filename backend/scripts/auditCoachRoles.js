import admin from '../src/firebaseAdmin.js'
import { normalizeUserProfileRole } from '../src/utils/userRole.js'

const firestore = admin.firestore()
const hasApplyFlag = process.argv.includes('--apply')
const hasConfirmationFlag = process.argv.includes('--yes')
const uidArg = process.argv.find((arg) => arg.startsWith('--uid='))
const targetUid = uidArg ? uidArg.split('=')[1]?.trim() : ''

if (hasApplyFlag && !hasConfirmationFlag) {
  console.error('Refusing to apply changes without --yes')
  process.exit(1)
}

const usersCollection = firestore.collection('users')
const coursesCollection = firestore.collection('courses')
const masterclassesCollection = firestore.collection('masterclasses')
const followupCollection = firestore.collection('coachFollowupRequests')
const courseRequestsCollection = firestore.collection('courseRequests')
const masterclassRegistrationsCollection = firestore.collection('masterclassRegistrations')

const summarizeSnapshotByField = async (collection, fieldName) => {
  const snapshot = await collection.get()
  const counts = new Map()

  snapshot.docs.forEach((doc) => {
    const key = doc.data()?.[fieldName]
    if (!key || typeof key !== 'string') return
    counts.set(key, Number(counts.get(key) || 0) + 1)
  })

  return counts
}

const buildReasonList = ({ user, ownedCourses, ownedMasterclasses, followupAsCoach, courseRequestsAsCoach, registrationsAsCoach }) => {
  const reasons = []

  if (user?.coachApplicationStatus === 'pending_review') {
    reasons.push('coachApplicationStatus=pending_review')
  }

  if (ownedCourses > 0) {
    reasons.push(`owns ${ownedCourses} coach course(s)`)
  }

  if (ownedMasterclasses > 0) {
    reasons.push(`owns ${ownedMasterclasses} masterclass(es)`)
  }

  if (followupAsCoach > 0) {
    reasons.push(`${followupAsCoach} follow-up request(s) as coach`)
  }

  if (courseRequestsAsCoach > 0) {
    reasons.push(`${courseRequestsAsCoach} course request(s) as coach`)
  }

  if (registrationsAsCoach > 0) {
    reasons.push(`${registrationsAsCoach} masterclass registration(s) as coach`)
  }

  return reasons
}

const shouldRepairToCoach = (profileSignals) => profileSignals.reasons.length > 0

const run = async () => {
  const [
    usersSnapshot,
    courseCoachCounts,
    masterclassCoachCounts,
    followupCoachCounts,
    courseRequestCoachCounts,
    registrationCoachCounts,
  ] = await Promise.all([
    targetUid ? usersCollection.where(admin.firestore.FieldPath.documentId(), '==', targetUid).get() : usersCollection.get(),
    summarizeSnapshotByField(coursesCollection, 'coachId'),
    summarizeSnapshotByField(masterclassesCollection, 'coachId'),
    summarizeSnapshotByField(followupCollection, 'coachId'),
    summarizeSnapshotByField(courseRequestsCollection, 'coachId'),
    summarizeSnapshotByField(masterclassRegistrationsCollection, 'coachId'),
  ])

  const suspiciousProfiles = []
  const repairCandidates = []
  const batch = firestore.batch()

  usersSnapshot.docs.forEach((doc) => {
    const user = normalizeUserProfileRole({ uid: doc.id, ...doc.data() })
    const ownedCourses = Number(courseCoachCounts.get(doc.id) || 0)
    const ownedMasterclasses = Number(masterclassCoachCounts.get(doc.id) || 0)
    const followupAsCoach = Number(followupCoachCounts.get(doc.id) || 0)
    const courseRequestsAsCoach = Number(courseRequestCoachCounts.get(doc.id) || 0)
    const registrationsAsCoach = Number(registrationCoachCounts.get(doc.id) || 0)

    const reasons = buildReasonList({
      user,
      ownedCourses,
      ownedMasterclasses,
      followupAsCoach,
      courseRequestsAsCoach,
      registrationsAsCoach,
    })

    if (!reasons.length) return

    const profileSignals = {
      uid: doc.id,
      email: user.email || '',
      firstname: user.firstname || '',
      currentRole: user.role || null,
      coachApplicationStatus: user.coachApplicationStatus || null,
      ownedCourses,
      ownedMasterclasses,
      followupAsCoach,
      courseRequestsAsCoach,
      registrationsAsCoach,
      reasons,
    }

    suspiciousProfiles.push(profileSignals)

    if (user.role !== 'coach' && shouldRepairToCoach(profileSignals)) {
      repairCandidates.push(profileSignals)

      if (hasApplyFlag) {
        batch.set(
          doc.ref,
          {
            role: 'coach',
            coachApplicationStatus: user.coachApplicationStatus || 'pending_review',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      }
    }
  })

  if (hasApplyFlag && repairCandidates.length) {
    await batch.commit()
  }

  console.log(
    JSON.stringify(
      {
        mode: hasApplyFlag ? 'apply' : 'dry-run',
        targetUid: targetUid || null,
        suspiciousProfilesCount: suspiciousProfiles.length,
        repairCandidatesCount: repairCandidates.length,
        suspiciousProfiles,
        repairedProfiles: hasApplyFlag ? repairCandidates.map((item) => item.uid) : [],
      },
      null,
      2
    )
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Coach role audit failed:', error)
    process.exit(1)
  })

import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { masterclassSeedData } from '../data/masterclassSeedData.js'
import { logFirestoreWarning } from '../utils/firestoreErrors.js'
import {
  countSeedRegistrationsByMasterclass,
  masterclassSeedRegistrations,
} from '../data/masterclassSeedRegistrations.js'

const router = express.Router()

const masterclassCollection = () => admin.firestore().collection('masterclasses')
const usersCollection = () => admin.firestore().collection('users')
const registrationsCollection = () => admin.firestore().collection('masterclassRegistrations')

const DEFAULT_DURATION = '90 min'
const DEFAULT_LOCATION = 'En ligne'
const DEFAULT_PRICE = 'Gratuit'
const DEFAULT_LEVEL = 'Tous niveaux'
const DEFAULT_FORMAT = 'online'
const DEFAULT_LANGUAGE = 'Français'
const DEFAULT_STATUS = 'scheduled'
const PUBLIC_CACHE_TTL_MS = 30 * 1000
const PUBLIC_REFRESH_RETRY_MS = 60 * 1000

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists ? doc.data() : null
}

const sanitizeString = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const sanitizeStringArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const sanitizeBoolean = (value, fallback = false) =>
  typeof value === 'boolean' ? value : fallback

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeFormat = (value) => {
  const allowed = ['online', 'in_person', 'hybrid']
  return allowed.includes(value) ? value : DEFAULT_FORMAT
}

const normalizeStatus = (value) => {
  const allowed = ['draft', 'scheduled', 'completed', 'cancelled']
  return allowed.includes(value) ? value : DEFAULT_STATUS
}

const buildLocation = ({ format, location, city }) => {
  if (location) return location
  if (format === 'online') return DEFAULT_LOCATION
  if (format === 'hybrid' && city) return `Hybride · ${city}`
  return city || DEFAULT_LOCATION
}

const buildMasterclassPayload = (body, user, profile, options = {}) => {
  const format = normalizeFormat(body?.format)
  const city = sanitizeString(body?.city)
  const location = buildLocation({
    format,
    location: sanitizeString(body?.location),
    city,
  })

  const payload = {
    title: sanitizeString(body?.title),
    subtitle: sanitizeString(body?.subtitle),
    description: sanitizeString(body?.description),
    level: sanitizeString(body?.level, DEFAULT_LEVEL),
    format,
    language: sanitizeString(body?.language, DEFAULT_LANGUAGE),
    scheduleAt: sanitizeString(body?.scheduleAt),
    registrationDeadline: sanitizeString(body?.registrationDeadline),
    duration: sanitizeString(body?.duration, DEFAULT_DURATION),
    capacity: Math.max(1, sanitizeNumber(body?.capacity, 30)),
    location,
    city,
    address: sanitizeString(body?.address),
    price: sanitizeString(body?.price, DEFAULT_PRICE),
    tags: sanitizeStringArray(body?.tags),
    targetAudience: sanitizeString(body?.targetAudience),
    prerequisites: sanitizeStringArray(body?.prerequisites),
    agenda: sanitizeStringArray(body?.agenda),
    takeaways: sanitizeStringArray(body?.takeaways),
    coverImage: sanitizeString(body?.coverImage),
    meetingLink: sanitizeString(body?.meetingLink),
    replayAvailable: sanitizeBoolean(body?.replayAvailable, false),
    certificateAvailable: sanitizeBoolean(body?.certificateAvailable, false),
    supportIncluded: sanitizeBoolean(body?.supportIncluded, false),
    speakerBio: sanitizeString(body?.speakerBio),
    featured: sanitizeBoolean(body?.featured, false),
    status: normalizeStatus(body?.status),
    coachId: user.uid,
    coachName: profile.firstname || profile.email || 'Coach',
  }

  if (options.includeCreatedAt) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp()
  }

  return payload
}

const sortMasterclasses = (items) =>
  [...items].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : null
    const orderB = typeof b.order === 'number' ? b.order : null

    if (orderA !== null && orderB !== null) return orderA - orderB
    if (orderA !== null) return -1
    if (orderB !== null) return 1

    const timeA = a.scheduleAt ? new Date(a.scheduleAt).getTime() : 0
    const timeB = b.scheduleAt ? new Date(b.scheduleAt).getTime() : 0
    return timeA - timeB
  })

let publicMasterclassesCache = sortMasterclasses(masterclassSeedData)
let registrationSummaryCache = countSeedRegistrationsByMasterclass()
let publicMasterclassesLastSyncAt = 0
let registrationSummaryLastSyncAt = 0
let publicMasterclassesRefreshPromise = null
let registrationSummaryRefreshPromise = null
let publicMasterclassesLastRefreshAttemptAt = 0
let registrationSummaryLastRefreshAttemptAt = 0

const shouldRefreshPublicMasterclassesCache = () => {
  const now = Date.now()
  const cacheIsStale = now - publicMasterclassesLastSyncAt > PUBLIC_CACHE_TTL_MS
  const retryWindowPassed = now - publicMasterclassesLastRefreshAttemptAt > PUBLIC_REFRESH_RETRY_MS
  return cacheIsStale && retryWindowPassed
}

const shouldRefreshRegistrationSummaryCache = () => {
  const now = Date.now()
  const cacheIsStale = now - registrationSummaryLastSyncAt > PUBLIC_CACHE_TTL_MS
  const retryWindowPassed = now - registrationSummaryLastRefreshAttemptAt > PUBLIC_REFRESH_RETRY_MS
  return cacheIsStale && retryWindowPassed
}

const refreshPublicMasterclassesCache = async () => {
  if (publicMasterclassesRefreshPromise) return publicMasterclassesRefreshPromise

  publicMasterclassesLastRefreshAttemptAt = Date.now()
  publicMasterclassesRefreshPromise = (async () => {
    const snapshot = await masterclassCollection().get()
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    publicMasterclassesCache = sortMasterclasses([...masterclassSeedData, ...items])
    publicMasterclassesLastSyncAt = Date.now()
    return publicMasterclassesCache
  })()

  try {
    return await publicMasterclassesRefreshPromise
  } finally {
    publicMasterclassesRefreshPromise = null
  }
}

const refreshRegistrationSummaryCache = async () => {
  if (registrationSummaryRefreshPromise) return registrationSummaryRefreshPromise

  registrationSummaryLastRefreshAttemptAt = Date.now()
  registrationSummaryRefreshPromise = (async () => {
    const snapshot = await registrationsCollection().get()
    const summary = {}

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      if (!data.masterclassId) return
      summary[data.masterclassId] = (summary[data.masterclassId] || 0) + 1
    })

    const seedSummary = countSeedRegistrationsByMasterclass()
    Object.entries(seedSummary).forEach(([masterclassId, count]) => {
      summary[masterclassId] = (summary[masterclassId] || 0) + count
    })

    registrationSummaryCache = summary
    registrationSummaryLastSyncAt = Date.now()
    return registrationSummaryCache
  })()

  try {
    return await registrationSummaryRefreshPromise
  } finally {
    registrationSummaryRefreshPromise = null
  }
}

const upsertPublicMasterclassCache = (item) => {
  if (!item?.id) return

  const nextItems = publicMasterclassesCache.filter((entry) => entry.id !== item.id)
  nextItems.push(item)
  publicMasterclassesCache = sortMasterclasses(nextItems)
  publicMasterclassesLastSyncAt = Date.now()
}

const removeFromPublicMasterclassCache = (masterclassId) => {
  publicMasterclassesCache = publicMasterclassesCache.filter((item) => item.id !== masterclassId)
  publicMasterclassesLastSyncAt = Date.now()
}

const incrementSummaryCache = (masterclassId, delta) => {
  if (!masterclassId) return
  registrationSummaryCache = {
    ...registrationSummaryCache,
    [masterclassId]: Math.max(0, Number(registrationSummaryCache[masterclassId] || 0) + delta),
  }
  registrationSummaryLastSyncAt = Date.now()
}

router.get('/', async (_req, res) => {
  if (shouldRefreshPublicMasterclassesCache()) {
    refreshPublicMasterclassesCache().catch((error) => {
      logFirestoreWarning('GET /api/masterclasses refresh failed', error)
    })
  }

  res.json(publicMasterclassesCache)
})

router.get('/registrations/summary', async (_req, res) => {
  if (shouldRefreshRegistrationSummaryCache()) {
    refreshRegistrationSummaryCache().catch((error) => {
      logFirestoreWarning('GET /api/masterclasses/registrations/summary refresh failed', error)
    })
  }

  res.json(registrationSummaryCache)
})

router.get('/registrations/me', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await registrationsCollection().where('studentId', '==', req.user.uid).get()

    const registrations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(registrations)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load registrations' })
  }
})

router.get('/registrations/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await registrationsCollection().where('coachId', '==', req.user.uid).get()

    const registrations = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(registrations)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load registrations' })
  }
})

router.get('/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await masterclassCollection().where('coachId', '==', req.user.uid).get()

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.scheduleAt ? new Date(a.scheduleAt).getTime() : 0
        const timeB = b.scheduleAt ? new Date(b.scheduleAt).getTime() : 0
        return timeA - timeB
      })

    res.json(items)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load masterclasses' })
  }
})

router.post('/reorder', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    if (!ids.length) {
      return res.status(400).json({ message: 'Missing ids' })
    }

    const docs = await Promise.all(ids.map((id) => masterclassCollection().doc(id).get()))
    if (docs.some((doc) => !doc.exists || doc.data()?.coachId !== req.user.uid)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const batch = admin.firestore().batch()
    docs.forEach((doc, index) => {
      batch.update(doc.ref, {
        order: index + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      upsertPublicMasterclassCache({
        id: doc.id,
        ...doc.data(),
        order: index + 1,
        updatedAt: new Date().toISOString(),
      })
    })
    await batch.commit()

    res.json({ reordered: ids.length })
  } catch (error) {
    res.status(500).json({ message: 'Failed to reorder masterclasses' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const masterclassData = buildMasterclassPayload(req.body, req.user, profile, {
      includeCreatedAt: true,
    })

    if (!masterclassData.title || !masterclassData.description || !masterclassData.scheduleAt) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const ref = await masterclassCollection().add(masterclassData)
    const createdMasterclass = {
      id: ref.id,
      ...masterclassData,
      createdAt: new Date().toISOString(),
    }
    upsertPublicMasterclassCache(createdMasterclass)
    res.status(201).json(createdMasterclass)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create masterclass' })
  }
})

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = masterclassCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Masterclass not found' })
    }

    const current = doc.data()
    if (current.coachId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const masterclassData = buildMasterclassPayload(req.body, req.user, profile)
    if (!masterclassData.title || !masterclassData.description || !masterclassData.scheduleAt) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    await ref.set(
      {
        ...masterclassData,
        createdAt: current.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const updatedMasterclass = {
      id: doc.id,
      ...current,
      ...masterclassData,
      updatedAt: new Date().toISOString(),
    }
    upsertPublicMasterclassCache(updatedMasterclass)
    res.json(updatedMasterclass)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update masterclass' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = masterclassCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Masterclass not found' })
    }

    const current = doc.data()
    if (current.coachId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const registrationsSnapshot = await registrationsCollection()
      .where('masterclassId', '==', req.params.id)
      .get()

    const batch = admin.firestore().batch()
    batch.delete(ref)
    registrationsSnapshot.docs.forEach((registrationDoc) => {
      batch.delete(registrationDoc.ref)
    })
    await batch.commit()
    removeFromPublicMasterclassCache(doc.id)
    refreshRegistrationSummaryCache().catch(() => {})
    res.json({ id: doc.id, deleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete masterclass' })
  }
})

router.post('/:id/register', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const masterclassRef = masterclassCollection().doc(req.params.id)
    const masterclassDoc = await masterclassRef.get()
    if (!masterclassDoc.exists) {
      return res.status(404).json({ message: 'Masterclass not found' })
    }

    const masterclass = masterclassDoc.data()
    if (masterclass.status !== 'scheduled') {
      return res.status(400).json({ message: 'Masterclass is not open' })
    }

    if (masterclass.registrationDeadline) {
      const deadline = new Date(masterclass.registrationDeadline).getTime()
      if (!Number.isNaN(deadline) && deadline < Date.now()) {
        return res.status(400).json({ message: 'Registration is closed' })
      }
    }

    if (masterclass.scheduleAt) {
      const scheduleTime = new Date(masterclass.scheduleAt).getTime()
      if (!Number.isNaN(scheduleTime) && scheduleTime < Date.now()) {
        return res.status(400).json({ message: 'Masterclass already finished' })
      }
    }

    const registrationsSnapshot = await registrationsCollection()
      .where('masterclassId', '==', req.params.id)
      .get()

    const alreadyRegistered = registrationsSnapshot.docs.find(
      (doc) => doc.data().studentId === req.user.uid
    )
    if (alreadyRegistered) {
      return res.status(409).json({ message: 'Already registered', id: alreadyRegistered.id })
    }

    const seededRegistrationsCount = masterclassSeedRegistrations.filter(
      (registration) => registration.masterclassId === req.params.id
    ).length
    const capacity = Number(masterclass.capacity)
    if (Number.isFinite(capacity) && registrationsSnapshot.size + seededRegistrationsCount >= capacity) {
      return res.status(409).json({ message: 'Masterclass is full' })
    }

    const registrationData = {
      masterclassId: masterclassDoc.id,
      masterclassTitle: masterclass.title || 'Masterclass',
      scheduleAt: masterclass.scheduleAt || '',
      coachId: masterclass.coachId || null,
      coachName: masterclass.coachName || 'Coach',
      studentId: req.user.uid,
      studentName: profile.firstname || profile.email || 'Apprenant',
      status: 'registered',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const ref = await registrationsCollection().add(registrationData)
    incrementSummaryCache(masterclassDoc.id, 1)
    res.status(201).json({ id: ref.id, ...registrationData })
  } catch (error) {
    res.status(500).json({ message: 'Failed to register' })
  }
})

router.delete('/registrations/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = registrationsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    const data = doc.data()
    if (data.studentId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await ref.delete()
    incrementSummaryCache(data.masterclassId, -1)
    res.json({ id: doc.id, deleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel registration' })
  }
})

router.patch('/registrations/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { status } = req.body || {}
    if (!['confirmed', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const ref = registrationsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    const data = doc.data()
    if (data.coachId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await ref.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.json({ id: doc.id, ...data, status })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update registration' })
  }
})

export default router

import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { librarySeedCourses } from '../data/librarySeedCourses.js'
import { logFirestoreWarning } from '../utils/firestoreErrors.js'

const router = express.Router()

const routerCollection = () => admin.firestore().collection('courses')
const usersCollection = () => admin.firestore().collection('users')
const requestsCollection = () => admin.firestore().collection('courseRequests')

const DEFAULT_LEVEL = 'Tous niveaux'
const DEFAULT_DURATION = '—'
const DEFAULT_CATEGORY = 'Coaching'
const DEFAULT_LANGUAGE = 'Français'
const DEFAULT_COACHING_MODE = 'one_to_one'
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

const normalizeCourseType = (value) => (value === 'library' ? 'library' : 'coach')

const normalizeCoachingMode = (value) => {
  const allowed = ['video', 'one_to_one', 'group', 'hybrid']
  return allowed.includes(value) ? value : DEFAULT_COACHING_MODE
}

const toMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value?.seconds) return value.seconds * 1000
  if (value?._seconds) return value._seconds * 1000
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const sortCourses = (items) =>
  [...items].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : null
    const orderB = typeof b.order === 'number' ? b.order : null

    if (orderA !== null && orderB !== null) return orderA - orderB
    if (orderA !== null) return -1
    if (orderB !== null) return 1

    return toMillis(b.createdAt) - toMillis(a.createdAt)
  })

let publicCoursesCache = sortCourses(librarySeedCourses)
let publicCoursesLastSyncAt = 0
let publicCoursesRefreshPromise = null
let publicCoursesLastRefreshAttemptAt = 0

const shouldRefreshPublicCoursesCache = () => {
  const now = Date.now()
  const cacheIsStale = now - publicCoursesLastSyncAt > PUBLIC_CACHE_TTL_MS
  const retryWindowPassed = now - publicCoursesLastRefreshAttemptAt > PUBLIC_REFRESH_RETRY_MS
  return cacheIsStale && retryWindowPassed
}

const refreshPublicCoursesCache = async () => {
  if (publicCoursesRefreshPromise) return publicCoursesRefreshPromise

  publicCoursesLastRefreshAttemptAt = Date.now()
  publicCoursesRefreshPromise = (async () => {
    const snapshot = await collection().get()
    const storedCourses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    publicCoursesCache = sortCourses([...librarySeedCourses, ...storedCourses])
    publicCoursesLastSyncAt = Date.now()
    return publicCoursesCache
  })()

  try {
    return await publicCoursesRefreshPromise
  } finally {
    publicCoursesRefreshPromise = null
  }
}

const upsertPublicCourseCache = (course) => {
  if (!course?.id) return

  const nextItems = publicCoursesCache.filter((item) => item.id !== course.id)
  nextItems.push(course)
  publicCoursesCache = sortCourses(nextItems)
  publicCoursesLastSyncAt = Date.now()
}

const removeFromPublicCourseCache = (courseId) => {
  publicCoursesCache = publicCoursesCache.filter((item) => item.id !== courseId)
  publicCoursesLastSyncAt = Date.now()
}

const buildCoursePayload = (body, user, profile, options = {}) => {
  const type = normalizeCourseType(body?.type)
  const isLibrary = type === 'library'

  const payload = {
    title: sanitizeString(body?.title),
    subtitle: sanitizeString(body?.subtitle),
    description: sanitizeString(body?.description),
    level: sanitizeString(body?.level, DEFAULT_LEVEL),
    duration: sanitizeString(body?.duration, DEFAULT_DURATION),
    category: sanitizeString(body?.category, isLibrary ? 'Bibliothèque' : DEFAULT_CATEGORY),
    language: sanitizeString(body?.language, DEFAULT_LANGUAGE),
    coachingMode: normalizeCoachingMode(body?.coachingMode),
    sessionCount: sanitizeString(body?.sessionCount),
    price: sanitizeString(body?.price, isLibrary ? 'Inclus' : 'Sur demande'),
    targetAudience: sanitizeString(body?.targetAudience),
    prerequisites: sanitizeStringArray(body?.prerequisites),
    outcomes: sanitizeStringArray(body?.outcomes),
    bookingNotes: sanitizeString(body?.bookingNotes),
    coverImage: sanitizeString(body?.coverImage),
    videoUrl: sanitizeString(body?.videoUrl),
    meetingLink: sanitizeString(body?.meetingLink),
    featured: sanitizeBoolean(body?.featured, false),
    coachId: isLibrary ? null : user.uid,
    coachName: isLibrary ? null : profile.firstname || profile.email || 'Coach',
    createdBy: user.uid,
    type,
  }

  if (options.includeCreatedAt) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp()
  }

  return payload
}

const collection = () => routerCollection()

router.get('/', async (_req, res) => {
  if (shouldRefreshPublicCoursesCache()) {
    refreshPublicCoursesCache().catch((error) => {
      logFirestoreWarning('GET /api/courses refresh failed', error)
    })
  }

  res.json(publicCoursesCache)
})

router.get('/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await collection().where('coachId', '==', req.user.uid).get()

    const courses = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(courses)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load coach courses' })
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

    const docs = await Promise.all(ids.map((id) => collection().doc(id).get()))
    if (docs.some((doc) => !doc.exists || doc.data()?.createdBy !== req.user.uid)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const batch = admin.firestore().batch()
    docs.forEach((doc, index) => {
      batch.update(doc.ref, {
        order: index + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      upsertPublicCourseCache({
        id: doc.id,
        ...doc.data(),
        order: index + 1,
        updatedAt: new Date().toISOString(),
      })
    })
    await batch.commit()

    res.json({ reordered: ids.length })
  } catch (error) {
    res.status(500).json({ message: 'Failed to reorder courses' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const courseData = buildCoursePayload(req.body, req.user, profile, {
      includeCreatedAt: true,
    })

    if (!courseData.title || !courseData.description) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const ref = await collection().add(courseData)
    const createdCourse = {
      id: ref.id,
      ...courseData,
      createdAt: new Date().toISOString(),
    }
    upsertPublicCourseCache(createdCourse)
    res.status(201).json(createdCourse)
  } catch (error) {
    res.status(500).json({ message: 'Failed to create course' })
  }
})

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = collection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' })
    }

    const current = doc.data()
    if (current.createdBy !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const courseData = buildCoursePayload(req.body, req.user, profile)
    if (!courseData.title || !courseData.description || !courseData.videoUrl) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    await ref.set(
      {
        ...courseData,
        createdAt: current.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const updatedCourse = {
      id: doc.id,
      ...current,
      ...courseData,
      updatedAt: new Date().toISOString(),
    }
    upsertPublicCourseCache(updatedCourse)
    res.json(updatedCourse)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update course' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = collection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Course not found' })
    }

    const current = doc.data()
    if (current.createdBy !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const requestsSnapshot = await requestsCollection().where('courseId', '==', req.params.id).get()
    const batch = admin.firestore().batch()
    batch.delete(ref)
    requestsSnapshot.docs.forEach((requestDoc) => {
      batch.delete(requestDoc.ref)
    })
    await batch.commit()
    removeFromPublicCourseCache(doc.id)
    res.json({ id: doc.id, deleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete course' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const seededCourse = librarySeedCourses.find((course) => course.id === req.params.id)
    if (seededCourse) {
      return res.json(seededCourse)
    }

    const doc = await collection().doc(req.params.id).get()
    if (doc.exists) {
      return res.json({ id: doc.id, ...doc.data() })
    }

    res.status(404).json({ message: 'Course not found' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to load course' })
  }
})

export default router

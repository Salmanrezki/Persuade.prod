import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { findCoachProfileById } from '../utils/coachDirectory.js'
import {
  isFirestoreUnavailable,
  logFirestoreWarning,
  toFirestoreUserMessage,
} from '../utils/firestoreErrors.js'
import { normalizeUserProfileRole } from '../utils/userRole.js'

const router = express.Router()

const usersCollection = () => admin.firestore().collection('users')
const followupCollection = () =>
  admin.firestore().collection('coachFollowupRequests')
const appointmentsCollection = () =>
  admin.firestore().collection('coachAppointments')

router.use('/learner-appointments', verifyToken, async (req, res, next) => {
  try {
    if ((await getUserProfile(req.user.uid))?.role !== 'apprenant')
      return res.sendStatus(403)
    next()
  } catch {
    res.sendStatus(503)
  }
})
router.get('/learner-appointments', async (req, res) => {
  try {
    const snapshot = await appointmentsCollection()
      .where('clientId', '==', req.user.uid)
      .get()
    res.json(
      snapshot.docs.map((doc) => {
        const { notes, ...data } = doc.data()
        return { ...data, id: doc.id }
      }),
    )
  } catch {
    res.status(503).json({ message: 'Impossible de charger vos rendez-vous.' })
  }
})
router.post('/learner-appointments', async (req, res) => {
  try {
    const { followupId, title, startAt, durationMinutes } = req.body || {}
    if (
      typeof followupId !== 'string' ||
      !followupId ||
      followupId.includes('/') ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 180 ||
      typeof startAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(startAt) ||
      !Number.isFinite(Date.parse(startAt)) ||
      Date.parse(startAt) <= Date.now() ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      return res
        .status(400)
        .json({
          message: 'Choisissez une date future, un objet et une durée valide.',
        })
    }
    const followup = await followupCollection().doc(followupId).get()
    if (
      !followup.exists ||
      followup.data().clientId !== req.user.uid ||
      followup.data().status !== 'accepted'
    )
      return res.sendStatus(403)
    const data = followup.data()
    const payload = {
      coachId: data.coachId,
      coachName: data.coachName || 'Coach',
      clientId: req.user.uid,
      clientName: data.clientName || 'Élève',
      followupId,
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      durationMinutes,
      status: 'requested',
      courseId: '',
      courseTitle: '',
      updatedAt: new Date().toISOString(),
    }
    const ref = await appointmentsCollection().add(payload)
    res.status(201).json({ ...payload, id: ref.id })
  } catch {
    res.status(503).json({ message: 'Impossible de demander ce rendez-vous.' })
  }
})
router.patch('/learner-appointments/:id/cancel', async (req, res) => {
  try {
    const ref = appointmentsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) return res.sendStatus(404)
    if (doc.data().clientId !== req.user.uid) return res.sendStatus(403)
    if (!['requested', 'scheduled'].includes(doc.data().status))
      return res.sendStatus(409)
    await ref.update({
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    })
    res.json({ id: doc.id, status: 'cancelled' })
  } catch {
    res.sendStatus(503)
  }
})

router.use('/appointments', verifyToken, async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (profile?.role !== 'coach') return res.sendStatus(403)
    next()
  } catch {
    res
      .status(503)
      .json({ message: 'Le calendrier est momentanément indisponible.' })
  }
})

router.get('/appointments', async (req, res) => {
  try {
    const snapshot = await appointmentsCollection()
      .where('coachId', '==', req.user.uid)
      .get()
    res.json(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })))
  } catch {
    res.status(503).json({ message: 'Impossible de charger les rendez-vous.' })
  }
})

async function saveAppointment(req, res) {
  try {
    const ref = req.params.appointmentId
      ? appointmentsCollection().doc(req.params.appointmentId)
      : appointmentsCollection().doc()
    if (req.params.appointmentId) {
      const existing = await ref.get()
      if (!existing.exists) return res.sendStatus(404)
      if (existing.data().coachId !== req.user.uid) return res.sendStatus(403)
    }
    const {
      followupId,
      courseId = '',
      title,
      startAt,
      durationMinutes,
      notes = '',
      status = 'scheduled',
    } = req.body || {}
    if (
      typeof followupId !== 'string' ||
      !followupId ||
      followupId.includes('/') ||
      typeof courseId !== 'string' ||
      courseId.includes('/') ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 180 ||
      typeof startAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(startAt) ||
      !Number.isFinite(Date.parse(startAt)) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480 ||
      typeof notes !== 'string' ||
      notes.length > 5000 ||
      !['requested', 'scheduled', 'completed', 'cancelled'].includes(status)
    ) {
      return res.status(400).json({
        message:
          'Vérifiez le titre, l’élève, la date et la durée (5 à 480 minutes).',
      })
    }
    const followup = await followupCollection().doc(followupId).get()
    if (
      !followup.exists ||
      followup.data().coachId !== req.user.uid ||
      followup.data().status !== 'accepted'
    ) {
      return res
        .status(403)
        .json({ message: 'Choisissez un élève dont le suivi est actif.' })
    }
    let courseTitle = ''
    if (courseId) {
      const course = await admin
        .firestore()
        .collection('courses')
        .doc(courseId)
        .get()
      if (!course.exists || course.data().coachId !== req.user.uid) {
        return res
          .status(400)
          .json({ message: 'Ce cours ne fait pas partie de vos cours.' })
      }
      courseTitle = course.data().title || ''
    }
    const payload = {
      coachId: req.user.uid,
      followupId,
      clientId: followup.data().clientId,
      clientName:
        followup.data().clientName || followup.data().clientEmail || 'Élève',
      courseId,
      courseTitle,
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      durationMinutes,
      notes: notes.trim(),
      status,
      updatedAt: new Date().toISOString(),
    }
    await ref.set(payload)
    res
      .status(req.params.appointmentId ? 200 : 201)
      .json({ ...payload, id: ref.id })
  } catch {
    res
      .status(503)
      .json({ message: 'Impossible d’enregistrer le rendez-vous.' })
  }
}
router.post('/appointments', saveAppointment)
router.patch('/appointments/:appointmentId', saveAppointment)

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists
    ? normalizeUserProfileRole({ uid: doc.id, ...doc.data() })
    : null
}

router.get('/me', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await followupCollection()
      .where('clientId', '==', req.user.uid)
      .get()
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(items)
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('GET /api/follow-up/me failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    res.status(500).json({ message: 'Failed to load follow-up requests' })
  }
})

router.get('/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await followupCollection()
      .where('coachId', '==', req.user.uid)
      .get()
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0
        return timeB - timeA
      })

    res.json(items)
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('GET /api/follow-up/coach failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    res.status(500).json({ message: 'Failed to load coach follow-up requests' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const coachId =
      typeof req.body?.coachId === 'string' ? req.body.coachId.trim() : ''
    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim() : ''

    if (!coachId) {
      return res.status(400).json({ message: 'Missing coachId' })
    }

    const coachProfile = await findCoachProfileById(coachId)
    if (!coachProfile) {
      return res.status(404).json({ message: 'Coach not found' })
    }

    const existingSnapshot = await followupCollection()
      .where('clientId', '==', req.user.uid)
      .get()

    const existing = existingSnapshot.docs.find((doc) => {
      const data = doc.data()
      return (
        data?.coachId === coachId &&
        ['pending', 'accepted'].includes(data?.status)
      )
    })
    if (existing) {
      return res
        .status(409)
        .json({ message: 'Request already exists', id: existing.id })
    }

    const payload = {
      coachId,
      coachName: coachProfile.firstname || coachProfile.email || 'Coach',
      coachEmail: coachProfile.email || '',
      clientId: req.user.uid,
      clientName: profile.firstname || profile.email || 'Apprenant',
      clientEmail: req.user.email || profile.email || '',
      message,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const ref = await followupCollection().add(payload)
    res.status(201).json({
      id: ref.id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    if (isFirestoreUnavailable(error)) {
      logFirestoreWarning('POST /api/follow-up failed', error)
      return res.status(503).json({ message: toFirestoreUserMessage() })
    }

    console.error('POST /api/follow-up failed:', error)
    res.status(500).json({ message: 'Failed to create follow-up request' })
  }
})

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const status =
      typeof req.body?.status === 'string' ? req.body.status.trim() : ''
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const ref = followupCollection().doc(req.params.id)
    const snapshot = await ref.get()
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Request not found' })
    }

    const current = snapshot.data()
    if (current.coachId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await ref.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.json({ id: snapshot.id, ...current, status })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update follow-up request' })
  }
})

export default router

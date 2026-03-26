import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router()

const usersCollection = () => admin.firestore().collection('users')
const coursesCollection = () => admin.firestore().collection('courses')
const requestsCollection = () => admin.firestore().collection('courseRequests')

const getUserProfile = async (uid) => {
  const doc = await usersCollection().doc(uid).get()
  return doc.exists ? doc.data() : null
}

router.get('/me', verifyToken, async (req, res) => {
  try {
    const snapshot = await requestsCollection().where('studentId', '==', req.user.uid).get()

    const requests = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })
    res.json(requests)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load requests' })
  }
})

router.get('/coach', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const snapshot = await requestsCollection().where('coachId', '==', req.user.uid).get()

    const requests = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
        return timeB - timeA
      })
    res.json(requests)
  } catch (error) {
    res.status(500).json({ message: 'Failed to load coach requests' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { courseId } = req.body || {}
    if (!courseId) {
      return res.status(400).json({ message: 'Missing courseId' })
    }

    const courseDoc = await coursesCollection().doc(courseId).get()
    if (!courseDoc.exists) {
      return res.status(404).json({ message: 'Course not found' })
    }

    const course = courseDoc.data()
    if (!course.coachId) {
      return res.status(400).json({ message: 'Course is not bookable' })
    }

    const existingSnapshot = await requestsCollection().where('studentId', '==', req.user.uid).get()
    const existingDoc = existingSnapshot.docs.find((doc) => doc.data().courseId === courseId)

    if (existingDoc) {
      return res.status(409).json({ message: 'Request already exists', id: existingDoc.id })
    }

    const requestData = {
      courseId,
      courseTitle: course.title || 'Cours',
      coachId: course.coachId,
      coachName: course.coachName || 'Coach',
      studentId: req.user.uid,
      studentName: profile.firstname || profile.email || 'Apprenant',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const ref = await requestsCollection().add(requestData)
    res.status(201).json({ id: ref.id, ...requestData })
  } catch (error) {
    res.status(500).json({ message: 'Failed to create request' })
  }
})

router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'coach') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const { status } = req.body || {}
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const ref = requestsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Request not found' })
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
    res.status(500).json({ message: 'Failed to update request' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid)
    if (!profile || profile.role !== 'apprenant') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const ref = requestsCollection().doc(req.params.id)
    const doc = await ref.get()
    if (!doc.exists) {
      return res.status(404).json({ message: 'Request not found' })
    }

    const data = doc.data()
    if (data.studentId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (data.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending requests can be cancelled' })
    }

    await ref.delete()

    res.json({ id: doc.id, deleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel request' })
  }
})

export default router

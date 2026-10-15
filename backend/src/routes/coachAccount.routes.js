import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { normalizeUserProfileRole } from '../utils/userRole.js'
import { buildCoachJourney } from '../utils/coachJourney.js'
import {
  normalizeCoachProfile,
  normalizeCoachPreferences,
} from '../utils/coachAccount.js'
const router = express.Router()
router.use(verifyToken)
router.use(async (req, res, next) => {
  try {
    req.profileRef = admin.firestore().collection('users').doc(req.user.uid)
    const snapshot = await req.profileRef.get()
    req.profile = normalizeUserProfileRole(snapshot.data())
    if (!snapshot.exists || req.profile?.role !== 'coach')
      return res.status(403).json({ message: 'Accès réservé aux coachs.' })
    next()
  } catch {
    res.status(500).json({ message: 'Impossible de charger le compte.' })
  }
})
router.get('/journey', async (req, res) => {
  try {
    const db = admin.firestore()
    const [preferences, courses, masterclasses, exercises] = await Promise.all([
      req.profileRef.collection('private').doc('coachPreferences').get(),
      db.collection('courses').where('coachId', '==', req.user.uid).get(),
      db.collection('masterclasses').where('coachId', '==', req.user.uid).get(),
      db.collection('coachExercises').where('coachId', '==', req.user.uid).get(),
    ])
    res.json(buildCoachJourney({
      profile: req.profile,
      preferences: preferences.exists ? preferences.data() : null,
      courses: courses.docs.map(doc => doc.data()),
      masterclasses: masterclasses.docs.map(doc => doc.data()),
      exercises: exercises.docs.map(doc => doc.data()),
    }))
  } catch {
    res.status(500).json({ message: 'Impossible de charger votre progression.' })
  }
})
router.get('/preferences', async (req, res) => {
  try {
    const doc = await req.profileRef
      .collection('private')
      .doc('coachPreferences')
      .get()
    res.json(doc.exists ? doc.data() : normalizeCoachPreferences())
  } catch {
    res.status(500).json({ message: 'Impossible de charger les préférences.' })
  }
})
router.patch('/preferences', async (req, res) => {
  let data
  try {
    data = normalizeCoachPreferences(req.body)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
  try {
    await req.profileRef.collection('private').doc('coachPreferences').set(data)
    res.json(data)
  } catch {
    res
      .status(500)
      .json({ message: 'Impossible d’enregistrer les préférences.' })
  }
})
router.patch('/profile', async (req, res) => {
  let coachProfile
  try {
    coachProfile = normalizeCoachProfile(req.body?.coachProfile)
  } catch (error) {
    return res.status(400).json({ message: error.message })
  }
  const firstname =
    typeof req.body?.firstname === 'string'
      ? req.body.firstname.trim().slice(0, 100)
      : ''
  const profilePhoto =
    typeof req.body?.profilePhoto === 'string'
      ? req.body.profilePhoto
      : req.profile.profilePhoto || ''
  if (!firstname)
    return res.status(400).json({ message: 'Renseignez votre nom public.' })
  if (
    profilePhoto &&
    !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(profilePhoto)
  )
    return res
      .status(400)
      .json({ message: 'Utilisez une photo PNG, JPEG ou WebP.' })
  if (profilePhoto.length * 0.75 > 300 * 1024)
    return res
      .status(413)
      .json({ message: 'La photo doit peser moins de 300 Ko.' })
  try {
    const data = { firstname, profilePhoto, coachProfile }
    await req.profileRef.update(data)
    res.json({ ...req.profile, ...data, uid: req.user.uid })
  } catch {
    res.status(500).json({ message: 'Impossible d’enregistrer le profil.' })
  }
})
export default router

import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import {
  createVideoProvider,
  videoRoomName,
  videoWindow,
} from '../services/appointmentVideo.js'

export function createVideoRouter({
  authenticate = verifyToken,
  getAppointment = async (id) => {
    const doc = await admin
      .firestore()
      .collection('coachAppointments')
      .doc(id)
      .get()
    return doc.exists ? doc.data() : null
  },
  provider = createVideoProvider(),
  now = Date.now,
} = {}) {
  const router = express.Router()
  router.use(authenticate)
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  async function load(req, res, next) {
    try {
      const appointment = await getAppointment(req.params.id)
      if (!appointment)
        return res.status(404).json({ message: 'Rendez-vous introuvable.' })
      if (![appointment.coachId, appointment.clientId].includes(req.user.uid)) {
        return res.status(403).json({
          message:
            'Cette visio est réservée aux deux participants du rendez-vous.',
        })
      }
      req.appointment = appointment
      next()
    } catch {
      res
        .status(503)
        .json({ message: 'Impossible de vérifier le rendez-vous. Réessayez.' })
    }
  }
  router.get('/:id', load, (req, res) => {
    const a = req.appointment
    const { state, end } = videoWindow(a, now())
    res.json({
      id: req.params.id,
      title: a.title,
      startAt: a.startAt,
      endAt: Number.isFinite(end) ? new Date(end).toISOString() : null,
      participantName:
        req.user.uid === a.coachId
          ? a.clientName || 'Apprenant'
          : a.coachName || 'Coach',
      participantId: req.user.uid === a.coachId ? a.clientId : a.coachId,
      state,
      configured: provider.configured(),
      serverNow: now(),
      sessionVersion: videoRoomName(req.params.id, a),
    })
  })
  router.post('/:id/join', load, async (req, res) => {
    if (videoWindow(req.appointment, now()).state !== 'ready') {
      return res.status(409).json({
        message:
          'La visio est accessible uniquement pendant le créneau confirmé.',
      })
    }
    if (!provider.configured())
      return res.status(503).json({
        message:
          'La visioconférence n’est pas encore activée. Contactez l’équipe Persuade.',
      })
    try {
      const session = await provider.join(
        req.params.id,
        req.appointment,
        req.user.uid,
      )
      // Do not deliver credentials if the appointment changed while the provider responded.
      const latest = await getAppointment(req.params.id)
      if (
        !latest ||
        videoWindow(latest, now()).state !== 'ready' ||
        videoRoomName(req.params.id, latest) !== session.sessionVersion
      ) {
        return res
          .status(409)
          .json({ message: 'Le rendez-vous a changé. Actualisez la page.' })
      }
      res.json(session)
    } catch {
      res.status(503).json({
        message:
          'La salle vidéo est momentanément indisponible. Réessayez dans quelques instants.',
      })
    }
  })
  return router
}

export default createVideoRouter()

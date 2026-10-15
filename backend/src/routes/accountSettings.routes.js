import express from 'express'
import admin from '../firebaseAdmin.js'
import { verifyToken } from '../middleware/authMiddleware.js'
import { deleteOwnAccount } from '../utils/deleteOwnAccount.js'
const router = express.Router()
router.delete('/me', verifyToken, async (req, res) => {
  if (req.body?.confirmation !== 'SUPPRIMER')
    return res
      .status(400)
      .json({ message: 'Saisissez SUPPRIMER pour confirmer.' })
  const age = Math.floor(Date.now() / 1000) - req.user.auth_time
  if (!Number.isFinite(age) || age < 0 || age > 300)
    return res
      .status(403)
      .json({
        message:
          'Confirmez à nouveau votre mot de passe avant de supprimer le compte.',
      })
  try {
    await deleteOwnAccount(admin.firestore(), admin.auth(), req.user.uid)
    res.sendStatus(204)
  } catch {
    res
      .status(503)
      .json({
        message:
          'La suppression n’a pas pu être finalisée. Certaines données peuvent déjà avoir été supprimées. Réessayez pour terminer.',
      })
  }
})
export default router

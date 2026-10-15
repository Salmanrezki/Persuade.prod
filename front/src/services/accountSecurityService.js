import { auth } from '@/services/firebase'
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'

export function normalizeEmail(value) {
  const email = String(value || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw new Error('Renseignez une adresse e-mail valide.')
  return email
}
export async function resetPassword(email) {
  const normalized = normalizeEmail(email)
  auth.languageCode = 'fr'
  try {
    await sendPasswordResetEmail(auth, normalized)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
  }
}
export async function verifyEmail() {
  if (!auth.currentUser)
    throw new Error('Reconnectez-vous pour vérifier votre adresse.')
  auth.languageCode = 'fr'
  await sendEmailVerification(auth.currentUser)
}
export async function refreshAccount() {
  if (!auth.currentUser)
    throw new Error('Reconnectez-vous pour actualiser votre compte.')
  await reload(auth.currentUser)
  await auth.currentUser.getIdToken(true)
  return auth.currentUser
}
export async function correctEmail(email, password) {
  const normalized = normalizeEmail(email)
  const user = auth.currentUser
  if (!user?.email)
    throw new Error('Reconnectez-vous pour modifier votre adresse.')
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  )
  auth.languageCode = 'fr'
  await verifyBeforeUpdateEmail(user, normalized)
}
export function securityError(error) {
  return (
    {
      'auth/too-many-requests':
        'Trop de demandes. Patientez avant de réessayer.',
      'auth/invalid-email': 'Cette adresse e-mail est invalide.',
      'auth/network-request-failed': 'Connexion impossible. Réessayez.',
      'auth/invalid-credential': 'Le mot de passe actuel est incorrect.',
      'auth/wrong-password': 'Le mot de passe actuel est incorrect.',
      'auth/requires-recent-login':
        'Reconnectez-vous pour effectuer cette opération.',
      'auth/email-already-in-use': 'Cette adresse ne peut pas être utilisée.',
    }[error?.code] ||
    (error?.code
      ? 'L’opération a échoué. Réessayez.'
      : error?.message || 'L’opération a échoué.')
  )
}

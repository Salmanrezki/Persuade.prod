export const isFirestoreUnavailable = (error) => {
  const code = Number(error?.code)
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()

  return (
    code === 14 ||
    message.includes('unavailable') ||
    message.includes('etimedout') ||
    message.includes('no connection established') ||
    message.includes('deadline exceeded')
  )
}

export const toFirestoreUserMessage = (fallbackMessage) =>
  'Connexion Firebase indisponible. Réessayez dans un instant.'

export const logFirestoreWarning = (label, error) => {
  if (isFirestoreUnavailable(error)) {
    console.warn(`${label}: Firestore indisponible (${error?.code || 'unknown'})`)
    return
  }

  console.error(`${label}:`, error)
}

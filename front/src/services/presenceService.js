import { db } from './firebase'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'

const HEARTBEAT_MS = 30000
export const PRESENCE_TTL_MS = 70000

let activeUid = null
let heartbeatTimer = null
let visibilityHandler = null
let focusHandler = null
let blurHandler = null
let beforeUnloadHandler = null

const toMillis = (value) => {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  if (typeof value?._seconds === 'number') return value._seconds * 1000
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const resolvePresenceStatus = () => {
  if (typeof document === 'undefined') return 'online'
  if (document.visibilityState !== 'visible') return 'away'
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return 'away'
  return 'online'
}

const writePresence = async (uid, status) => {
  if (!uid) return

  const payload = {
    presenceStatus: status,
    presenceUpdatedAt: serverTimestamp(),
  }

  if (status === 'online') {
    payload.lastActiveAt = serverTimestamp()
  }

  if (status === 'offline') {
    payload.lastOfflineAt = serverTimestamp()
  }

  await setDoc(doc(db, 'users', uid), payload, { merge: true })
}

const refreshPresence = async () => {
  if (!activeUid) return
  try {
    await writePresence(activeUid, resolvePresenceStatus())
  } catch (error) {
    console.error('Failed to update presence', error)
  }
}

const clearPresenceListeners = () => {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }

  if (focusHandler) {
    window.removeEventListener('focus', focusHandler)
    focusHandler = null
  }

  if (blurHandler) {
    window.removeEventListener('blur', blurHandler)
    blurHandler = null
  }

  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
  }
}

export const startUserPresence = async (uid) => {
  if (!uid) return
  if (activeUid === uid && heartbeatTimer) return

  if (activeUid && activeUid !== uid) {
    await stopUserPresence()
  }

  activeUid = uid
  await refreshPresence()

  visibilityHandler = () => {
    refreshPresence()
  }

  focusHandler = () => {
    refreshPresence()
  }

  blurHandler = () => {
    refreshPresence()
  }

  beforeUnloadHandler = () => {
    writePresence(activeUid, 'offline')
  }

  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('focus', focusHandler)
  window.addEventListener('blur', blurHandler)
  window.addEventListener('beforeunload', beforeUnloadHandler)
  heartbeatTimer = window.setInterval(refreshPresence, HEARTBEAT_MS)
}

export const stopUserPresence = async () => {
  const uid = activeUid
  clearPresenceListeners()
  activeUid = null

  if (!uid) return

  try {
    await writePresence(uid, 'offline')
  } catch (error) {
    console.error('Failed to clear presence', error)
  }
}

export const getUserPresenceState = (user) => {
  const lastUpdate = toMillis(user?.presenceUpdatedAt || user?.lastActiveAt)
  const isFresh = lastUpdate && Date.now() - lastUpdate <= PRESENCE_TTL_MS

  if (!isFresh) return 'offline'
  if (user?.presenceStatus === 'away') return 'away'
  return 'online'
}

export const getUserPresenceLabel = (user) => {
  const state = getUserPresenceState(user)
  if (state === 'online') return 'Connecte'
  if (state === 'away') return 'Absent'
  return 'Hors ligne'
}

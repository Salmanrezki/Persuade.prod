import api from '@/services/api'
import { db } from '@/services/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const CACHE_KEY = 'persuade.coach-directory'
const CACHE_TTL_MS = 5 * 60 * 1000

let memoryCache = {
  value: [],
  timestamp: 0,
  promise: null,
}

const isSeedCoachId = (value) => typeof value === 'string' && value.startsWith('seed-coach-')

const readCache = () => {
  if (memoryCache.value.length) return memoryCache
  if (typeof window === 'undefined') return memoryCache

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return memoryCache
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.value)) return memoryCache
    memoryCache = {
      value: parsed.value,
      timestamp: Number(parsed.timestamp) || 0,
      promise: null,
    }
  } catch (error) {
    return memoryCache
  }

  return memoryCache
}

const writeCache = (value) => {
  memoryCache = {
    value,
    timestamp: Date.now(),
    promise: null,
  }

  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      value,
      timestamp: memoryCache.timestamp,
    })
  )
}

const mergeCoachLists = (...coachLists) => {
  const coachMap = new Map()

  coachLists
    .flat()
    .filter((coach) => coach?.uid && !isSeedCoachId(coach.uid))
    .forEach((coach) => {
      const existing = coachMap.get(coach.uid)
      coachMap.set(coach.uid, {
        ...existing,
        ...coach,
        firstname: coach.firstname || existing?.firstname || '',
        email: coach.email || existing?.email || '',
        profilePhoto: coach.profilePhoto || existing?.profilePhoto || '',
        coachApplicationStatus:
          coach.coachApplicationStatus || existing?.coachApplicationStatus || 'pending_review',
      })
    })

  return Array.from(coachMap.values()).sort((a, b) =>
    (a.firstname || a.email || '').localeCompare(b.firstname || b.email || '', 'fr')
  )
}

const loadCoachesFromFirestore = async (currentUid) => {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'coach')))
  return snapshot.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .filter((item) => item.uid !== currentUid)
}

const loadCoachesFromApi = async () => {
  const response = await api.get('/users?role=coach')
  return Array.isArray(response.data) ? response.data : []
}

export const getCachedCoachDirectory = (currentUid) => {
  const cache = readCache()
  return cache.value.filter((item) => item.uid !== currentUid)
}

export const getCoachDirectory = async (currentUid, fallbackCoaches = [], { force = false } = {}) => {
  const cache = readCache()
  const isFresh = Date.now() - cache.timestamp < CACHE_TTL_MS

  if (!force && isFresh && cache.value.length) {
    return mergeCoachLists(cache.value, fallbackCoaches).filter((item) => item.uid !== currentUid)
  }

  if (memoryCache.promise) {
    const coaches = await memoryCache.promise
    return mergeCoachLists(coaches, fallbackCoaches).filter((item) => item.uid !== currentUid)
  }

  memoryCache.promise = Promise.allSettled([loadCoachesFromFirestore(currentUid), loadCoachesFromApi()])
    .then((results) => {
      const firestoreCoaches =
        results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : []
      const apiCoaches = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : []
      const merged = mergeCoachLists(firestoreCoaches, apiCoaches, fallbackCoaches)
      writeCache(merged)
      return merged
    })
    .finally(() => {
      memoryCache.promise = null
    })

  const coaches = await memoryCache.promise
  return coaches.filter((item) => item.uid !== currentUid)
}

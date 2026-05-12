import api from '@/services/api'

const CACHE_TTL_MS = 30 * 1000
const cache = new Map()
const STORAGE_PREFIX = 'persuade.content-cache'

const hasFreshValue = (entry) => entry?.value !== undefined && Date.now() - entry.timestamp < CACHE_TTL_MS

const readStoredEntry = (key) => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}.${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.value === undefined) return null
    return {
      value: parsed.value,
      timestamp: Number(parsed.timestamp) || 0,
      promise: null,
    }
  } catch (error) {
    return null
  }
}

const writeStoredEntry = (key, value, timestamp) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    `${STORAGE_PREFIX}.${key}`,
    JSON.stringify({
      value,
      timestamp,
    })
  )
}

const cachedGet = async (key, url, { force = false } = {}) => {
  let entry = cache.get(key)

  if (!entry) {
    const storedEntry = readStoredEntry(key)
    if (storedEntry) {
      cache.set(key, storedEntry)
      entry = storedEntry
    }
  }

  if (!force && hasFreshValue(entry)) {
    return entry.value
  }

  if (entry?.promise) {
    return entry.promise
  }

  const promise = api.get(url).then((response) => {
    const value = response.data
    const timestamp = Date.now()
    cache.set(key, {
      value,
      timestamp,
      promise: null,
    })
    writeStoredEntry(key, value, timestamp)
    return value
  })

  cache.set(key, {
    value: entry?.value,
    timestamp: entry?.timestamp || 0,
    promise,
  })

  try {
    return await promise
  } finally {
    const current = cache.get(key)
    if (current?.promise === promise) {
      cache.set(key, {
        value: current.value,
        timestamp: current.timestamp,
        promise: null,
      })
    }
  }
}

export const invalidateContent = (...keys) => {
  keys.forEach((key) => {
    cache.delete(key)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`${STORAGE_PREFIX}.${key}`)
    }
  })
}

export const getCourses = (options) => cachedGet('courses', '/courses', options)
export const getMasterclasses = (options) => cachedGet('masterclasses', '/masterclasses', options)
export const getMasterclassRegistrationSummary = (options) =>
  cachedGet('masterclass-registration-summary', '/masterclasses/registrations/summary', options)

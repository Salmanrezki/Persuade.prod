import api from '@/services/api'

const CACHE_TTL_MS = 30 * 1000
const cache = new Map()

const hasFreshValue = (entry) => entry?.value !== undefined && Date.now() - entry.timestamp < CACHE_TTL_MS

const cachedGet = async (key, url, { force = false } = {}) => {
  const entry = cache.get(key)

  if (!force && hasFreshValue(entry)) {
    return entry.value
  }

  if (entry?.promise) {
    return entry.promise
  }

  const promise = api.get(url).then((response) => {
    const value = response.data
    cache.set(key, {
      value,
      timestamp: Date.now(),
      promise: null,
    })
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
  keys.forEach((key) => cache.delete(key))
}

export const getCourses = (options) => cachedGet('courses', '/courses', options)
export const getMasterclasses = (options) => cachedGet('masterclasses', '/masterclasses', options)
export const getMasterclassRegistrationSummary = (options) =>
  cachedGet('masterclass-registration-summary', '/masterclasses/registrations/summary', options)

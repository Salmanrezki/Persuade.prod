import axios from 'axios'
import { auth } from '@/services/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const defaultDevBaseUrl = '/api'
const localApiUrlPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/?$/i
const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const useProxyInDev =
  import.meta.env.DEV && (!envBaseUrl || localApiUrlPattern.test(envBaseUrl))
const rawBaseUrl = useProxyInDev
  ? defaultDevBaseUrl
  : envBaseUrl || (import.meta.env.DEV ? defaultDevBaseUrl : '')

if (import.meta.env.PROD && !rawBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL for production build.')
}

const baseURL = rawBaseUrl.replace(/\/+$/, '')
const isRetryableNetworkError = (error) => {
  const request = error?.config
  const method = (request?.method || 'get').toLowerCase()
  const details = `${error?.code || ''} ${error?.message || ''}`.toLowerCase()

  return (
    ['get', 'head', 'options'].includes(method) &&
    !request?._networkRetry &&
    (details.includes('err_network_changed') ||
      details.includes('network error') ||
      details.includes('err_network') ||
      details.includes('econnaborted'))
  )
}

const api = axios.create({
  baseURL,
  timeout: 10000,
})

const waitForAuthState = (timeoutMs = 1200) =>
  new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser)
      return
    }

    let settled = false
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      unsubscribe()
      resolve(user)
    })

    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      unsubscribe()
      resolve(auth.currentUser || null)
    }, timeoutMs)
  })

// 🔐 Interceptor pour ajouter le token Firebase
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    if (isRetryableNetworkError(error)) {
      originalRequest._networkRetry = true
      await new Promise((resolve) => window.setTimeout(resolve, 700))
      return api(originalRequest)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const user = auth.currentUser || (await waitForAuthState())

      if (user) {
        const token = await user.getIdToken(true)
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default api

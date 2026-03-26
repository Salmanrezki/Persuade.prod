import axios from 'axios'
import { auth } from '@/services/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const defaultDevBaseUrl = 'http://localhost:3001/api'
const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? defaultDevBaseUrl : '')

if (import.meta.env.PROD && !rawBaseUrl) {
  throw new Error('Missing VITE_API_BASE_URL for production build.')
}

const baseURL = rawBaseUrl.replace(/\/+$/, '')

const api = axios.create({
  baseURL,
})

const getCurrentUser = () =>
  new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })

// 🔐 Interceptor pour ajouter le token Firebase
api.interceptors.request.use(async (config) => {
  const user = await getCurrentUser()

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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const user = await getCurrentUser()

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

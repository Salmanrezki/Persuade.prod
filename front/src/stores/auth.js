import { defineStore } from 'pinia'
import { auth } from '@/services/firebase'
import { startUserPresence, stopUserPresence } from '@/services/presenceService'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth'

import {
  claimReferralCode,
  createUserProfile,
  generateReferralCode,
  getUserProfile,
  normalizeReferralCode,
  normalizeUserProfile,
  normalizeUserRole,
  validateReferralCode,
} from '@/services/userService'

const AUTH_SESSION_MARKER = 'persuade.auth.session'
let persistencePromise = null

const getSessionStorage = () => (typeof window !== 'undefined' ? window.sessionStorage : null)

const hasActiveBrowserSession = () => {
  try {
    return getSessionStorage()?.getItem(AUTH_SESSION_MARKER) === 'active'
  } catch {
    return false
  }
}

const markActiveBrowserSession = () => {
  try {
    getSessionStorage()?.setItem(AUTH_SESSION_MARKER, 'active')
  } catch {}
}

const clearActiveBrowserSession = () => {
  try {
    getSessionStorage()?.removeItem(AUTH_SESSION_MARKER)
  } catch {}
}

const ensureSessionPersistence = () => {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserSessionPersistence)
  }

  return persistencePromise
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true,
    chatUnreadCount: 0,
    hasOnboarded: true,
    profileLoaded: false,
    profileSyncing: false,
    profile: null,
  }),

  actions: {
    resetProfileState() {
      this.hasOnboarded = true
      this.profileLoaded = false
      this.profileSyncing = false
      this.profile = null
    },

    async init() {
      try {
        await ensureSessionPersistence()
      } catch (error) {
        console.error('Unable to configure session persistence:', error)
      }

      onAuthStateChanged(auth, async (user) => {
        const previousUid = this.user?.uid || null

        if (user && !hasActiveBrowserSession()) {
          await signOut(auth)
          return
        }

        this.user = user
        this.loading = false

        if (!user) {
          clearActiveBrowserSession()
          this.resetProfileState()
        } else if (user.uid !== previousUid || this.profile?.uid !== user.uid) {
          markActiveBrowserSession()
          this.resetProfileState()
          this.profileSyncing = true
        }

        if (user) {
          await startUserPresence(user.uid)
        } else {
          await stopUserPresence()
        }
      })
    },

    async login(email, password) {
      await ensureSessionPersistence()
      markActiveBrowserSession()
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        this.user = cred.user
      } catch (error) {
        clearActiveBrowserSession()
        throw error
      }
    },

    async register(email, password, firstname, birthdate, role, referralCode = '') {
      await ensureSessionPersistence()
      const normalizedReferralCode = normalizeReferralCode(referralCode)
      if (normalizedReferralCode) {
        const validation = await validateReferralCode(normalizedReferralCode)
        if (!validation?.valid) {
          const error = new Error('Invalid referral code')
          error.code = 'referral/invalid-code'
          throw error
        }
      }

      markActiveBrowserSession()
      let cred
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password)
      } catch (error) {
        clearActiveBrowserSession()
        throw error
      }
      const normalizedRole = normalizeUserRole(role) || 'apprenant'
      const ownReferralCode = generateReferralCode(firstname, cred.user.uid)

      await createUserProfile(cred.user.uid, {
        email,
        firstname,
        birthdate,
        role: normalizedRole,
        referralCode: ownReferralCode,
        referralPoints: 0,
        referralCount: 0,
        referredByCode: null,
        coachApplicationStatus: normalizedRole === 'coach' ? 'pending_review' : null,
        hasOnboarded: true,
      })

      if (normalizedReferralCode) {
        await claimReferralCode(normalizedReferralCode)
      }

      this.user = cred.user
    },

    async logout() {
      await stopUserPresence()
      await signOut(auth)
      clearActiveBrowserSession()
      this.user = null
      this.chatUnreadCount = 0
      this.resetProfileState()
    },

    setChatUnreadCount(count) {
      this.chatUnreadCount = count
    },

    async fetchProfileStatus() {
      if (!this.user) return
      this.profileSyncing = true
      try {
        const profile = await getUserProfile(this.user.uid)
        this.profile = normalizeUserProfile(profile || {}, { uid: this.user.uid, email: this.user.email })
        this.hasOnboarded = true
        this.profileLoaded = true
      } catch (error) {
        this.profile = normalizeUserProfile(this.profile || {}, {
          uid: this.user.uid,
          email: this.user.email,
          role: this.profile?.role || null,
        })
        this.hasOnboarded = true
        this.profileLoaded = true
      } finally {
        this.profileSyncing = false
      }
    },

    setProfile(data) {
      this.profile = normalizeUserProfile(data || {}, { uid: this.user?.uid, email: this.user?.email })
      this.hasOnboarded = true
      this.profileLoaded = true
      this.profileSyncing = false
    },
  },
})

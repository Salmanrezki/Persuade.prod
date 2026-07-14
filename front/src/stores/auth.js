import { defineStore } from 'pinia'
import { auth } from '@/services/firebase'
import { startUserPresence, stopUserPresence } from '@/services/presenceService'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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

    init() {
      onAuthStateChanged(auth, async (user) => {
        const previousUid = this.user?.uid || null
        this.user = user
        this.loading = false

        if (!user) {
          this.resetProfileState()
        } else if (user.uid !== previousUid || this.profile?.uid !== user.uid) {
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
      const cred = await signInWithEmailAndPassword(auth, email, password)
      this.user = cred.user
    },

    async register(email, password, firstname, birthdate, role, referralCode = '') {
      const normalizedReferralCode = normalizeReferralCode(referralCode)
      if (normalizedReferralCode) {
        const validation = await validateReferralCode(normalizedReferralCode)
        if (!validation?.valid) {
          const error = new Error('Invalid referral code')
          error.code = 'referral/invalid-code'
          throw error
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const normalizedRole = normalizeUserRole(role)
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
        this.profile = normalizeUserProfile({}, { uid: this.user.uid, email: this.user.email })
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

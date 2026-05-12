import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LEGACY_ROUTE_REDIRECTS, ROUTE_PATHS } from '@/router/paths'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

const LandingView = () => import('@/views/LandingView.vue')
const AuthView = () => import('@/views/AuthView.vue')
const HomeView = () => import('@/views/HomeView.vue')
const CoursesView = () => import('@/views/CoursesView.vue')
const CoachCoursesView = () => import('@/views/CoachCoursesView.vue')
const MasterclassView = () => import('@/views/MasterclassView.vue')
const ChatView = () => import('@/views/ChatView.vue')
const OnboardingView = () => import('@/views/OnboardingView.vue')
const PracticalExercisesView = () => import('@/views/PracticalExercisesView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')
const PreferencesView = () => import('@/views/PreferencesView.vue')

const routes = [
  {
    path: ROUTE_PATHS.landing,
    component: LandingView,
  },
  {
    path: ROUTE_PATHS.login,
    component: AuthView,
    meta: { guestOnly: true },
  },
  {
    path: ROUTE_PATHS.appRoot,
    component: DefaultLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: ROUTE_PATHS.home,
      },
      {
        path: 'onboarding',
        component: OnboardingView,
      },
      {
        path: 'home',
        component: HomeView,
      },
      {
        path: 'profile',
        component: ProfileView,
      },
      {
        path: 'preferences',
        component: PreferencesView,
      },
      {
        path: 'courses',
        component: CoursesView,
      },
      {
        path: 'coach-courses',
        component: CoachCoursesView,
      },
      {
        path: 'masterclass',
        component: MasterclassView,
      },
      {
        path: 'practical-exercises',
        component: PracticalExercisesView,
      },
      {
        path: 'chat',
        component: ChatView,
      },
    ],
  },
  ...LEGACY_ROUTE_REDIRECTS,
  {
    path: '/:pathMatch(.*)*',
    redirect: ROUTE_PATHS.landing,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})


/* =========================
   🔒 GUARD GLOBAL
========================= */
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (auth.loading) {
    const unwatch = auth.$subscribe(() => {
      unwatch()
      handleAuth(to, auth, next)
    })
  } else {
    handleAuth(to, auth, next)
  }
})

async function handleAuth(to, auth, next) {
  const needsFreshProfile = () => auth.user && (!auth.profileLoaded || auth.profile?.uid !== auth.user.uid)

  if (to.meta.guestOnly && auth.user) {
    if (needsFreshProfile()) {
      await auth.fetchProfileStatus()
    }

    next(ROUTE_PATHS.home)
    return
  }

  if (to.meta.requiresAuth && !auth.user) {
    next(ROUTE_PATHS.login)
    return
  }

  if (auth.user) {
    if (needsFreshProfile()) {
      await auth.fetchProfileStatus()
    }
  }

  next()
}

export default router

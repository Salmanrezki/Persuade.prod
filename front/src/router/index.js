import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { LEGACY_ROUTE_REDIRECTS, ROUTE_PATHS } from '@/router/paths'

import DefaultLayout from '@/layouts/DefaultLayout.vue'
import LandingView from '@/views/LandingView.vue'
import AuthView from '@/views/AuthView.vue'
import HomeView from '@/views/HomeView.vue'
import CoursesView from '@/views/CoursesView.vue'
import CoachCoursesView from '@/views/CoachCoursesView.vue'
import MasterclassView from '@/views/MasterclassView.vue'
import ChatView from '@/views/ChatView.vue'
import OnboardingView from '@/views/OnboardingView.vue'
import PracticalExercisesView from '@/views/PracticalExercisesView.vue'
import ProfileView from '@/views/ProfileView.vue'
import PreferencesView from '@/views/PreferencesView.vue'

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

import { createRouter, createWebHistory } from 'vue-router'
import { isCoachProfile } from '@/utils/profile'
import { useAuthStore } from '@/stores/auth'
import { LEGACY_ROUTE_REDIRECTS, ROUTE_PATHS } from '@/router/paths'

import DefaultLayout from '@/layouts/DefaultLayout.vue'

const LandingView = () => import('@/views/LandingView.vue')
const LegalView = () => import('@/views/LegalView.vue')
const AuthView = () => import('@/views/AuthView.vue')
const HomeView = () => import('@/views/WorkspaceHomeView.vue')
const LearnerWorkspaceView = () => import('@/views/LearnerWorkspaceView.vue')
const ChatView = () => import('@/views/ChatView.vue')
const OnboardingView = () => import('@/views/OnboardingView.vue')
const WorkspaceAccountView = () => import('@/views/WorkspaceAccountView.vue')

const routes = [
  {
    path: ROUTE_PATHS.landing,
    component: LandingView,
  },
  {
    path: ROUTE_PATHS.privacy,
    component: LegalView,
    meta: { legalPage: 'privacy' },
  },
  {
    path: ROUTE_PATHS.legal,
    component: LegalView,
    meta: { legalPage: 'legal' },
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
      { path: 'appointments/:id/video', name: 'appointment-video', component: () => import('@/views/AppointmentVideoView.vue') },
      { path: 'coach/clients', component: () => import('@/views/CoachWorkspaceView.vue'), meta: { coachOnly: true }, props: { page: 'clients' } },
      { path: 'coach/content', component: () => import('@/views/CoachWorkspaceView.vue'), meta: { coachOnly: true }, props: { page: 'content' } },
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
        component: WorkspaceAccountView,
        props: { page: 'profile' },
      },
      {
        path: 'preferences',
        component: WorkspaceAccountView,
        props: { page: 'preferences' },
      },
      { path: 'settings', component: () => import('@/views/AccountSettingsView.vue') },
      {
        path: 'courses',
        component: LearnerWorkspaceView,
        props: { page: 'formation' },
      },
      {
        path: 'coach-courses',
        component: LearnerWorkspaceView,
        props: { page: 'coaching' },
      },
      {
        path: 'masterclass',
        redirect: { path: ROUTE_PATHS.courses, query: { tab: 'masterclasses' } },
      },
      {
        path: 'practical-exercises',
        component: LearnerWorkspaceView,
        props: { page: 'exercises' },
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

  const coach = isCoachProfile(auth.profile)
  if (to.meta.coachOnly && !coach) return next(ROUTE_PATHS.home)
  if (coach && to.meta.requiresAuth) {
    const contentTabs = { [ROUTE_PATHS.courses]: 'courses', [ROUTE_PATHS.masterclass]: 'masterclasses', [ROUTE_PATHS.practicalExercises]: 'exercises' }
    if (contentTabs[to.path]) return next({ path: ROUTE_PATHS.coachContent, query: { tab: to.path === ROUTE_PATHS.courses && to.query.tab === 'masterclasses' ? 'masterclasses' : contentTabs[to.path] } })
    if (to.path === ROUTE_PATHS.coachCourses) return next(ROUTE_PATHS.coachClients)
  }
  next()
}

export default router

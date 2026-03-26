export const ROUTE_PATHS = {
  landing: '/',
  login: '/connexion',
  legacyLogin: '/auth',
  appRoot: '/app',
  onboarding: '/app/onboarding',
  home: '/app/home',
  profile: '/app/profile',
  preferences: '/app/preferences',
  courses: '/app/courses',
  coachCourses: '/app/coach-courses',
  masterclass: '/app/masterclass',
  practicalExercises: '/app/practical-exercises',
  chat: '/app/chat',
}

export const LEGACY_ROUTE_REDIRECTS = [
  { path: ROUTE_PATHS.legacyLogin, redirect: ROUTE_PATHS.login },
  { path: '/onboarding', redirect: ROUTE_PATHS.onboarding },
  { path: '/home', redirect: ROUTE_PATHS.home },
  { path: '/profile', redirect: ROUTE_PATHS.profile },
  { path: '/preferences', redirect: ROUTE_PATHS.preferences },
  { path: '/courses', redirect: ROUTE_PATHS.courses },
  { path: '/coach-courses', redirect: ROUTE_PATHS.coachCourses },
  { path: '/masterclass', redirect: ROUTE_PATHS.masterclass },
  { path: '/practical-exercises', redirect: ROUTE_PATHS.practicalExercises },
  { path: '/chat', redirect: ROUTE_PATHS.chat },
]

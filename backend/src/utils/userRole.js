export const normalizeUserRole = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'coach') return 'coach'
  if (normalized === 'apprenant') return 'apprenant'
  if (normalized === 'learner' || normalized === 'student') return 'apprenant'
  return null
}

export const inferUserRole = (profile, fallbackRole = null) => {
  const normalizedRole = normalizeUserRole(profile?.role) || normalizeUserRole(fallbackRole)
  if (normalizedRole) return normalizedRole

  if (profile?.coachApplicationStatus) return 'coach'
  return 'apprenant'
}

export const normalizeUserProfileRole = (profile) => {
  if (!profile || typeof profile !== 'object') return profile
  const inferredRole = inferUserRole(profile)

  return {
    ...profile,
    role: inferredRole,
    coachApplicationStatus:
      inferredRole === 'coach' ? profile.coachApplicationStatus || 'pending_review' : null,
  }
}

export const normalizeUserRole = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'coach') return 'coach'
  if (normalized === 'apprenant') return 'apprenant'
  return null
}

export const normalizeUserProfileRole = (profile) => {
  if (!profile || typeof profile !== 'object') return profile
  const normalizedRole = normalizeUserRole(profile.role)
  const inferredRole =
    normalizedRole ||
    (profile.coachApplicationStatus === 'pending_review' ? 'coach' : null)

  return {
    ...profile,
    role: inferredRole || profile.role || null,
  }
}

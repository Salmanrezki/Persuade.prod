export const normalizeUserRole = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return normalized === 'coach' ? 'coach' : 'apprenant'
}

export const normalizeUserProfileRole = (profile) => {
  if (!profile || typeof profile !== 'object') return profile
  return {
    ...profile,
    role: normalizeUserRole(profile.role),
  }
}

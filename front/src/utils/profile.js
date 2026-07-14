export const MAX_PROFILE_PHOTO_BYTES = 300 * 1024

export const estimateDataUrlBytes = (value) => {
  if (typeof value !== 'string') return 0

  const base64 = value.includes(',') ? value.split(',')[1] : value
  const padding = base64.match(/=*$/)?.[0]?.length || 0
  return Math.floor((base64.length * 3) / 4) - padding
}

export const formatRoleLabel = (role) => {
  if (!role) return 'Profil actif'

  return role
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const inferProfileRole = (profile) => {
  if (profile?.role === 'coach') return 'coach'
  if (profile?.role === 'apprenant') return 'apprenant'
  if (profile?.coachApplicationStatus === 'pending_review') return 'coach'
  return null
}

export const isCoachProfile = (profile) => inferProfileRole(profile) === 'coach'

export const formatProfileRoleLabel = (profile) => formatRoleLabel(inferProfileRole(profile))

export const formatAccountStatusLabel = (profile) =>
  profile?.coachApplicationStatus === 'pending_review' ? 'En évaluation' : 'Actif'

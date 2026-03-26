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

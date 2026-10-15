const text = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''
const tags = (value) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((item) => typeof item === 'string')
            .map((item) => text(item, 80))
            .filter(Boolean),
        ),
      ].slice(0, 12)
    : []
export function normalizeCoachProfile(body = {}) {
  const years =
    body.experienceYears === '' || body.experienceYears == null
      ? null
      : Number(body.experienceYears)
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 70))
    throw new Error('Indiquez une expérience entre 0 et 70 ans.')
  return {
    headline: text(body.headline, 120),
    bio: text(body.bio, 2000),
    specialties: tags(body.specialties),
    experienceYears: years,
    experienceSummary: text(body.experienceSummary, 1500),
    certifications: tags(body.certifications),
    languages: tags(body.languages),
    audiences: tags(body.audiences),
    formats: tags(body.formats),
  }
}
export function normalizeCoachPreferences(body = {}) {
  const duration = Number(body.sessionDuration ?? 60),
    maxClients = Number(body.maxClients ?? 10)
  if (![30, 45, 60, 90, 120].includes(duration))
    throw new Error('Durée de séance invalide.')
  if (!Number.isInteger(maxClients) || maxClients < 1 || maxClients > 100)
    throw new Error('Indiquez entre 1 et 100 clients.')
  const timeZone = text(body.timeZone || 'Europe/Paris', 80)
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone }).format()
  } catch {
    throw new Error('Fuseau horaire invalide.')
  }
  const days = tags(body.days).filter((day) =>
    [
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
      'Dimanche',
    ].includes(day),
  )
  const startTime = text(body.startTime || '09:00', 5),
    endTime = text(body.endTime || '18:00', 5)
  if (
    ![startTime, endTime].every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) ||
    startTime >= endTime
  )
    throw new Error('La fin de disponibilité doit suivre le début.')
  return {
    days,
    startTime,
    endTime,
    timeZone,
    sessionDuration: duration,
    maxClients,
  }
}

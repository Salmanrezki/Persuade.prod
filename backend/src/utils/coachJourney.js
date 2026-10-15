const hasText = (value) => typeof value === 'string' && value.trim().length > 0
const hasTags = (value) => Array.isArray(value) && value.some(hasText)
export function buildCoachJourney({
  profile = {},
  preferences = null,
  courses = [],
  masterclasses = [],
  exercises = [],
} = {}) {
  const publicProfile = profile.coachProfile || {}
  const profileComplete =
    hasText(profile.firstname) &&
    hasText(profile.profilePhoto) &&
    hasText(publicProfile.headline) &&
    hasText(publicProfile.bio) &&
    hasTags(publicProfile.specialties) &&
    hasTags(publicProfile.languages) &&
    hasTags(publicProfile.audiences) &&
    hasTags(publicProfile.formats) &&
    hasTags(publicProfile.certifications) &&
    Number.isInteger(publicProfile.experienceYears) &&
    publicProfile.experienceYears >= 0 &&
    publicProfile.experienceYears <= 70 &&
    hasText(publicProfile.experienceSummary)
  const steps = {
    profile: Boolean(profileComplete),
    preferences: Boolean(
      preferences &&
      hasTags(preferences.days) &&
      hasText(preferences.timeZone) &&
      hasText(preferences.startTime) &&
      hasText(preferences.endTime) &&
      preferences.startTime < preferences.endTime &&
      preferences.sessionDuration > 0 &&
      preferences.maxClients > 0,
    ),
    course: courses.some(
      (course) =>
        course.coachingMode === 'video' &&
        hasText(course.videoUrl) &&
        hasText(course.title) &&
        hasText(course.description),
    ),
    masterclass: masterclasses.some(
      (item) =>
        item.status === 'scheduled' &&
        hasText(item.title) &&
        hasText(item.scheduleAt),
    ),
    exercise: exercises.some(
      (item) =>
        hasText(item.title) &&
        hasText(item.description) &&
        hasText(item.instructions),
    ),
  }
  return { steps, percent: Object.values(steps).filter(Boolean).length * 20 }
}

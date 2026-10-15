const hasText = (value) => typeof value === 'string' && value.trim().length > 0

export function buildLearnerJourney({
  profile = {},
  followups = [],
  appointments = [],
} = {}) {
  const progress = profile.learningProgress || {}
  const steps = {
    goal: hasText(profile.primaryGoal),
    course:
      Array.isArray(progress.viewedCourses) &&
      progress.viewedCourses.some((course) => hasText(course.id)),
    exercise: Object.values(progress.practicalExercises?.completed || {}).some(
      (value) => value === true,
    ),
    coach: followups.some((item) =>
      ['pending', 'accepted'].includes(item.status),
    ),
    appointment: appointments.some((item) =>
      ['requested', 'scheduled', 'completed'].includes(item.status),
    ),
  }
  const completed = Object.values(steps).filter(Boolean).length
  return {
    steps,
    completed,
    percent: completed * 20,
    awaitingCoach:
      steps.coach && !followups.some((item) => item.status === 'accepted'),
  }
}

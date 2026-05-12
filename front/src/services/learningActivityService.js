import api from '@/services/api'

const VIEWED_COURSES_STORAGE_PREFIX = 'persuade.viewed-courses'
const EXERCISE_PROGRESS_STORAGE_PREFIX = 'persuade.exercise-progress'
const syncTimers = new Map()

const getKey = (prefix, uid) => `${prefix}.${uid || 'guest'}`

const readJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

const writeJson = (key, value) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const recordViewedCourse = (uid, course) => {
  if (!course?.id) return

  const key = getKey(VIEWED_COURSES_STORAGE_PREFIX, uid)
  const current = readJson(key, [])
  const next = [
    {
      id: course.id,
      title: course.title || 'Cours',
      category: course.category || '',
      level: course.level || '',
      coachingMode: course.coachingMode || '',
      viewedAt: Date.now(),
    },
    ...current.filter((item) => item.id !== course.id),
  ].slice(0, 12)

  writeJson(key, next)
  scheduleLearningProgressSync(uid)
}

export const getViewedCourses = (uid) => readJson(getKey(VIEWED_COURSES_STORAGE_PREFIX, uid), [])

export const getExerciseProgress = (uid) =>
  readJson(getKey(EXERCISE_PROGRESS_STORAGE_PREFIX, uid), { completed: {}, notes: {} })

export const setExerciseCompleted = (uid, exerciseId, completed) => {
  const key = getKey(EXERCISE_PROGRESS_STORAGE_PREFIX, uid)
  const current = getExerciseProgress(uid)
  writeJson(key, {
    ...current,
    completed: {
      ...current.completed,
      [exerciseId]: Boolean(completed),
    },
  })
  scheduleLearningProgressSync(uid)
}

export const setExerciseNote = (uid, exerciseId, note) => {
  const key = getKey(EXERCISE_PROGRESS_STORAGE_PREFIX, uid)
  const current = getExerciseProgress(uid)
  writeJson(key, {
    ...current,
    notes: {
      ...current.notes,
      [exerciseId]: note,
    },
  })
  scheduleLearningProgressSync(uid)
}

export const scheduleLearningProgressSync = (uid, delayMs = 450) => {
  if (!uid || typeof window === 'undefined') return

  const existingTimer = syncTimers.get(uid)
  if (existingTimer) {
    window.clearTimeout(existingTimer)
  }

  const timer = window.setTimeout(() => {
    syncTimers.delete(uid)
    void syncLearningProgress(uid)
  }, delayMs)

  syncTimers.set(uid, timer)
}

export const syncLearningProgress = async (uid) => {
  if (!uid) return null

  const payload = {
    viewedCourses: getViewedCourses(uid),
    practicalExercises: getExerciseProgress(uid),
  }

  try {
    const response = await api.put('/users/progress/me', payload)
    return response.data
  } catch (error) {
    return null
  }
}

export const hydrateLearningProgress = async (uid) => {
  if (!uid) return

  try {
    const response = await api.get('/users/progress/me')
    const progress = response.data || {}
    if (progress.viewedCourses) {
      writeJson(getKey(VIEWED_COURSES_STORAGE_PREFIX, uid), progress.viewedCourses)
    }
    if (progress.practicalExercises) {
      writeJson(getKey(EXERCISE_PROGRESS_STORAGE_PREFIX, uid), progress.practicalExercises)
    }
  } catch (error) {
    return
  }
}

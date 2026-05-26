<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCourses } from '@/services/contentService'
import {
  getExerciseProgress,
  getViewedCourses,
  hydrateLearningProgress,
  setExerciseCompleted,
  setExerciseNote,
  setExerciseScore,
} from '@/services/learningActivityService'
import { buildCourseLinkedExercises, quizExercises, situationalExercises } from '@/data/practicalExercises'

const auth = useAuthStore()

const loading = ref(false)
const selectedTab = ref('linked')
const difficultyFilter = ref('all')
const searchQuery = ref('')
const courses = ref([])
const viewedCourses = ref([])
const progress = ref({ completed: {}, notes: {} })
const dialog = ref(false)
const activeExercise = ref(null)
const quizResponses = ref({})
const quizSecondsLeft = ref(0)
let quizTimer = null

const difficultyOptions = ['all', 'Debutant', 'Intermediaire', 'Avance', 'Tous niveaux']

const linkedExercises = computed(() => buildCourseLinkedExercises(viewedCourses.value, courses.value))
const standaloneQuizExercises = computed(() => quizExercises)
const allQuizExercises = computed(() => [...standaloneQuizExercises.value, ...linkedExercises.value.filter((item) => item.type === 'quiz')])
const allExercises = computed(() => [...linkedExercises.value, ...standaloneQuizExercises.value, ...situationalExercises])
const exercisesByTab = computed(() =>
  selectedTab.value === 'quiz'
    ? allQuizExercises.value
    : selectedTab.value === 'situational'
    ? situationalExercises
    : selectedTab.value === 'all'
    ? allExercises.value
    : linkedExercises.value
)

const filteredExercises = computed(() => {
  const queryValue = searchQuery.value.trim().toLowerCase()

  return exercisesByTab.value.filter((exercise) => {
    const matchesDifficulty =
      difficultyFilter.value === 'all' || (exercise.difficulty || '').toLowerCase() === difficultyFilter.value.toLowerCase()

    const matchesQuery =
      !queryValue ||
      [exercise.title, exercise.category, exercise.context, exercise.linkedCourseTitle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(queryValue))

    return matchesDifficulty && matchesQuery
  })
})

const completedCount = computed(
  () => filteredExercises.value.filter((exercise) => progress.value.completed?.[exercise.id]).length
)
const totalExercisesCount = computed(() => allExercises.value.length)

const openExercise = (exercise) => {
  activeExercise.value = exercise
  dialog.value = true
  quizResponses.value = {}
  startQuizTimer()
}

const toggleComplete = (exerciseId, completed) => {
  setExerciseCompleted(auth.user?.uid, exerciseId, completed)
  progress.value = getExerciseProgress(auth.user?.uid)
}

const updateNote = (exerciseId, note) => {
  setExerciseNote(auth.user?.uid, exerciseId, note)
  progress.value = getExerciseProgress(auth.user?.uid)
}

const setQuizResponse = (questionId, choiceIndex) => {
  quizResponses.value = {
    ...quizResponses.value,
    [questionId]: choiceIndex,
  }

  const questions = activeExercise.value?.questions || []
  const answeredCount = questions.filter(
    (question) => quizResponses.value[question.id] !== undefined || question.id === questionId
  ).length

  if (activeExercise.value?.type === 'quiz' && questions.length && answeredCount === questions.length) {
    const nextScore = questions.filter((question) => {
      const selectedValue =
        question.id === questionId ? choiceIndex : quizResponses.value[question.id]
      return selectedValue === question.answerIndex
    }).length

    setExerciseScore(auth.user?.uid, activeExercise.value.id, {
      score: nextScore,
      total: questions.length,
      percentage: Math.round((nextScore / questions.length) * 100),
      updatedAt: Date.now(),
    })
    progress.value = getExerciseProgress(auth.user?.uid)
  }
}

const isQuizAnswerCorrect = (question) => quizResponses.value[question.id] === question.answerIndex

const quizAnsweredCount = computed(() =>
  activeExercise.value?.questions?.filter((question) => quizResponses.value[question.id] !== undefined).length || 0
)

const quizScore = computed(() => {
  const questions = activeExercise.value?.questions || []
  if (!questions.length) return 0
  return questions.filter((question) => isQuizAnswerCorrect(question)).length
})

const quizPercentage = computed(() => {
  const total = activeExercise.value?.questions?.length || 0
  if (!total) return 0
  return Math.round((quizScore.value / total) * 100)
})

const timedQuizLabel = computed(() => {
  const minutes = String(Math.floor(quizSecondsLeft.value / 60)).padStart(2, '0')
  const seconds = String(quizSecondsLeft.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const exerciseScores = computed(() => progress.value.scores || {})
const globalQuizAverage = computed(() => {
  const items = Object.values(exerciseScores.value)
  if (!items.length) return 0
  const total = items.reduce((sum, item) => sum + Number(item?.percentage || 0), 0)
  return Math.round(total / items.length)
})

const masteryBadge = computed(() => {
  const completed = Object.values(progress.value.completed || {}).filter(Boolean).length
  if (completed >= 10 && globalQuizAverage.value >= 80) return 'Negociateur confirme'
  if (completed >= 6 && globalQuizAverage.value >= 65) return 'Praticien en progression'
  if (completed >= 3) return 'Explorateur actif'
  return 'Demarrage'
})

const nextRecommendedExercise = computed(() => {
  const uncompleted = allExercises.value.filter((exercise) => !progress.value.completed?.[exercise.id])
  if (!uncompleted.length) return null

  if (globalQuizAverage.value > 0 && globalQuizAverage.value < 60) {
    return uncompleted.find((exercise) => exercise.type === 'quiz') || uncompleted[0]
  }

  return (
    uncompleted.find((exercise) => exercise.difficulty === 'Debutant') ||
    uncompleted.find((exercise) => exercise.type === 'situation') ||
    uncompleted[0]
  )
})

const scoreHistory = computed(() =>
  Object.entries(exerciseScores.value)
    .map(([exerciseId, item]) => {
      const exercise = allExercises.value.find((entry) => entry.id === exerciseId)
      return {
        exerciseId,
        title: exercise?.title || 'Quiz',
        percentage: Number(item?.percentage || 0),
        updatedAt: Number(item?.updatedAt || 0),
      }
    })
    .filter((item) => item.updatedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt)
)

const scoreTrend = computed(() => {
  const ordered = [...scoreHistory.value].sort((left, right) => left.updatedAt - right.updatedAt).slice(-6)
  if (!ordered.length) return []
  const max = Math.max(...ordered.map((item) => item.percentage), 1)
  return ordered.map((item) => ({
    ...item,
    barHeight: Math.max(18, Math.round((item.percentage / max) * 100)),
    shortLabel: item.title.split(':')[0].slice(0, 14),
  }))
})

const weeklyGoalTarget = 3
const weeklyCompletedCount = computed(() => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return Object.values(exerciseScores.value).filter((item) => Number(item?.updatedAt || 0) >= weekAgo).length
})

const weeklyGoalProgress = computed(() =>
  Math.min(100, Math.round((weeklyCompletedCount.value / weeklyGoalTarget) * 100))
)

const learningPaths = computed(() => [
  {
    id: 'debutant',
    title: 'Parcours debutant',
    description: 'Ecoute, presence, premiers reflexes de reformulation et gestion de silence.',
    items: allExercises.value.filter((exercise) => exercise.difficulty === 'Debutant').slice(0, 4),
  },
  {
    id: 'intermediaire',
    title: 'Parcours intermediaire',
    description: 'Objections, ancrage, decodage des freins et relances utiles.',
    items: allExercises.value.filter((exercise) => exercise.difficulty === 'Intermediaire').slice(0, 4),
  },
  {
    id: 'avance',
    title: 'Parcours avance',
    description: 'Concessions, arbitrages, fournisseurs et situations sous forte contrainte.',
    items: allExercises.value.filter((exercise) => exercise.difficulty === 'Avance').slice(0, 4),
  },
])

const stopQuizTimer = () => {
  if (quizTimer) {
    window.clearInterval(quizTimer)
    quizTimer = null
  }
}

const startQuizTimer = () => {
  stopQuizTimer()
  const seconds = Number(activeExercise.value?.timeboxSeconds || 0)
  quizSecondsLeft.value = seconds
  if (!seconds) return

  quizTimer = window.setInterval(() => {
    if (quizSecondsLeft.value <= 1) {
      quizSecondsLeft.value = 0
      stopQuizTimer()
      return
    }
    quizSecondsLeft.value -= 1
  }, 1000)
}

const hydrateLocalState = () => {
  viewedCourses.value = getViewedCourses(auth.user?.uid)
  progress.value = getExerciseProgress(auth.user?.uid)
}

const refreshExercises = async () => {
  loading.value = !viewedCourses.value.length && !situationalExercises.length

  try {
    hydrateLocalState()

    const [coursesRes] = await Promise.allSettled([
      getCourses(),
      hydrateLearningProgress(auth.user?.uid).then(() => {
        hydrateLocalState()
      }),
    ])

    courses.value = coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value : []
    hydrateLocalState()
  } finally {
    loading.value = false
  }
}

watch(selectedTab, () => {
  if (selectedTab.value === 'situational') {
    difficultyFilter.value = 'all'
  }
})

onMounted(async () => {
  hydrateLocalState()
  await refreshExercises()
})

watch(dialog, (isOpen) => {
  if (!isOpen) {
    stopQuizTimer()
  }
})

watch(
  () => activeExercise.value?.id,
  () => {
    if (dialog.value) {
      startQuizTimer()
    }
  }
)

onBeforeUnmount(() => {
  stopQuizTimer()
})
</script>

<template>
  <v-container class="practical-page" fluid>
    <div class="practical-backdrop" aria-hidden="true"></div>

    <div class="practical-shell">
      <section class="practical-hero">
        <div>
          <div class="practical-eyebrow">Exercices Pratiques</div>
          <h1 class="practical-title">Exercices pratiques</h1>
        </div>

        <div class="practical-hero-stats">
          <v-sheet class="practical-stat practical-stat--forest" rounded="xl">
            <span class="practical-stat__value practical-stat__value--text">Co-construction</span>
            <span class="practical-stat__label">avec nos coachs</span>
          </v-sheet>
          <v-sheet class="practical-stat practical-stat--gold" rounded="xl">
            <span class="practical-stat__value practical-stat__value--text">Niveaux</span>
            <span class="practical-stat__label">débutant à avancé</span>
          </v-sheet>
          <v-sheet class="practical-stat practical-stat--coral" rounded="xl">
            <span class="practical-stat__value practical-stat__value--text">Bientôt</span>
            <span class="practical-stat__label">disponible</span>
          </v-sheet>
        </div>
      </section>

      <div class="practical-disabled-area" aria-disabled="true">
        <v-card class="practical-soon-card" elevation="6">
          <div class="practical-soon-card__eyebrow">Bientôt disponible</div>
          <div class="practical-soon-card__title">Nous préparons un vrai système d’exercices à niveaux</div>
          <div class="practical-soon-card__text">
            Nous travaillons actuellement avec des coachs experts pour mettre en place un système
            d’exercices structuré, avec plusieurs niveaux, des mises en situation, des parcours progressifs
            et des objectifs pédagogiques plus précis.
          </div>
          <div class="practical-soon-card__points">
            <span>Exercices par niveau</span>
            <span>Mises en situation guidées</span>
            <span>Progression plus claire</span>
            <span>Conçu avec des coachs experts</span>
          </div>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.practical-page {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 32px 20px 48px;
  background:
    radial-gradient(120% 120% at 10% 15%, rgba(28, 124, 125, 0.12), transparent 55%),
    radial-gradient(80% 100% at 90% 10%, rgba(230, 138, 46, 0.1), transparent 45%),
    linear-gradient(180deg, #f6f1e8 0%, #fcfaf6 100%);
}

.practical-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(19, 58, 59, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(19, 58, 59, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 85%);
}

.practical-shell {
  position: relative;
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 20px;
}

.practical-hero,
.practical-toolbar,
.practical-card,
.practical-dialog {
  border-radius: 28px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background: rgba(255, 250, 243, 0.95);
  box-shadow: 0 18px 35px rgba(44, 29, 16, 0.08);
}

.practical-hero {
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 241, 233, 0.92));
}

.practical-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(181, 93, 63, 0.08);
  color: #b55d3f;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.practical-title {
  margin: 14px 0 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  letter-spacing: -0.04em;
  color: #1c1a16;
}

.practical-hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 320px;
}

.practical-disabled-area {
  position: relative;
  filter: grayscale(0.18);
}

.practical-soon-card {
  padding: 28px;
  border-radius: 28px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 240, 233, 0.94));
  box-shadow: 0 18px 35px rgba(44, 29, 16, 0.08);
  display: grid;
  gap: 14px;
}

.practical-soon-card__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b55d3f;
}

.practical-soon-card__title {
  font-family: 'Space Grotesk', 'DM Sans', sans-serif;
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: #1c1a16;
}

.practical-soon-card__text {
  max-width: 840px;
  font-size: 15px;
  line-height: 1.7;
  color: #625b53;
}

.practical-soon-card__points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.practical-soon-card__points span {
  display: inline-flex;
  align-items: center;
  padding: 9px 12px;
  border-radius: 999px;
  background: rgba(46, 75, 64, 0.08);
  color: #2e4b40;
  font-size: 12px;
  font-weight: 600;
}

.practical-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.practical-insight-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 30px rgba(44, 29, 16, 0.06);
}

.practical-insight-card__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(28, 26, 22, 0.48);
}

.practical-insight-card__value {
  margin-top: 10px;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: #1c1a16;
}

.practical-insight-card__detail {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.55;
  color: #625b53;
}

.practical-dashboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.practical-dashboard-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background: rgba(255, 255, 255, 0.92);
}

.practical-dashboard-card__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(28, 26, 22, 0.48);
}

.practical-dashboard-empty {
  margin-top: 14px;
  font-size: 13px;
  color: #625b53;
}

.practical-trend-chart {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  align-items: end;
}

.practical-trend-chart__item {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.practical-trend-chart__bar-wrap {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: end;
}

.practical-trend-chart__bar {
  width: 100%;
  border-radius: 999px 999px 12px 12px;
  background: linear-gradient(180deg, #d28b68, #b55d3f);
}

.practical-trend-chart__value {
  font-size: 12px;
  font-weight: 700;
  color: #1c1a16;
}

.practical-trend-chart__label {
  font-size: 11px;
  text-align: center;
  color: #625b53;
}

.practical-goal {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.practical-goal__headline {
  font-size: 15px;
  font-weight: 700;
  color: #1c1a16;
}

.practical-goal__detail {
  font-size: 13px;
  color: #625b53;
}

.practical-score-history {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.practical-score-history__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(46, 75, 64, 0.05);
}

.practical-score-history__title {
  font-size: 13px;
  font-weight: 600;
  color: #1c1a16;
}

.practical-score-history__date {
  margin-top: 4px;
  font-size: 11px;
  color: #625b53;
}

.practical-score-history__score {
  font-size: 18px;
  font-weight: 700;
  color: #b55d3f;
}

.practical-stat {
  padding: 14px 16px;
  border-radius: 18px;
  min-width: 96px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background: rgba(255, 255, 255, 0.78);
  display: grid;
}

.practical-stat--forest {
  background: rgba(46, 75, 64, 0.08);
}

.practical-stat--gold {
  background: rgba(196, 146, 55, 0.1);
}

.practical-stat--coral {
  background: rgba(181, 93, 63, 0.1);
}

.practical-stat__value {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  color: #1c1a16;
}

.practical-stat__value--text {
  font-family: 'Space Grotesk', 'DM Sans', sans-serif;
  font-size: 18px;
  line-height: 1.15;
}

.practical-stat__label {
  font-size: 12px;
  color: #625b53;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.practical-toolbar {
  padding: 18px;
  display: grid;
  gap: 16px;
}

.practical-toolbar__filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 12px;
}

.practical-paths {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.practical-path-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(28, 26, 22, 0.08);
  background: rgba(255, 255, 255, 0.92);
}

.practical-path-card__title {
  font-size: 18px;
  font-weight: 700;
  color: #1c1a16;
}

.practical-path-card__description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
  color: #625b53;
}

.practical-path-card__list {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.practical-path-card__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(46, 75, 64, 0.05);
  font-size: 12px;
  color: #625b53;
}

.practical-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.practical-card {
  padding: 18px;
  display: grid;
  gap: 14px;
}

.practical-card--teal {
  background: linear-gradient(180deg, rgba(241, 247, 243, 0.96), rgba(255, 255, 255, 0.98));
}

.practical-card--gold {
  background: linear-gradient(180deg, rgba(251, 244, 231, 0.96), rgba(255, 255, 255, 0.98));
}

.practical-card--coral {
  background: linear-gradient(180deg, rgba(252, 240, 235, 0.96), rgba(255, 255, 255, 0.98));
}

.practical-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.practical-card__pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #1c1a16;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.practical-card__title {
  font-size: 20px;
  font-weight: 700;
  color: #133a3b;
  line-height: 1.2;
}

.practical-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #625b53;
}

.practical-card__meta span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
}

.practical-card__context,
.practical-card__linked {
  font-size: 14px;
  line-height: 1.6;
  color: #625b53;
}

.practical-card__criteria {
  display: grid;
  gap: 8px;
}

.practical-card__criterion {
  padding-left: 16px;
  position: relative;
  font-size: 13px;
  color: #625b53;
}

.practical-card__criterion::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #b55d3f;
}

.practical-card__cta {
  justify-self: flex-start;
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
  background: #2e4b40;
  color: #fff8f2;
}

.practical-state {
  padding: 34px 26px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(16, 40, 41, 0.72);
  text-align: center;
}

.practical-dialog {
  padding: 24px;
  display: grid;
  gap: 18px;
}

.practical-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.practical-dialog__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.52);
}

.practical-dialog__title {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #133a3b;
}

.practical-dialog__meta {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.practical-dialog__quiz-score {
  margin-bottom: 12px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.66);
}

.practical-dialog__quiz-timer {
  margin-bottom: 12px;
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(245, 191, 71, 0.14);
  color: #8c6211;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.practical-dialog__quiz-list {
  display: grid;
  gap: 14px;
}

.practical-dialog__quiz-item {
  padding: 14px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.04);
}

.practical-dialog__quiz-prompt {
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #133a3b;
}

.practical-dialog__quiz-feedback {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.55;
}

.practical-dialog__quiz-feedback.success {
  background: rgba(28, 124, 125, 0.1);
  color: #135f60;
}

.practical-dialog__quiz-feedback.warning {
  background: rgba(230, 138, 46, 0.12);
  color: #7e5311;
}

.practical-dialog__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.practical-dialog__section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.54);
}

.practical-dialog__list {
  display: grid;
  gap: 8px;
}

.practical-dialog__item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
  color: rgba(16, 40, 41, 0.76);
  line-height: 1.55;
}

.practical-dialog__item--model {
  background: rgba(28, 124, 125, 0.08);
  color: #124f50;
}

.practical-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 960px) {
  .practical-hero,
  .practical-dialog__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .practical-hero-stats {
    min-width: 0;
  }

  .practical-toolbar__filters,
  .practical-insights,
  .practical-dashboard,
  .practical-paths,
  .practical-grid,
  .practical-dialog__columns {
    grid-template-columns: 1fr;
  }
}
</style>

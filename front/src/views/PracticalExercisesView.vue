<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCourses } from '@/services/contentService'
import {
  getExerciseProgress,
  getViewedCourses,
  hydrateLearningProgress,
  setExerciseCompleted,
  setExerciseNote,
} from '@/services/learningActivityService'
import { buildCourseLinkedExercises, situationalExercises } from '@/data/practicalExercises'

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

const difficultyOptions = ['all', 'Debutant', 'Intermediaire', 'Avance', 'Tous niveaux']

const linkedExercises = computed(() => buildCourseLinkedExercises(viewedCourses.value, courses.value))
const allExercises = computed(() => [...linkedExercises.value, ...situationalExercises])
const exercisesByTab = computed(() =>
  selectedTab.value === 'situational'
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

const openExercise = (exercise) => {
  activeExercise.value = exercise
  dialog.value = true
}

const toggleComplete = (exerciseId, completed) => {
  setExerciseCompleted(auth.user?.uid, exerciseId, completed)
  progress.value = getExerciseProgress(auth.user?.uid)
}

const updateNote = (exerciseId, note) => {
  setExerciseNote(auth.user?.uid, exerciseId, note)
  progress.value = getExerciseProgress(auth.user?.uid)
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
</script>

<template>
  <v-container class="practical-page" fluid>
    <div class="practical-backdrop" aria-hidden="true"></div>

    <div class="practical-shell">
      <section class="practical-hero">
        <div>
          <div class="practical-eyebrow">Exercices Pratiques</div>
          <h1 class="practical-title">Exercices lies a vos cours et mises en situation</h1>
          <p class="practical-subtitle">
            Travaillez directement sur la plateforme avec des exercices de consolidation lies aux cours consultes et des cas de negociation en situation.
          </p>
        </div>

        <div class="practical-hero-stats">
          <div class="practical-stat">
            <span class="practical-stat__value">{{ linkedExercises.length }}</span>
            <span class="practical-stat__label">lies a vos cours</span>
          </div>
          <div class="practical-stat">
            <span class="practical-stat__value">{{ situationalExercises.length }}</span>
            <span class="practical-stat__label">mises en situation</span>
          </div>
          <div class="practical-stat">
            <span class="practical-stat__value">{{ completedCount }}</span>
            <span class="practical-stat__label">completes</span>
          </div>
        </div>
      </section>

      <v-card class="practical-toolbar" elevation="6">
        <div class="practical-toolbar__tabs">
          <v-btn-toggle v-model="selectedTab" mandatory density="comfortable">
            <v-btn value="linked">Liés a mes cours</v-btn>
            <v-btn value="situational">Mise en situation</v-btn>
            <v-btn value="all">Tous</v-btn>
          </v-btn-toggle>
        </div>

        <div class="practical-toolbar__filters">
          <v-text-field
            v-model="searchQuery"
            label="Rechercher un exercice"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="difficultyFilter"
            :items="difficultyOptions"
            label="Niveau"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>
      </v-card>

      <div v-if="loading" class="practical-state">Chargement des exercices...</div>

      <div v-else-if="filteredExercises.length" class="practical-grid">
        <v-card
          v-for="exercise in filteredExercises"
          :key="exercise.id"
          class="practical-card"
          :class="`practical-card--${exercise.tone}`"
          elevation="6"
        >
          <div class="practical-card__top">
            <div class="practical-card__pill">{{ exercise.type === 'linked' ? 'Cours consulte' : 'Scenario' }}</div>
            <v-checkbox-btn
              :model-value="Boolean(progress.completed?.[exercise.id])"
              color="#1c7c7d"
              @update:modelValue="toggleComplete(exercise.id, $event)"
            />
          </div>

          <div class="practical-card__title">{{ exercise.title }}</div>
          <div class="practical-card__meta">
            <span>{{ exercise.difficulty }}</span>
            <span>{{ exercise.duration }}</span>
            <span>{{ exercise.category }}</span>
          </div>

          <div class="practical-card__context">{{ exercise.context }}</div>

          <div v-if="exercise.linkedCourseTitle" class="practical-card__linked">
            Lie au cours: {{ exercise.linkedCourseTitle }}
          </div>

          <div class="practical-card__criteria">
            <div v-for="criterion in exercise.successCriteria.slice(0, 2)" :key="criterion" class="practical-card__criterion">
              {{ criterion }}
            </div>
          </div>

          <v-btn class="practical-card__cta" variant="flat" @click="openExercise(exercise)">
            Ouvrir l exercice
          </v-btn>
        </v-card>
      </div>

      <div v-else class="practical-state">
        <template v-if="selectedTab === 'linked'">
          Consultez d abord un ou plusieurs cours pour debloquer des exercices lies a vos apprentissages.
        </template>
        <template v-else>
          Aucun exercice ne correspond a vos filtres actuels.
        </template>
      </div>
    </div>

    <v-dialog v-model="dialog" max-width="860">
      <v-card v-if="activeExercise" class="practical-dialog">
        <div class="practical-dialog__header">
          <div>
            <div class="practical-dialog__eyebrow">
              {{ activeExercise.type === 'linked' ? 'Exercice d apprentissage' : 'Exercice de situation' }}
            </div>
            <div class="practical-dialog__title">{{ activeExercise.title }}</div>
            <div class="practical-dialog__meta">
              {{ activeExercise.difficulty }} · {{ activeExercise.duration }} · {{ activeExercise.category }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="dialog = false" />
        </div>

        <div class="practical-dialog__section">
          <div class="practical-dialog__section-title">Objectif</div>
          <p>{{ activeExercise.objective }}</p>
        </div>

        <div class="practical-dialog__section">
          <div class="practical-dialog__section-title">Contexte</div>
          <p>{{ activeExercise.context }}</p>
        </div>

        <div class="practical-dialog__columns">
          <div class="practical-dialog__section">
            <div class="practical-dialog__section-title">Consignes</div>
            <div class="practical-dialog__list">
              <div v-for="prompt in activeExercise.prompts" :key="prompt" class="practical-dialog__item">
                {{ prompt }}
              </div>
            </div>
          </div>

          <div class="practical-dialog__section">
            <div class="practical-dialog__section-title">Criteres de reussite</div>
            <div class="practical-dialog__list">
              <div v-for="criterion in activeExercise.successCriteria" :key="criterion" class="practical-dialog__item">
                {{ criterion }}
              </div>
            </div>
          </div>
        </div>

        <div class="practical-dialog__section">
          <div class="practical-dialog__section-title">Votre note de travail</div>
          <v-textarea
            :model-value="progress.notes?.[activeExercise.id] || ''"
            variant="outlined"
            rows="5"
            hide-details
            placeholder="Redigez votre reponse, vos axes d amelioration ou votre plan d action."
            @update:modelValue="updateNote(activeExercise.id, $event)"
          />
        </div>

        <div class="practical-dialog__footer">
          <v-checkbox
            :model-value="Boolean(progress.completed?.[activeExercise.id])"
            label="Marquer comme complete"
            hide-details
            @update:modelValue="toggleComplete(activeExercise.id, $event)"
          />
          <v-btn class="practical-card__cta" variant="flat" @click="dialog = false">Fermer</v-btn>
        </div>
      </v-card>
    </v-dialog>
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
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.practical-hero {
  padding: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.practical-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.practical-title {
  margin: 18px 0 12px;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.05;
  color: #102829;
}

.practical-subtitle {
  max-width: 720px;
  margin: 0;
  font-size: 16px;
  line-height: 1.7;
  color: rgba(16, 40, 41, 0.74);
}

.practical-hero-stats {
  display: grid;
  gap: 12px;
  min-width: 210px;
}

.practical-stat {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.05);
  display: grid;
}

.practical-stat__value {
  font-size: 28px;
  font-weight: 700;
  color: #133a3b;
}

.practical-stat__label {
  font-size: 12px;
  color: rgba(16, 40, 41, 0.62);
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
  background: linear-gradient(180deg, rgba(228, 245, 243, 0.92), rgba(255, 255, 255, 0.98));
}

.practical-card--gold {
  background: linear-gradient(180deg, rgba(255, 243, 218, 0.94), rgba(255, 255, 255, 0.98));
}

.practical-card--coral {
  background: linear-gradient(180deg, rgba(255, 235, 228, 0.94), rgba(255, 255, 255, 0.98));
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
  color: #133a3b;
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
  color: rgba(19, 58, 59, 0.62);
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
  color: rgba(16, 40, 41, 0.74);
}

.practical-card__criteria {
  display: grid;
  gap: 8px;
}

.practical-card__criterion {
  padding-left: 16px;
  position: relative;
  font-size: 13px;
  color: rgba(16, 40, 41, 0.74);
}

.practical-card__criterion::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1c7c7d;
}

.practical-card__cta {
  justify-self: flex-start;
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
  background: #133a3b;
  color: #fffaf2;
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

  .practical-toolbar__filters,
  .practical-grid,
  .practical-dialog__columns {
    grid-template-columns: 1fr;
  }
}
</style>

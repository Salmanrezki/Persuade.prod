<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'
import { COACH_JOURNEY_UPDATED } from '@/services/coachJourneyService'
const route = useRoute()
const journey = ref(null),
  error = ref(false),
  loading = ref(false)
let requestId = 0
const steps = [
  {
    key: 'profile',
    label: 'Profil',
    action: 'Compléter mon profil',
    to: ROUTE_PATHS.profile,
  },
  {
    key: 'preferences',
    label: 'Préférences',
    action: 'Renseigner mes préférences',
    to: ROUTE_PATHS.preferences,
  },
  {
    key: 'course',
    label: 'Premier cours',
    action: 'Publier un cours',
    to: { path: ROUTE_PATHS.coachContent, query: { tab: 'courses' } },
  },
  {
    key: 'masterclass',
    label: 'Première masterclass',
    action: 'Planifier une masterclass',
    to: { path: ROUTE_PATHS.coachContent, query: { tab: 'masterclasses' } },
  },
  {
    key: 'exercise',
    label: 'Premier exercice',
    action: 'Créer un exercice',
    to: { path: ROUTE_PATHS.coachContent, query: { tab: 'exercises' } },
  },
]
const nextStep = computed(() =>
  journey.value ? steps.find((step) => !journey.value.steps[step.key]) : null,
)
async function refresh() {
  const id = ++requestId
  loading.value = true
  error.value = false
  try {
    const { data } = await api.get('/coach-account/journey')
    if (id === requestId) journey.value = data
  } catch {
    if (id === requestId) error.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}
watch(() => route.fullPath, refresh)
onMounted(() => {
  refresh()
  window.addEventListener(COACH_JOURNEY_UPDATED, refresh)
})
onBeforeUnmount(() => {
  requestId++
  window.removeEventListener(COACH_JOURNEY_UPDATED, refresh)
})
</script>
<template>
  <section
    class="coach-journey"
    aria-label="Votre parcours coach"
    :aria-busy="loading"
  >
    <div v-if="error" class="journey-error">
      Progression indisponible.<v-btn
        variant="text"
        size="small"
        :loading="loading"
        @click="refresh"
        >Réessayer</v-btn
      >
    </div>
    <template v-else-if="journey">
      <div class="journey-heading">
        <div class="journey-title">
          <span>{{
            journey.percent === 100
              ? 'Parcours coach complété'
              : 'Votre parcours coach'
          }}</span
          ><strong aria-live="polite">{{ journey.percent }} %</strong>
        </div>
        <v-btn
          v-if="nextStep"
          :to="nextStep.to"
          variant="text"
          color="#b55d3f"
          size="small"
          append-icon="mdi-arrow-right"
          >{{ nextStep.action }}</v-btn
        ><v-icon v-else color="#24443f" aria-label="Parcours terminé"
          >mdi-check-circle-outline</v-icon
        >
      </div>
      <v-progress-linear
        :model-value="journey.percent"
        color="#24443f"
        bg-color="#e4e6dc"
        height="5"
        rounded
        aria-label="Progression du parcours coach"
      />
      <nav class="journey-steps" aria-label="Étapes du parcours coach">
        <router-link
          v-for="(step, index) in steps"
          :key="step.key"
          :to="step.to"
          :class="{
            complete: journey.steps[step.key],
            next: nextStep?.key === step.key,
          }"
          :aria-label="`${step.label} : ${journey.steps[step.key] ? 'terminé' : 'à compléter'}`"
          ><v-icon v-if="journey.steps[step.key]" size="16"
            >mdi-check-circle</v-icon
          ><span v-else class="step-number">{{ index + 1 }}</span
          >{{ step.label }}</router-link
        >
      </nav>
    </template>
    <div v-else class="journey-loading">
      Chargement du parcours…<v-progress-linear
        indeterminate
        color="#24443f"
        height="3"
        class="mt-2"
      />
    </div>
  </section>
</template>
<style scoped>
.coach-journey {
  max-width: 1152px;
  margin: 22px auto 0;
  padding: 15px 20px;
  background: #fffdf8;
  border: 1px solid #24443f20;
  border-radius: 12px;
  color: #24443f;
}
.journey-heading,
.journey-title {
  display: flex;
  align-items: center;
  gap: 16px;
}
.journey-heading {
  justify-content: space-between;
  margin-bottom: 10px;
  min-height: 28px;
}
.journey-title {
  font-size: 14px;
}
.journey-title strong {
  color: #b55d3f;
  white-space: nowrap;
}
.journey-steps {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  flex-wrap: wrap;
}
.journey-steps a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #6c746c;
  text-decoration: none;
}
.journey-steps a.complete {
  color: #24443f;
}
.journey-steps a.next {
  color: #b55d3f;
  font-weight: 600;
}
.step-number {
  border: 1px solid currentColor;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 10px;
  flex-shrink: 0;
}
.journey-error,
.journey-loading {
  font-size: 13px;
}
.journey-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
a:focus-visible {
  outline: 2px solid #b55d3f;
  outline-offset: 4px;
}
:deep(.v-btn) {
  letter-spacing: 0;
  text-transform: none;
}
@media (max-width: 1200px) {
  .coach-journey {
    margin-inline: 24px;
  }
}
@media (max-width: 600px) {
  .coach-journey {
    margin: 16px 16px 0;
    padding: 14px;
  }
  .journey-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .journey-steps {
    justify-content: flex-start;
    gap: 12px 18px;
  }
}
</style>

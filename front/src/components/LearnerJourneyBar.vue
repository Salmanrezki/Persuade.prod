<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'
import { buildLearnerJourney } from '@/utils/learnerJourney'

const route = useRoute(),
  auth = useAuthStore()
const journey = ref(null),
  loading = ref(false),
  error = ref(false)
const steps = [
  {
    key: 'goal',
    label: 'Mon objectif',
    action: 'Définir mon objectif',
    description:
      'Précisez ce que vous souhaitez améliorer dans vos préférences.',
    to: ROUTE_PATHS.preferences,
  },
  {
    key: 'course',
    label: 'Premier cours',
    action: 'Choisir un cours',
    description:
      'Lancez une première vidéo pour découvrir les méthodes à votre rythme.',
    to: { path: ROUTE_PATHS.courses, query: { tab: 'courses' } },
  },
  {
    key: 'exercise',
    label: 'Premier exercice',
    action: 'Passer à la pratique',
    description:
      'Réalisez un exercice puis marquez-le comme terminé pour valider cette étape.',
    to: ROUTE_PATHS.practicalExercises,
  },
  {
    key: 'coach',
    label: 'Mon coach',
    action: 'Trouver mon coach',
    description:
      'Découvrez les profils et envoyez une demande de suivi au coach de votre choix.',
    to: { path: ROUTE_PATHS.coachCourses, query: { tab: 'directory' } },
  },
  {
    key: 'appointment',
    label: 'Premier rendez-vous',
    action: 'Organiser mon rendez-vous',
    description:
      'Une fois votre suivi accepté, proposez une date à votre coach. Il confirmera ensuite le créneau.',
    to: ROUTE_PATHS.coachCourses,
  },
]
const nextStep = computed(() =>
  journey.value ? steps.find((step) => !journey.value.steps[step.key]) : null,
)
const waiting = computed(
  () => nextStep.value?.key === 'appointment' && journey.value?.awaitingCoach,
)
let requestId = 0,
  timer,
  interceptor
async function refresh() {
  const id = ++requestId
  loading.value = true
  error.value = false
  try {
    const [profile, followups, appointments] = await Promise.all([
      api.get('/users/me'),
      api.get('/follow-up/me'),
      api.get('/follow-up/learner-appointments'),
    ])
    if (id === requestId)
      journey.value = buildLearnerJourney({
        profile: profile.data,
        followups: followups.data,
        appointments: appointments.data,
      })
  } catch {
    if (id === requestId) error.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}
function scheduleRefresh() {
  clearTimeout(timer)
  timer = setTimeout(refresh, 200)
}
watch(() => route.fullPath, scheduleRefresh)
watch(() => auth.profile, scheduleRefresh)
onMounted(() => {
  refresh()
  window.addEventListener('focus', scheduleRefresh)
  // Refresh only after the server has saved an action, never on a failed request.
  interceptor = api.interceptors.response.use((response) => {
    const { method, url = '' } = response.config
    if (
      ['post', 'put', 'patch', 'delete'].includes(method) &&
      /^(\/users\/(me|progress\/me)|\/follow-up|\/exercise-attempts)(\/|$)/.test(url)
    )
      scheduleRefresh()
    return response
  })
})
onBeforeUnmount(() => {
  requestId++
  clearTimeout(timer)
  window.removeEventListener('focus', scheduleRefresh)
  if (interceptor !== undefined) api.interceptors.response.eject(interceptor)
})
</script>

<template>
  <section
    class="learner-journey"
    aria-label="Vos premiers pas sur Persuade"
    :aria-busy="loading"
  >
    <div v-if="error" class="journey-error">
      Votre parcours n’a pas pu être actualisé.<v-btn
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
              ? 'Vos premiers pas sont accomplis'
              : 'Votre parcours apprenant'
          }}</span
          ><strong aria-live="polite"
            >{{ journey.completed }}/5 · {{ journey.percent }} %</strong
          >
        </div>
        <v-btn
          v-if="nextStep"
          :to="nextStep.to"
          variant="text"
          color="#b55d3f"
          size="small"
          append-icon="mdi-arrow-right"
          >{{ waiting ? 'Voir mon suivi' : nextStep.action }}</v-btn
        >
        <v-btn
          v-else
          :to="{ path: ROUTE_PATHS.courses, query: { tab: 'masterclasses' } }"
          variant="text"
          color="#b55d3f"
          size="small"
          append-icon="mdi-arrow-right"
          >Découvrir les masterclass</v-btn
        >
      </div>
      <p class="journey-description" aria-live="polite">
        {{
          waiting
            ? 'Votre demande de suivi a été envoyée. Dès que le coach l’accepte, vous pourrez proposer un rendez-vous. En attendant, continuez vos cours et exercices.'
            : nextStep
              ? nextStep.description
              : 'Continuez à pratiquer et à échanger avec votre coach. Pour aller plus loin, participez à une masterclass.'
        }}
      </p>
      <v-progress-linear
        :model-value="journey.percent"
        color="#24443f"
        bg-color="#e4e6dc"
        height="5"
        rounded
        aria-label="Progression de vos premiers pas"
      />
      <nav class="journey-steps" aria-label="Étapes du parcours apprenant">
        <router-link
          v-for="(step, index) in steps"
          :key="step.key"
          :to="step.to"
          :class="{
            complete: journey.steps[step.key],
            next: nextStep?.key === step.key,
          }"
          :aria-current="nextStep?.key === step.key ? 'step' : undefined"
          :aria-label="`${step.label} : ${journey.steps[step.key] ? 'étape validée' : 'à compléter'}`"
          :title="step.description"
          ><v-icon v-if="journey.steps[step.key]" size="16"
            >mdi-check-circle</v-icon
          ><span v-else class="step-number">{{ index + 1 }}</span
          >{{ step.label }}</router-link
        >
      </nav>
    </template>
    <div v-else class="journey-loading">
      Chargement de votre parcours…<v-progress-linear
        indeterminate
        color="#24443f"
        height="3"
        class="mt-2"
      />
    </div>
  </section>
</template>

<style scoped>
.journey-description {
  font-size: 13px;
  line-height: 1.6;
  color: #68736c;
  margin: 0 0 12px;
}
.learner-journey {
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
  .learner-journey {
    margin-inline: 24px;
  }
}
@media (max-width: 600px) {
  .learner-journey {
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

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const dialogOpen = ref(false)
const initializedForUid = ref('')

const buildSteps = (role) => {
  if (role === 'coach') {
    return [
      {
        id: 'home',
        path: ROUTE_PATHS.home,
        target: ROUTE_PATHS.home,
        tone: 'teal',
        eyebrow: 'Tableau de bord',
        title: 'Pilotez votre activite depuis un seul espace',
        text: 'Le dashboard met en avant votre planning, vos clients suivis, les demandes recues et vos prochains points d attention.',
      },
      {
        id: 'coach-courses',
        path: ROUTE_PATHS.coachCourses,
        target: ROUTE_PATHS.coachCourses,
        tone: 'gold',
        eyebrow: 'Cours particuliers',
        title: 'Gerez vos cours particuliers',
        text: 'Retrouvez ici vos offres, vos demandes apprenants et les accompagnements en cours.',
      },
      {
        id: 'masterclass',
        path: ROUTE_PATHS.masterclass,
        target: ROUTE_PATHS.masterclass,
        tone: 'coral',
        eyebrow: 'Masterclass',
        title: 'Mettez en avant vos masterclass',
        text: 'Créez, planifiez et ajustez vos masterclass depuis cette page dédiée.',
      },
      {
        id: 'chat',
        path: ROUTE_PATHS.chat,
        target: ROUTE_PATHS.chat,
        tone: 'teal',
        eyebrow: 'Chat',
        title: 'Echangez avec vos clients',
        text: 'Le chat vous permet de suivre chaque client, partager des ressources et organiser les prochaines etapes.',
      },
      {
        id: 'profile',
        path: ROUTE_PATHS.profile,
        target: 'profile',
        tone: 'coral',
        eyebrow: 'Profil',
        title: 'Soignez votre fiche coach',
        text: 'Votre profil, vos préférences et votre positionnement influencent la manière dont les apprenants vous perçoivent.',
      },
    ]
  }

  return [
    {
      id: 'home',
      path: ROUTE_PATHS.home,
      target: ROUTE_PATHS.home,
      tone: 'teal',
      eyebrow: 'Bienvenue',
      title: 'Commencez par votre tableau de bord',
      text: 'Retrouvez ici votre progression, vos demandes, vos prochains contenus et les points prioritaires de votre parcours.',
    },
    {
      id: 'courses',
      path: ROUTE_PATHS.courses,
      target: ROUTE_PATHS.courses,
      tone: 'gold',
      eyebrow: 'Cours pre-enregistres',
      title: 'Explorez la bibliotheque de cours',
      text: 'Accédez à des contenus à votre rythme pour construire des bases solides avant la pratique.',
    },
    {
      id: 'coach-courses',
      path: ROUTE_PATHS.coachCourses,
      target: ROUTE_PATHS.coachCourses,
      tone: 'teal',
      eyebrow: 'Cours particuliers',
      title: 'Trouvez un accompagnement avec un coach',
      text: 'Cette page regroupe les cours particuliers et les offres d accompagnement plus personnalisées.',
    },
    {
      id: 'masterclass',
      path: ROUTE_PATHS.masterclass,
      target: ROUTE_PATHS.masterclass,
      tone: 'coral',
      eyebrow: 'Masterclass',
      title: 'Rejoignez des sessions plus expertes',
      text: 'Les masterclass permettent d approfondir une thématique précise avec un format plus événementiel.',
    },
    {
      id: 'practical-exercises',
      path: ROUTE_PATHS.practicalExercises,
      target: ROUTE_PATHS.practicalExercises,
      tone: 'gold',
      eyebrow: 'Exercices',
      title: 'Mettez vos acquis en pratique',
      text: 'Les exercices pratiques vous aident à passer de la théorie à l application concrète.',
    },
    {
      id: 'chat',
      path: ROUTE_PATHS.chat,
      target: ROUTE_PATHS.chat,
      tone: 'teal',
      eyebrow: 'Chat',
      title: 'Gardez le lien avec vos coachs',
      text: 'Le chat centralise vos échanges, vos suivis et les conversations importantes.',
    },
  ]
}

const storageKey = computed(() => {
  const uid = auth.user?.uid
  return uid ? `persuade.app-tour.${uid}` : ''
})

const tourSteps = computed(() => buildSteps(auth.profile?.role))

const readTourState = () => {
  if (!storageKey.value || typeof window === 'undefined') {
    return { step: 0, completed: false, paused: false }
  }

  try {
    const raw = window.localStorage.getItem(storageKey.value)
    if (!raw) return { step: 0, completed: false, paused: false }
    const parsed = JSON.parse(raw)
    return {
      step: Number.isFinite(parsed?.step) ? parsed.step : 0,
      completed: !!parsed?.completed,
      paused: !!parsed?.paused,
    }
  } catch (error) {
    return { step: 0, completed: false, paused: false }
  }
}

const writeTourState = (state) => {
  if (!storageKey.value || typeof window === 'undefined') return
  window.localStorage.setItem(storageKey.value, JSON.stringify(state))
}

const currentStepIndex = ref(0)
const tourPaused = ref(false)
const tourCompleted = ref(false)

const currentStep = computed(() => tourSteps.value[currentStepIndex.value] || tourSteps.value[0] || null)
const isCurrentRouteStep = computed(() => currentStep.value?.path === route.path)
const progressLabel = computed(() =>
  currentStep.value ? `${currentStepIndex.value + 1} / ${tourSteps.value.length}` : '0 / 0'
)
const showResumeChip = computed(
  () => !!auth.user && !tourCompleted.value && tourPaused.value && tourSteps.value.length > 0
)

const syncTourState = () => {
  const uid = auth.user?.uid || ''
  if (!uid || !auth.profileLoaded || route.path === ROUTE_PATHS.onboarding) return
  if (initializedForUid.value === uid) return

  initializedForUid.value = uid
  const state = readTourState()
  currentStepIndex.value = Math.min(Math.max(state.step, 0), Math.max(tourSteps.value.length - 1, 0))
  tourPaused.value = state.paused
  tourCompleted.value = state.completed
  dialogOpen.value = !state.completed && !state.paused && tourSteps.value.length > 0
}

const persistTourState = () => {
  writeTourState({
    step: currentStepIndex.value,
    completed: tourCompleted.value,
    paused: tourPaused.value,
  })
}

const emitSpotlight = () => {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('persuade-tour-spotlight', {
      detail: {
        active: dialogOpen.value && !tourCompleted.value,
        target: currentStep.value?.target || '',
        tone: currentStep.value?.tone || 'teal',
      },
    })
  )
}

const openTour = () => {
  if (tourCompleted.value) return
  tourPaused.value = false
  dialogOpen.value = true
  persistTourState()
}

const pauseTour = () => {
  tourPaused.value = true
  dialogOpen.value = false
  persistTourState()
}

const completeTour = () => {
  tourCompleted.value = true
  tourPaused.value = false
  dialogOpen.value = false
  persistTourState()
}

const goToCurrentStep = async () => {
  if (!currentStep.value?.path) return
  if (route.path !== currentStep.value.path) {
    await router.push(currentStep.value.path)
  }
}

const nextStep = async () => {
  if (currentStepIndex.value >= tourSteps.value.length - 1) {
    completeTour()
    return
  }

  currentStepIndex.value += 1
  tourPaused.value = false
  persistTourState()
  await goToCurrentStep()
}

watch(
  () => [auth.user?.uid, auth.profileLoaded, auth.profile?.role, route.path],
  () => {
    if (!auth.user?.uid) {
      initializedForUid.value = ''
      dialogOpen.value = false
      tourPaused.value = false
      tourCompleted.value = false
      currentStepIndex.value = 0
      return
    }

    syncTourState()
  },
  { immediate: true }
)

watch(
  () => [dialogOpen.value, currentStepIndex.value, tourCompleted.value],
  () => {
    emitSpotlight()
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="auth.user && route.path !== ROUTE_PATHS.onboarding">
    <v-dialog v-model="dialogOpen" max-width="720" persistent>
      <v-card class="tour-dialog" :class="`tour-dialog--${currentStep?.tone || 'teal'}`">
        <div class="tour-dialog__header">
          <div>
            <div class="tour-dialog__eyebrow">{{ currentStep?.eyebrow || 'Découverte' }}</div>
            <div class="tour-dialog__title">{{ currentStep?.title || 'Visite guidée' }}</div>
          </div>
          <v-chip class="tour-dialog__progress" :class="`tour-dialog__progress--${currentStep?.tone || 'teal'}`" size="small" variant="flat">{{ progressLabel }}</v-chip>
        </div>

        <div class="tour-dialog__body">
          <div class="tour-dialog__text">
            {{ currentStep?.text || 'Découvrez les espaces essentiels de la plateforme.' }}
          </div>

          <div class="tour-dialog__route">
            <span class="tour-dialog__route-label">Page ciblée</span>
            <span class="tour-dialog__route-value">{{ currentStep?.path }}</span>
          </div>

          <div class="tour-dialog__status" :class="isCurrentRouteStep ? 'tour-dialog__status--ready' : ''">
            <v-icon size="18">{{ isCurrentRouteStep ? 'mdi-check-circle-outline' : 'mdi-compass-outline' }}</v-icon>
            <span>
              {{ isCurrentRouteStep ? 'Vous êtes sur la bonne page. Passez à l étape suivante quand vous êtes prêt.' : 'Ouvrez cette page pour continuer la visite guidée.' }}
            </span>
          </div>
        </div>

        <div class="tour-dialog__actions">
          <v-btn variant="text" @click="pauseTour">Plus tard</v-btn>
          <v-btn
            v-if="!isCurrentRouteStep"
            class="tour-dialog__btn tour-dialog__btn--outline"
            variant="outlined"
            @click="goToCurrentStep"
          >
            Ouvrir la page
          </v-btn>
          <v-btn
            class="tour-dialog__btn tour-dialog__btn--solid"
            variant="flat"
            @click="isCurrentRouteStep ? nextStep() : goToCurrentStep()"
          >
            {{ currentStepIndex >= tourSteps.length - 1 && isCurrentRouteStep ? 'Terminer' : isCurrentRouteStep ? 'Suivant' : 'Commencer' }}
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <div v-if="showResumeChip" class="tour-resume">
      <v-btn class="tour-resume__btn" :class="`tour-resume__btn--${currentStep?.tone || 'teal'}`" size="large" variant="flat" @click="openTour">
        Reprendre la visite
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.tour-dialog {
  border-radius: 30px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.18), transparent 32%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(246, 242, 234, 0.98));
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.tour-dialog--teal {
  background:
    radial-gradient(circle at top right, rgba(67, 196, 175, 0.18), transparent 32%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(240, 247, 246, 0.98));
}

.tour-dialog--gold {
  background:
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.22), transparent 34%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(250, 245, 234, 0.98));
}

.tour-dialog--coral {
  background:
    radial-gradient(circle at top right, rgba(240, 90, 40, 0.2), transparent 34%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(249, 239, 235, 0.98));
}

.tour-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tour-dialog__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.5);
}

.tour-dialog__title {
  margin-top: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #133a3b;
}

.tour-dialog__progress {
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
  font-weight: 700;
}

.tour-dialog__progress--teal {
  background: rgba(28, 124, 125, 0.12);
  color: #176d6e;
}

.tour-dialog__progress--gold {
  background: rgba(245, 191, 71, 0.2);
  color: #a56e08;
}

.tour-dialog__progress--coral {
  background: rgba(240, 90, 40, 0.18);
  color: #c95730;
}

.tour-dialog__body {
  margin-top: 20px;
  display: grid;
  gap: 14px;
}

.tour-dialog__text {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(19, 58, 59, 0.78);
}

.tour-dialog__route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.tour-dialog__route-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.52);
}

.tour-dialog__route-value {
  font-size: 13px;
  font-weight: 700;
  color: #133a3b;
}

.tour-dialog__status {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.05);
  color: rgba(19, 58, 59, 0.72);
}

.tour-dialog__status--ready {
  background: rgba(28, 124, 125, 0.12);
  color: #176d6e;
}

.tour-dialog__actions {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.tour-dialog__btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
}

.tour-dialog__btn--outline {
  color: #133a3b;
}

.tour-dialog__btn--solid {
  background: #133a3b;
  color: #fff8ef;
}

.tour-resume {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 20;
}

.tour-resume__btn {
  border-radius: 999px;
  text-transform: none;
  font-weight: 700;
  background: #133a3b;
  color: #fff8ef;
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.18);
}

.tour-resume__btn--teal {
  background: #133a3b;
}

.tour-resume__btn--gold {
  background: #b77d17;
}

.tour-resume__btn--coral {
  background: #b95331;
}

@media (max-width: 720px) {
  .tour-dialog {
    padding: 20px;
  }

  .tour-dialog__header,
  .tour-dialog__route,
  .tour-dialog__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .tour-resume {
    right: 16px;
    left: 16px;
    bottom: 16px;
  }

  .tour-resume__btn {
    width: 100%;
  }
}
</style>

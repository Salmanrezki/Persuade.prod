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
const progressValue = computed(() => {
  if (!tourSteps.value.length) return 0
  return ((currentStepIndex.value + 1) / tourSteps.value.length) * 100
})
const showResumeChip = computed(
  () => !!auth.user && !tourCompleted.value && tourPaused.value && tourSteps.value.length > 0
)
const currentToneClass = computed(() => `tour-dialog--${currentStep.value?.tone || 'teal'}`)

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
    <v-dialog
      v-model="dialogOpen"
      max-width="720"
      persistent
      content-class="tour-dialog-overlay"
    >
      <v-card class="tour-dialog" :class="currentToneClass">
        <div class="tour-dialog__header">
          <div class="tour-dialog__hero">
            <div class="tour-dialog__eyebrow">{{ currentStep?.eyebrow || 'Découverte' }}</div>
            <div class="tour-dialog__title">{{ currentStep?.title || 'Visite guidée' }}</div>
            <div class="tour-dialog__lede">
              {{ currentStep?.text || 'Découvrez les espaces essentiels de la plateforme.' }}
            </div>
          </div>
          <div class="tour-dialog__header-meta">
            <v-chip class="tour-dialog__progress" :class="`tour-dialog__progress--${currentStep?.tone || 'teal'}`" size="small" variant="flat">
              Étape {{ progressLabel }}
            </v-chip>
            <v-progress-linear
              :model-value="progressValue"
              rounded
              height="8"
              class="tour-dialog__progress-bar"
            />
          </div>
        </div>

        <div class="tour-dialog__body">
          <v-sheet class="tour-dialog__status" :class="isCurrentRouteStep ? 'tour-dialog__status--ready' : ''" rounded="xl">
            <v-icon size="18">{{ isCurrentRouteStep ? 'mdi-check-circle-outline' : 'mdi-compass-outline' }}</v-icon>
            <span class="tour-dialog__status-text">
              {{ isCurrentRouteStep ? 'Vous êtes sur la bonne page. Passez à l étape suivante quand vous êtes prêt.' : 'Ouvrez cette page pour continuer la visite guidée.' }}
            </span>
          </v-sheet>

          <div class="tour-dialog__steps">
            <span
              v-for="(step, index) in tourSteps"
              :key="step.id"
              class="tour-dialog__step-dot"
              :class="{
                'tour-dialog__step-dot--current': index === currentStepIndex,
                'tour-dialog__step-dot--done': index < currentStepIndex,
              }"
            />
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
        <v-icon start size="18">mdi-motion-play-outline</v-icon>
        Reprendre la visite
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
:global(.tour-dialog-overlay) {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 40px;
  padding-right: 40px;
}

.tour-dialog {
  --tour-ink: #1c1a16;
  --tour-muted: #625b53;
  --tour-line: rgba(28, 26, 22, 0.08);
  border-radius: 30px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(181, 93, 63, 0.14), transparent 32%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(247, 241, 233, 0.98));
  border: 1px solid var(--tour-line);
  box-shadow: 0 28px 80px rgba(21, 18, 14, 0.16);
}

.tour-dialog--teal {
  background:
    radial-gradient(circle at top right, rgba(46, 75, 64, 0.14), transparent 32%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(241, 246, 242, 0.98));
}

.tour-dialog--gold {
  background:
    radial-gradient(circle at top right, rgba(196, 146, 55, 0.16), transparent 34%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(251, 245, 234, 0.98));
}

.tour-dialog--coral {
  background:
    radial-gradient(circle at top right, rgba(181, 93, 63, 0.18), transparent 34%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.99), rgba(250, 240, 236, 0.98));
}

.tour-dialog__header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
}

.tour-dialog__hero {
  flex: 1;
  min-width: 0;
}

.tour-dialog__header-meta {
  width: 152px;
  display: grid;
  align-content: start;
  gap: 12px;
}

.tour-dialog__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b55d3f;
}

.tour-dialog__title {
  margin-top: 8px;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.04em;
  color: var(--tour-ink);
}

.tour-dialog__lede {
  margin-top: 10px;
  max-width: 38rem;
  font-size: 15px;
  line-height: 1.7;
  color: var(--tour-muted);
}

.tour-dialog__progress {
  justify-self: end;
  background: rgba(28, 26, 22, 0.06);
  color: var(--tour-ink);
  font-weight: 700;
}

.tour-dialog__progress--teal {
  background: rgba(46, 75, 64, 0.12);
  color: #2e4b40;
}

.tour-dialog__progress--gold {
  background: rgba(196, 146, 55, 0.18);
  color: #86611d;
}

.tour-dialog__progress--coral {
  background: rgba(181, 93, 63, 0.14);
  color: #a24d32;
}

.tour-dialog__progress-bar {
  background: rgba(28, 26, 22, 0.06);
  border-radius: 999px;
}

.tour-dialog__body {
  margin-top: 20px;
  display: grid;
  gap: 14px;
}

.tour-dialog__status {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(28, 26, 22, 0.04);
  color: var(--tour-muted);
}

.tour-dialog__status--ready {
  background: rgba(46, 75, 64, 0.1);
  color: #2e4b40;
}

.tour-dialog__status-text {
  line-height: 1.55;
}

.tour-dialog__steps {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tour-dialog__step-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(28, 26, 22, 0.14);
  transition: transform 180ms ease, background 180ms ease, width 180ms ease;
}

.tour-dialog__step-dot--done {
  background: rgba(46, 75, 64, 0.38);
}

.tour-dialog__step-dot--current {
  width: 28px;
  background: #b55d3f;
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
  min-height: 44px;
}

.tour-dialog__btn--outline {
  color: var(--tour-ink);
}

.tour-dialog__btn--solid {
  background: #2e4b40;
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
  background: #2e4b40;
  color: #fff8ef;
  box-shadow: 0 18px 34px rgba(21, 18, 14, 0.18);
}

.tour-resume__btn--teal {
  background: #2e4b40;
}

.tour-resume__btn--gold {
  background: #9b7220;
}

.tour-resume__btn--coral {
  background: #b55d3f;
}

@media (max-width: 720px) {
  :global(.tour-dialog-overlay) {
    justify-content: center;
    padding-left: 16px;
    padding-right: 16px;
  }

  .tour-dialog {
    padding: 20px;
  }

  .tour-dialog__header,
  .tour-dialog__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .tour-dialog__header-meta {
    width: 100%;
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

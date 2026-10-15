<template>
  <v-app>
    <CoachNavbar v-if="isCoach" />
    <LearnerNavbar v-else />
    <v-main class="default-layout-main coach-layout">
      <div v-if="showAppLoader" class="app-loader">
        <div class="app-loader-panel">
          <v-progress-circular indeterminate size="48" width="4" color="#1c7c7d" />
          <div class="app-loader-title">Chargement de votre espace</div>
          <div class="app-loader-text">Vérification du profil en cours.</div>
        </div>
      </div>
      <template v-else>
        <div v-if="auth.user && !auth.emailVerified" class="email-verification-notice">
          <v-icon size="15" aria-hidden="true">mdi-email-outline</v-icon>
          <span>Adresse e-mail à vérifier.</span>
          <router-link :to="ROUTE_PATHS.settings">Vérifier</router-link>
        </div>
        <CoachJourneyBar v-if="isCoach" :key="auth.user?.uid" />
        <LearnerJourneyBar v-else :key="auth.user?.uid" />
        <router-view />
      </template>
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import LearnerNavbar from '@/components/LearnerNavbar.vue'
import CoachNavbar from '@/components/CoachNavbar.vue'
import CoachJourneyBar from '@/components/CoachJourneyBar.vue'
import LearnerJourneyBar from '@/components/LearnerJourneyBar.vue'
import { isCoachProfile } from '@/utils/profile'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'

const auth = useAuthStore()
const isCoach = computed(() => isCoachProfile(auth.profile))

const showAppLoader = computed(
  () => auth.loading || (!!auth.user && (!auth.profileLoaded || auth.profileSyncing))
)
</script>

<style scoped>
.email-verification-notice { max-width: 1152px; margin: 12px auto 0; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 7px; color: #69746d; font-size: 12px; line-height: 1.5; }
.email-verification-notice a { color: #52675d; text-underline-offset: 3px; }
@media(max-width: 1200px) { .email-verification-notice { margin-inline: 24px; } }
.coach-layout {
  background: #f4f0e8 !important;
}
.coach-layout :deep(.profile-view),
.coach-layout :deep(.preferences-view) { background: transparent; max-width: 1200px; margin: auto; }
.coach-layout :deep(.profile-view__backdrop),
.coach-layout :deep(.preferences-view__backdrop) { display: none; }
.coach-layout :deep(.profile-hero),
.coach-layout :deep(.preferences-hero),
.coach-layout :deep(.profile-panel),
.coach-layout :deep(.preferences-panel) { background: #fffdf8; border: 1px solid #24443f20; box-shadow: none !important; border-radius: 16px; }
.coach-layout :deep(.chat-container) { background: transparent; max-width: 1200px; margin: auto; }
.coach-layout :deep(.chat-backdrop),
.coach-layout :deep(.chat-sidebar-subtitle) { display: none; }
.coach-layout :deep(.chat-hero-card) { padding: 0; background: none; border: 0; box-shadow: none; }
.coach-layout :deep(.chat-hero-title) { color: #24443f; font-size: 32px; font-weight: 600; }
.coach-layout :deep(.chat-grid > .v-col),
.coach-layout :deep(.chat-hero > .v-col) { flex: 0 0 100%; max-width: 100%; }
.default-layout-main {
  position: relative;
  background:
    radial-gradient(42rem 42rem at 6% 4%, rgba(191, 102, 72, 0.13), transparent 58%),
    radial-gradient(46rem 46rem at 96% 0%, rgba(22, 79, 69, 0.14), transparent 56%),
    linear-gradient(180deg, #fffaf4 0%, #f6eee4 52%, #efe5da 100%);
}

.app-shell-art {
  position: fixed;
  right: -80px;
  bottom: -80px;
  width: min(42vw, 560px);
  aspect-ratio: 1;
  opacity: 0.72;
  pointer-events: none;
  z-index: 0;
}

.app-shell-art__disc,
.app-shell-art__line {
  position: absolute;
  display: block;
}

.app-shell-art__disc {
  border-radius: 999px;
}

.app-shell-art__disc--forest {
  inset: 8% 0 0 22%;
  background: rgba(22, 79, 69, 0.12);
}

.app-shell-art__disc--coral {
  width: 34%;
  aspect-ratio: 1;
  left: 0;
  top: 18%;
  background: rgba(191, 102, 72, 0.12);
}

.app-shell-art__line {
  width: 82%;
  height: 82%;
  right: 4%;
  top: 2%;
  border: 1px solid rgba(191, 102, 72, 0.22);
  border-radius: 999px;
}

.app-loader {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.app-loader-panel {
  min-width: min(420px, 100%);
  padding: 32px 28px;
  border-radius: 24px;
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(42, 36, 29, 0.08);
  box-shadow: 0 24px 56px rgba(60, 43, 24, 0.12);
  backdrop-filter: blur(18px);
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.app-loader-title {
  font-size: 20px;
  font-weight: 700;
  color: #102d2c;
}

.app-loader-text {
  font-size: 14px;
  color: rgba(48, 51, 48, 0.68);
}

@media (max-width: 960px) {
  .app-shell-art {
    display: none;
  }
}
</style>

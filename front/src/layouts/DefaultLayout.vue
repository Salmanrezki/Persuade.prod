<template>
  <v-app>
    <AppNavbar />
    <v-main class="default-layout-main">
      <div v-if="showAppLoader" class="app-loader">
        <div class="app-loader-panel">
          <v-progress-circular indeterminate size="48" width="4" color="#1c7c7d" />
          <div class="app-loader-title">Chargement de votre espace</div>
          <div class="app-loader-text">Vérification du profil en cours.</div>
        </div>
      </div>
      <router-view v-else />
    </v-main>
    <AppDevelopmentNotice v-if="!showAppLoader" />
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import AppDevelopmentNotice from '@/components/AppDevelopmentNotice.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const showAppLoader = computed(
  () => auth.loading || (!!auth.user && (!auth.profileLoaded || auth.profileSyncing))
)
</script>

<style scoped>
.default-layout-main {
  background:
    radial-gradient(circle at top left, rgba(28, 124, 125, 0.14), transparent 30%),
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.12), transparent 26%),
    linear-gradient(180deg, #f8f5ee 0%, #f2efe8 100%);
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
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: none;
  backdrop-filter: blur(12px);
  display: grid;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.app-loader-title {
  font-size: 20px;
  font-weight: 700;
  color: #133a3b;
}

.app-loader-text {
  font-size: 14px;
  color: rgba(19, 58, 59, 0.66);
}
</style>

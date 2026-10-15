<script setup>
import { useAuthStore } from '@/stores/auth'
import { isCoachProfile } from '@/utils/profile'
import HomeView from './LearnerWorkspaceView.vue'
import CoachWorkspaceView from './CoachWorkspaceView.vue'
const auth = useAuthStore()
</script>
<template>
  <CoachWorkspaceView v-if="isCoachProfile(auth.profile)" /><HomeView v-else />
</template>

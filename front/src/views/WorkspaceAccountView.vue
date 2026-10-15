<script setup>
import { useAuthStore } from '@/stores/auth'
import { isCoachProfile } from '@/utils/profile'
import CoachAccountView from './CoachAccountView.vue'
import ProfileView from './ProfileView.vue'
import PreferencesView from './PreferencesView.vue'
defineProps({ page: { type: String, default: 'profile' } })
const auth = useAuthStore()
</script>
<template>
  <CoachAccountView
    v-if="isCoachProfile(auth.profile)"
    :key="page"
    :page="page"
  /><PreferencesView v-else-if="page === 'preferences'" /><ProfileView v-else />
</template>

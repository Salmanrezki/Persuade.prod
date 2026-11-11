<script setup>
import { ref } from 'vue'
import api from '@/services/api'
const props = defineProps({ appointment: { type: Object, required: true } })
const emit = defineEmits(['accepted'])
const busy = ref(false),
  error = ref('')
async function accept() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const { data } = await api.patch(
      `/follow-up/appointments/${encodeURIComponent(props.appointment.id)}/accept`,
    )
    emit('accepted', data)
    window.dispatchEvent(new Event('appointments-updated'))
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Impossible d’accepter le cours. Réessayez.'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div v-if="appointment.status === 'requested'" class="accept-appointment">
    <v-btn
      color="#24443f"
      prepend-icon="mdi-check"
      :loading="busy"
      @click="accept"
      >Accepter le cours</v-btn
    >
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.accept-appointment {
  margin: 8px 0;
}
.accept-appointment p {
  color: #a52b2b;
  margin-top: 8px;
  font-size: 13px;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
</style>

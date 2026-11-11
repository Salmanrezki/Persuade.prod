<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
const props = defineProps({ appointment: { type: Object, required: true } })
const now = ref(Date.now())
let timer
onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => window.clearInterval(timer))
const start = computed(() => Date.parse(props.appointment.startAt))
const visible = computed(
  () =>
    props.appointment.status === 'scheduled' &&
    now.value < start.value + Number(props.appointment.durationMinutes) * 60000,
)
const ready = computed(() => now.value >= start.value)
</script>
<template>
  <v-btn
    v-if="visible"
    :to="{ name: 'appointment-video', params: { id: appointment.id } }"
    :color="ready ? '#24443f' : undefined"
    :variant="ready ? 'flat' : 'tonal'"
    prepend-icon="mdi-video-outline"
    size="small"
    class="video-button"
  >
    {{ ready ? 'Rejoindre la visio' : 'Préparer la visio' }}
  </v-btn>
  <div v-else-if="appointment.status === 'requested'">
    <v-btn
      disabled
      prepend-icon="mdi-video-outline"
      size="small"
      class="video-button"
      >Rejoindre la visio</v-btn
    >
    <span class="video-pending"
      >Visio disponible après acceptation du coach</span
    >
  </div>
</template>
<style scoped>
.video-button {
  margin: 6px 0;
  text-transform: none;
  letter-spacing: 0;
}
.video-pending {
  display: block;
  font-size: 12px;
  color: #617368;
  margin: 6px 0;
}
</style>

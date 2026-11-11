<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import api from '@/services/api'
import AppointmentVideoButton from '@/components/AppointmentVideoButton.vue'
import AcceptAppointmentButton from '@/components/AcceptAppointmentButton.vue'
import { useAppointmentRefresh } from '@/composables/useAppointmentRefresh'
const props = defineProps({ coach: Boolean })
const items = ref([]),
  loading = ref(true),
  error = ref(''),
  now = ref(Date.now())
let clock,
  pending = false,
  disposed = false
const visible = computed(() =>
  items.value
    .filter(
      (item) =>
        ['requested', 'scheduled'].includes(item.status) &&
        Date.parse(item.startAt) + Number(item.durationMinutes) * 60000 >
          now.value,
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
)
async function refresh() {
  if (pending) return
  pending = true
  try {
    const { data } = await api.get(
      `/follow-up/${props.coach ? 'appointments' : 'learner-appointments'}`,
    )
    if (!disposed) {
      items.value = data
      error.value = ''
    }
  } catch {
    if (!disposed)
      error.value = 'Impossible d’actualiser les rendez-vous. Réessayez.'
  } finally {
    pending = false
    loading.value = false
  }
}
function accepted(data) {
  items.value = items.value.map((item) => (item.id === data.id ? data : item))
}
useAppointmentRefresh(refresh)
onMounted(() => {
  void refresh()
  clock = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  disposed = true
  window.clearInterval(clock)
})
</script>
<template>
  <section class="appointment-access" aria-label="Mes cours en visio">
    <header>
      <div>
        <h2>Mes cours en visio</h2>
        <p>Retrouvez ici vos séances en cours, à venir et à confirmer.</p>
      </div>
      <v-btn
        variant="text"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="refresh"
        >Actualiser</v-btn
      >
    </header>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{
      error
    }}</v-alert>
    <article v-for="item in visible" :key="item.id">
      <div class="appointment-copy">
        <h3>{{ item.title }}</h3>
        <p>
          {{
            coach ? item.clientName || 'Apprenant' : item.coachName || 'Coach'
          }}
          ·
          {{
            new Date(item.startAt).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          }}
          · {{ item.durationMinutes }} min
        </p>
        <span>{{
          item.status === 'requested'
            ? coach
              ? 'À accepter'
              : 'En attente de l’acceptation du coach'
            : Date.parse(item.startAt) <= now
              ? 'Séance en cours'
              : 'Cours confirmé'
        }}</span>
      </div>
      <div class="appointment-actions">
        <AcceptAppointmentButton
          v-if="coach"
          :appointment="item"
          @accepted="accepted"
        /><AppointmentVideoButton :appointment="item" />
      </div>
    </article>
    <p v-if="!loading && !error && !visible.length">
      Aucun cours en visio en cours ou à venir.
    </p>
  </section>
</template>
<style scoped>
.appointment-access {
  padding: 24px;
  margin-bottom: 26px;
  border: 1px solid #c9dbce;
  border-radius: 18px;
  background: #f2f6ee;
  color: #24443f;
}
header,
article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
header {
  margin-bottom: 12px;
}
h2 {
  font-size: 22px;
}
h3 {
  font-size: 16px;
}
p {
  color: #617368;
  font-size: 13px;
  line-height: 1.6;
}
article {
  padding: 16px 0;
  border-top: 1px solid #24443f18;
}
.appointment-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}
.appointment-copy span {
  font-size: 12px;
}
.appointment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
@media (max-width: 650px) {
  header,
  article {
    align-items: flex-start;
    flex-direction: column;
  }
  .appointment-access {
    padding: 18px;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'

const props = defineProps({
  clients: Array,
  courses: Array,
  masterclasses: Array,
  selected: Object,
})
const emit = defineEmits(['select-client'])
const appointments = ref([])
const loading = ref(false),
  error = ref(''),
  success = ref('')
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = () => dayKey(new Date())
const selectedDay = ref(today())
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const onlySelected = ref(false)
const kind = ref('all')
const monthLabel = computed(() =>
  month.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
)
const dayLabel = computed(() =>
  new Date(`${selectedDay.value}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
)
const activeClients = computed(() =>
  props.clients
    .filter((c) => c.status === 'accepted')
    .map((c) => ({ ...c, label: c.clientName || c.clientEmail || 'Élève' })),
)
const events = computed(() =>
  [
    ...appointments.value.map((a) => ({
      ...a,
      kind: a.courseId ? 'course' : 'followup',
    })),
    ...props.masterclasses
      .filter((m) => m.status !== 'draft')
      .map((m) => ({
        ...m,
        id: `masterclass-${m.id}`,
        startAt: m.scheduleAt,
        kind: 'masterclass',
      })),
  ]
    .filter((e) => Number.isFinite(Date.parse(e.startAt)))
    .filter((e) => kind.value === 'all' || e.kind === kind.value)
    .filter(
      (e) =>
        !onlySelected.value ||
        !props.selected ||
        e.clientId === props.selected.clientId,
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
)
const eventsByDay = computed(() => {
  const result = {}
  for (const event of events.value)
    (result[dayKey(new Date(event.startAt))] ||= []).push(event)
  return result
})
const days = computed(() => {
  const first = new Date(month.value)
  first.setDate(1 - ((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first)
    date.setDate(date.getDate() + index)
    const key = dayKey(date)
    return {
      key,
      date,
      current: date.getMonth() === month.value.getMonth(),
      events: eventsByDay.value[key] || [],
    }
  })
})
const dayEvents = computed(() => eventsByDay.value[selectedDay.value] || [])
const labels = {
  followup: 'Suivi élève',
  course: 'Cours',
  masterclass: 'Masterclass',
}
const statuses = {
  requested: 'À confirmer',
  scheduled: 'Planifié',
  completed: 'Terminé',
  cancelled: 'Annulé',
}
const time = (value) =>
  new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
function moveMonth(offset) {
  month.value = new Date(
    month.value.getFullYear(),
    month.value.getMonth() + offset,
    1,
  )
  selectedDay.value = dayKey(month.value)
}
function goToday() {
  month.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  selectedDay.value = today()
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    appointments.value = (await api.get('/follow-up/appointments')).data
  } catch {
    error.value = 'Les rendez-vous n’ont pas pu être chargés.'
  } finally {
    loading.value = false
  }
}
const dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  editId = ref(null),
  form = ref({})
function openForm(event = null) {
  editId.value = event?.id || null
  formError.value = ''
  if (event) {
    const date = new Date(event.startAt)
    form.value = {
      ...event,
      startAt: `${dayKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    }
  } else {
    form.value = {
      followupId:
        props.selected?.status === 'accepted' ? props.selected.id : null,
      courseId: '',
      title: 'Point de suivi',
      startAt: `${selectedDay.value}T09:00`,
      durationMinutes: 30,
      notes: '',
      status: 'scheduled',
    }
  }
  dialog.value = true
}
async function save() {
  if (
    !form.value.followupId ||
    !form.value.title?.trim() ||
    !Number.isFinite(Date.parse(form.value.startAt)) ||
    !Number.isInteger(Number(form.value.durationMinutes)) ||
    Number(form.value.durationMinutes) < 5 ||
    Number(form.value.durationMinutes) > 480
  ) {
    formError.value =
      'Renseignez l’élève, le titre, la date et une durée entre 5 et 480 minutes.'
    return
  }
  saving.value = true
  formError.value = ''
  success.value = ''
  try {
    const payload = {
      ...form.value,
      courseId: form.value.courseId || '',
      durationMinutes: Number(form.value.durationMinutes),
      startAt: new Date(form.value.startAt).toISOString(),
    }
    const { data } = await api[editId.value ? 'patch' : 'post'](
      `/follow-up/appointments${editId.value ? '/' + editId.value : ''}`,
      payload,
    )
    appointments.value = [
      ...appointments.value.filter((a) => a.id !== data.id),
      data,
    ]
    const date = new Date(data.startAt)
    selectedDay.value = dayKey(date)
    month.value = new Date(date.getFullYear(), date.getMonth(), 1)
    onlySelected.value = false
    kind.value = 'all'
    dialog.value = false
    success.value = 'Rendez-vous enregistré.'
  } catch (err) {
    formError.value =
      err.response?.data?.message || 'L’enregistrement a échoué. Réessayez.'
  } finally {
    saving.value = false
  }
}
function selectClient(event) {
  const client = props.clients.find((c) => c.id === event.followupId)
  if (client) emit('select-client', client)
}
onMounted(load)
</script>

<template>
  <section class="calendar" aria-label="Calendrier du suivi client">
    <header class="calendar-header">
      <div>
        <h2>Calendrier du suivi</h2>
        <p>Vos cours, masterclass et rendez-vous élèves au même endroit.</p>
      </div>
      <v-btn
        color="#24443f"
        prepend-icon="mdi-plus"
        :disabled="loading || !!error || !activeClients.length"
        @click="openForm()"
        >Planifier un rendez-vous</v-btn
      >
    </header>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4"
      >{{ error }}
      <v-btn variant="text" @click="load">Réessayer</v-btn></v-alert
    >
    <v-alert
      v-if="success"
      type="success"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="success = ''"
      >{{ success }}</v-alert
    >
    <v-progress-linear
      v-if="loading"
      indeterminate
      aria-label="Chargement du calendrier"
    />
    <div class="toolbar">
      <div class="month-nav">
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          aria-label="Mois précédent"
          @click="moveMonth(-1)"
        />
        <h3 aria-live="polite">{{ monthLabel }}</h3>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          aria-label="Mois suivant"
          @click="moveMonth(1)"
        />
        <v-btn variant="text" @click="goToday">Aujourd’hui</v-btn>
      </div>
      <v-select
        v-model="kind"
        :items="[
          { title: 'Tous les événements', value: 'all' },
          { title: 'Suivis élèves', value: 'followup' },
          { title: 'Cours', value: 'course' },
          { title: 'Masterclass', value: 'masterclass' },
        ]"
        label="Afficher"
        variant="outlined"
        density="compact"
        hide-details
        class="type-filter"
      />
    </div>
    <v-checkbox
      v-if="selected"
      v-model="onlySelected"
      :label="`Uniquement ${selected.clientName || selected.clientEmail || 'cet élève'}`"
      hide-details
      density="compact"
    />
    <div class="calendar-layout">
      <div>
        <div class="weekdays">
          <span
            v-for="day in [
              'Lun.',
              'Mar.',
              'Mer.',
              'Jeu.',
              'Ven.',
              'Sam.',
              'Dim.',
            ]"
            :key="day"
            >{{ day }}</span
          >
        </div>
        <div class="month-grid">
          <button
            v-for="day in days"
            :key="day.key"
            class="day"
            :class="{
              muted: !day.current,
              chosen: day.key === selectedDay,
              today: day.key === today(),
            }"
            :aria-pressed="day.key === selectedDay"
            :aria-label="`${day.date.toLocaleDateString('fr-FR')}, ${day.events.length} événement(s)`"
            @click="selectedDay = day.key"
          >
            <span class="day-number">{{ day.date.getDate() }}</span>
            <span
              v-for="event in day.events.slice(0, 2)"
              :key="event.id"
              class="event-chip"
              :class="[event.kind, { cancelled: event.status === 'cancelled' }]"
              >{{ time(event.startAt) }} {{ event.title }}</span
            >
            <small v-if="day.events.length > 2"
              >+{{ day.events.length - 2 }} autres</small
            >
            <span v-if="day.events.length" class="mobile-count"
              >{{ day.events.length }} év.</span
            >
          </button>
        </div>
        <div class="legend">
          <span class="followup">● Suivi élève</span
          ><span class="course">● Cours</span
          ><span class="masterclass">● Masterclass</span>
        </div>
      </div>
      <aside class="agenda" aria-live="polite">
        <h3>{{ dayLabel }}</h3>
        <p v-if="!dayEvents.length" class="empty">
          {{
            loading
              ? 'Chargement…'
              : error
                ? 'Les rendez-vous sont indisponibles.'
                : 'Aucun événement pour cette journée avec ces filtres.'
          }}
        </p>
        <article
          v-for="event in dayEvents"
          :key="event.id"
          class="agenda-event"
        >
          <div class="event-meta">
            <span>{{ labels[event.kind] }}</span
            ><span>{{ statuses[event.status] || 'Planifié' }}</span>
          </div>
          <h4>{{ event.title }}</h4>
          <p>
            {{ time(event.startAt)
            }}<template v-if="event.durationMinutes">
              · {{ event.durationMinutes }} min</template
            >
          </p>
          <p v-if="event.clientName">{{ event.clientName }}</p>
          <p v-if="event.courseTitle">Cours : {{ event.courseTitle }}</p>
          <p v-if="event.notes" class="notes">{{ event.notes }}</p>
          <template v-if="event.kind !== 'masterclass'">
            <v-btn variant="text" size="small" @click="selectClient(event)"
              >Fiche élève</v-btn
            >
            <v-btn variant="text" size="small" @click="openForm(event)"
              >Modifier</v-btn
            >
          </template>
          <v-btn
            v-else
            variant="text"
            size="small"
            :to="{
              path: ROUTE_PATHS.coachContent,
              query: { tab: 'masterclasses' },
            }"
            >Voir la masterclass</v-btn
          >
        </article>
      </aside>
    </div>
    <p v-if="!activeClients.length" class="empty">
      Acceptez une demande de suivi pour planifier un rendez-vous avec un élève.
    </p>
    <v-dialog v-model="dialog" max-width="600" :persistent="saving">
      <v-card class="appointment-editor">
        <h2>
          {{ editId ? 'Modifier le rendez-vous' : 'Planifier un rendez-vous' }}
        </h2>
        <form @submit.prevent="save">
          <v-select
            v-model="form.followupId"
            :items="activeClients"
            item-title="label"
            item-value="id"
            label="Élève suivi"
            variant="outlined"
            required
          />
          <v-text-field
            v-model="form.title"
            label="Objet du rendez-vous"
            maxlength="180"
            variant="outlined"
            required
          />
          <v-select
            v-model="form.courseId"
            :items="courses"
            item-title="title"
            item-value="id"
            label="Cours associé (facultatif)"
            clearable
            variant="outlined"
          />
          <v-text-field
            v-model="form.startAt"
            type="datetime-local"
            label="Date et heure (heure locale)"
            variant="outlined"
            required
          />
          <v-text-field
            v-model.number="form.durationMinutes"
            type="number"
            min="5"
            max="480"
            step="1"
            label="Durée en minutes"
            variant="outlined"
            required
          />
          <v-select
            v-model="form.status"
            :items="[
              { title: 'À confirmer', value: 'requested' },
              { title: 'Planifié / confirmé', value: 'scheduled' },
              { title: 'Terminé', value: 'completed' },
              { title: 'Annulé', value: 'cancelled' },
            ]"
            label="Statut"
            variant="outlined"
          />
          <v-textarea
            v-model="form.notes"
            label="Notes de suivi"
            rows="3"
            maxlength="5000"
            variant="outlined"
          />
          <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">{{
            formError
          }}</v-alert>
          <div class="form-actions">
            <v-btn variant="text" :disabled="saving" @click="dialog = false"
              >Fermer</v-btn
            ><v-btn type="submit" color="#24443f" :loading="saving"
              >Enregistrer</v-btn
            >
          </div>
        </form>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.calendar {
  margin-bottom: 32px;
  padding: 24px;
  border: 1px solid #24443f26;
  border-radius: 16px;
  background: #fffdf8;
  color: #24443f;
}
.calendar-header,
.toolbar,
.month-nav,
.legend,
.form-actions,
.event-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.calendar-header,
.toolbar,
.event-meta {
  justify-content: space-between;
}
.calendar-header p,
.empty {
  color: #68736c;
  font-size: 14px;
  margin: 8px 0;
}
h2 {
  font-size: 20px;
}
h3 {
  font-size: 16px;
}
h4 {
  overflow-wrap: anywhere;
}
.toolbar {
  margin: 24px 0 12px;
}
.month-nav h3 {
  min-width: 140px;
  text-align: center;
  text-transform: capitalize;
}
.type-filter {
  max-width: 240px;
  min-width: 190px;
}
.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 24px;
  margin-top: 16px;
}
.weekdays,
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}
.weekdays {
  text-align: center;
  font-size: 12px;
  padding-bottom: 12px;
}
.month-grid {
  gap: 3px;
}
.day {
  min-width: 0;
  min-height: 96px;
  padding: 6px;
  border: 1px solid #24443f15;
  border-radius: 7px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.day:hover {
  background: #f3f4ed;
}
.day.chosen {
  border-color: #24443f;
  background: #edf0e9;
}
.day.muted {
  color: #7c847f;
  background: #f6f5f0;
}
.day-number {
  font-size: 13px;
}
.today .day-number {
  background: #24443f;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  text-align: center;
  line-height: 24px;
}
.event-chip {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  border-radius: 4px;
  padding: 3px;
  background: #e6eee7;
}
.course {
  color: #995132;
}
.event-chip.course {
  background: #f8e8dc;
}
.masterclass {
  color: #65538c;
}
.event-chip.masterclass {
  background: #eee8f6;
}
.cancelled {
  text-decoration: line-through;
  opacity: 0.65;
}
.legend {
  font-size: 12px;
  margin-top: 14px;
}
.agenda {
  border-left: 1px solid #24443f20;
  padding-left: 20px;
}
.agenda h3 {
  text-transform: capitalize;
  margin-bottom: 18px;
}
.agenda-event {
  padding: 16px 0;
  border-top: 1px solid #24443f20;
}
.agenda-event p {
  font-size: 13px;
  margin: 6px 0;
}
.event-meta {
  font-size: 11px;
  color: #68736c;
  margin-bottom: 8px;
}
.notes {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.appointment-editor {
  padding: 24px;
}
.appointment-editor h2 {
  margin-bottom: 24px;
}
.form-actions {
  justify-content: flex-end;
}
.mobile-count {
  display: none;
}
button:focus-visible {
  outline: 2px solid #b55d3f;
  outline-offset: 2px;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
@media (max-width: 960px) {
  .calendar-layout {
    grid-template-columns: 1fr;
  }
  .agenda {
    border-left: 0;
    padding-left: 0;
  }
}
@media (max-width: 600px) {
  .calendar {
    padding: 14px;
  }
  .day {
    min-height: 58px;
    padding: 4px;
  }
  .event-chip,
  .day small {
    display: none;
  }
  .mobile-count {
    display: block;
    font-size: 10px;
  }
  .month-nav {
    gap: 0;
  }
  .type-filter {
    max-width: 100%;
  }
  .calendar-header .v-btn {
    width: 100%;
    font-size: 12px;
  }
}
</style>

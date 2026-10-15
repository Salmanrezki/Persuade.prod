<script setup>
import { computed, ref, watch } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
const props = defineProps({ appointments: { type: Array, default: () => [] }, loading: Boolean, error: Boolean })
const emit = defineEmits(['refresh'])
const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const now = ref(new Date())
watch(() => props.appointments, () => { now.value = new Date() })
const month = ref(new Date(now.value.getFullYear(), now.value.getMonth(), 1)), selectedDay = ref(null)
const monthLabel = computed(() => month.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
const active = computed(() => props.appointments.filter(item => ['scheduled', 'requested'].includes(item.status) && Number.isFinite(Date.parse(item.startAt))).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)))
const upcoming = computed(() => active.value.filter(item => Date.parse(item.startAt) + Number(item.durationMinutes || 0) * 60000 >= now.value.getTime()))
const byDay = computed(() => {
  const groups = {}
  for (const item of active.value) (groups[dayKey(new Date(item.startAt))] ||= []).push(item)
  return groups
})
const days = computed(() => {
  const first = new Date(month.value)
  first.setDate(1 - (first.getDay() + 6) % 7)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first); date.setDate(date.getDate() + index)
    return { key: dayKey(date), date, current: date.getMonth() === month.value.getMonth(), items: byDay.value[dayKey(date)] || [] }
  })
})
const agenda = computed(() => selectedDay.value ? byDay.value[selectedDay.value] || [] : upcoming.value.slice(0, 3))
const agendaTitle = computed(() => selectedDay.value ? new Date(`${selectedDay.value}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Mes prochains rendez-vous')
const time = value => new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
function moveMonth(offset) { month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1); selectedDay.value = null }
function today() { now.value = new Date(); month.value = new Date(now.value.getFullYear(), now.value.getMonth(), 1); selectedDay.value = null }
function refresh() { now.value = new Date(); emit('refresh') }
</script>
<template>
  <section class="appointment-calendar" aria-label="Mon calendrier de coaching" :aria-busy="loading">
    <header class="calendar-heading"><div><span class="eyebrow">Coaching</span><h2>Mes rendez-vous</h2><p>Consultez vos prochaines séances et leur statut.</p></div><v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="refresh">Actualiser</v-btn></header>
    <div class="calendar-layout">
      <div class="mini-calendar">
        <div class="month-heading"><v-btn icon="mdi-chevron-left" variant="text" size="small" aria-label="Mois précédent" @click="moveMonth(-1)" /><h3 aria-live="polite">{{ monthLabel }}</h3><v-btn icon="mdi-chevron-right" variant="text" size="small" aria-label="Mois suivant" @click="moveMonth(1)" /></div>
        <div class="weekdays"><span v-for="(label, index) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="index">{{ label }}</span></div>
        <div class="month-days"><button v-for="day in days" :key="day.key" :class="{ outside: !day.current, selected: selectedDay === day.key, today: day.key === dayKey(now) }" :aria-pressed="selectedDay === day.key" :aria-label="`${day.date.toLocaleDateString('fr-FR')}, ${day.items.length} rendez-vous`" @click="selectedDay = day.key"><span>{{ day.date.getDate() }}</span><span class="dots" aria-hidden="true"><i v-if="day.items.some(item => item.status === 'scheduled')" class="confirmed"></i><i v-if="day.items.some(item => item.status === 'requested')" class="pending"></i></span></button></div>
        <div class="calendar-footer"><span><i class="confirmed"></i>Confirmé</span><span><i class="pending"></i>À confirmer</span><button @click="today">Aujourd’hui</button></div>
      </div>
      <div class="agenda" aria-live="polite"><div class="agenda-heading"><h3>{{ agendaTitle }}</h3><button v-if="selectedDay" @click="selectedDay = null">À venir</button><span v-else class="count">{{ loading ? '…' : upcoming.length }} à venir</span></div>
        <p v-if="loading && !agenda.length" class="empty">Chargement de vos rendez-vous…</p>
        <p v-else-if="error && !agenda.length" class="empty">Les données sont incomplètes. Actualisez pour retrouver vos rendez-vous.</p>
        <div v-else-if="!agenda.length" class="empty"><v-icon size="32" aria-hidden="true">mdi-calendar-blank-outline</v-icon><p>{{ selectedDay ? 'Aucun rendez-vous prévu ce jour-là.' : 'Votre prochain rendez-vous apparaîtra ici.' }}</p><small v-if="!selectedDay">Sélectionnez un coach puis proposez une date après son accord de suivi.</small></div>
        <article v-for="item in agenda" :key="item.id" class="agenda-item"><div class="date-tile"><strong>{{ new Date(item.startAt).getDate() }}</strong><small>{{ new Date(item.startAt).toLocaleDateString('fr-FR', { month: 'short' }) }}</small></div><div class="event-copy"><h4>{{ item.title }}</h4><p>{{ item.coachName || 'Coach' }} · {{ time(item.startAt) }} · {{ item.durationMinutes }} min</p><span class="event-status" :class="{ pending: item.status === 'requested' }">{{ item.status === 'requested' ? 'En attente du coach' : 'Confirmé' }}</span></div><v-btn :to="{ path: ROUTE_PATHS.chat, query: { contact: item.coachId } }" icon="mdi-message-outline" variant="text" size="small" :aria-label="`Écrire à ${item.coachName || 'ce coach'}`" /></article>
        <p v-if="!selectedDay && upcoming.length > 3" class="more">Et {{ upcoming.length - 3 }} autre(s) rendez-vous. Sélectionnez une date pour les consulter.</p>
      </div>
    </div>
  </section>
</template>
<style scoped>
.appointment-calendar { padding: 26px; margin-bottom: 30px; border: 1px solid #d5e1d8; background: linear-gradient(125deg, #edf3e9, #f9f7ef); border-radius: 18px; color: #24443f; }.calendar-heading, .agenda-heading, .month-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.calendar-heading { margin-bottom: 24px; flex-wrap: wrap; }.eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #526c53; font-weight: 700; }h2 { font-size: 22px; margin: 5px 0 8px; }h3 { font-size: 15px; font-weight: 600; }h4 { font-size: 14px; overflow-wrap: anywhere; }p { color: #617367; font-size: 13px; line-height: 1.6; }.calendar-layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 28px; }.mini-calendar { background: #fffdf8; border: 1px solid #24443f15; border-radius: 14px; padding: 14px; }.month-heading { margin-bottom: 12px; }.month-heading h3 { text-transform: capitalize; }.weekdays, .month-days { display: grid; grid-template-columns: repeat(7,minmax(0,1fr)); text-align: center; gap: 3px; }.weekdays { font-size: 11px; color: #748075; padding-bottom: 8px; }.month-days button { height: 36px; border-radius: 8px; font-size: 12px; position: relative; border: 1px solid transparent; }.month-days button:hover { background: #edf3e9; }.month-days .outside { color: #858b85; }.month-days .today { border-color: #9cb6a1; font-weight: 700; }.month-days .selected { background: #24443f; color: white; }.dots { display: flex; justify-content: center; gap: 3px; height: 5px; }i { display: inline-block; width: 5px; height: 5px; border-radius: 50%; }.confirmed { background: #4a7c60; }i.pending { background: #bd7546; }.selected .confirmed { background: #b9d7c0; }.selected i.pending { background: #ffd1aa; }.calendar-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; font-size: 10px; color: #68736c; }.calendar-footer i { margin-right: 4px; }.calendar-footer button, .agenda-heading button { text-decoration: underline; text-underline-offset: 3px; }.agenda-heading { margin: 5px 0 16px; flex-wrap: wrap; }.agenda-heading h3 { text-transform: capitalize; }.agenda-heading button { font-size: 12px; }.count { font-size: 11px; border-radius: 20px; background: #ffffffb3; padding: 5px 10px; }.agenda-item { display: flex; align-items: center; gap: 14px; padding: 16px 0; border-bottom: 1px solid #24443f15; }.date-tile { display: grid; text-align: center; min-width: 52px; padding: 8px; border-radius: 10px; background: #fffdf8; }.date-tile strong { font-size: 22px; font-weight: 600; }.date-tile small { font-size: 10px; color: #68736c; }.event-copy { flex: 1; min-width: 0; }.event-copy p { margin: 4px 0 7px; }.event-status { display: inline-block; font-size: 10px; background: #dfebdf; color: #35644e; padding: 3px 8px; border-radius: 20px; }.event-status.pending { background: #fae9d7; color: #90542f; }.empty { text-align: center; padding: 28px 12px; color: #6b7b6d; }.empty p { margin: 10px 0; }.empty small, .more { font-size: 12px; }.more { margin-top: 16px; }button:focus-visible { outline: 2px solid #b55d3f; outline-offset: 2px; }:deep(.v-btn) { text-transform: none; letter-spacing: 0; }@media(max-width: 820px) { .calendar-layout { grid-template-columns: 1fr; gap: 20px; }.mini-calendar { max-width: 360px; width: 100%; margin: auto; } }@media(max-width: 600px) { .appointment-calendar { padding: 18px; }h2 { font-size: 19px; }.agenda-item { gap: 10px; } }
</style>

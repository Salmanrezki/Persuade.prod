<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'
import CoachPublicDetails from '@/components/CoachPublicDetails.vue'
import LearnerExercises from '@/components/LearnerExercises.vue'
import LearnerAppointmentCalendar from '@/components/LearnerAppointmentCalendar.vue'
import {
  recordViewedCourse,
  getViewedCourses,
  getExerciseProgress,
  cacheLearningProgress,
} from '@/services/learningActivityService'

const props = defineProps({ page: { type: String, default: 'dashboard' } })
const failedCoachPhotos = ref({})
function showCoachDirectory() {
  coachingTab.value = 'directory'
  search.value = ''
}
const auth = useAuthStore(),
  route = useRoute()
const courses = ref([]),
  masterclasses = ref([]),
  exercises = ref([]),
  coaches = ref([]),
  followups = ref([]),
  appointments = ref([]),
  registrations = ref([])
const viewed = ref([]),
  exerciseProgress = ref({ completed: {}, notes: {} })
const loading = ref(true),
  error = ref(''),
  success = ref(''),
  busy = ref(false),
  search = ref('')
const tab = ref('courses'),
  coachingTab = ref('selected')
watch(
  () => route.query.tab,
  (value) => {
    tab.value = value === 'masterclasses' ? value : 'courses'
    coachingTab.value = value === 'directory' ? 'directory' : 'selected'
  },
  { immediate: true },
)
watch(
  () => props.page,
  () => {
    search.value = ''
    success.value = ''
    detail.value = null
  },
)
const titles = {
  dashboard: 'Dashboard',
  formation: 'Formation',
  exercises: 'Exercices',
  coaching: 'Coaching',
}
const subtitles = {
  dashboard: 'Retrouvez votre progression et vos prochains rendez-vous.',
  formation:
    'Apprenez à votre rythme et participez aux prochaines masterclass.',
  exercises: 'Mettez vos acquis en pratique avec les exercices de vos coachs.',
  coaching: 'Choisissez vos coachs et organisez votre accompagnement.',
}
const activeFollowups = computed(() =>
  followups.value.filter((f) => f.status === 'accepted'),
)
const completedCount = computed(
  () =>
    Object.values(exerciseProgress.value.completed || {}).filter(Boolean)
      .length,
)
const videoCourses = computed(() =>
  courses.value.filter(
    (c) => c.coachingMode === 'video' || (c.type === 'library' && c.videoUrl),
  ),
)
const filtered = (items) =>
  items.filter((item) =>
    `${item.title || ''} ${item.description || ''} ${item.firstname || ''} ${item.coachProfile?.headline || ''}`
      .toLowerCase()
      .includes(search.value.trim().toLowerCase()),
  )
const contentItems = computed(() =>
  filtered(
    props.page === 'exercises'
      ? exercises.value
      : tab.value === 'courses'
        ? videoCourses.value
        : masterclasses.value,
  ),
)
const selectedCoaches = computed(() =>
  coaches.value.filter((c) =>
    followups.value.some(
      (f) => f.coachId === c.uid && ['pending', 'accepted'].includes(f.status),
    ),
  ),
)
const displayedCoaches = computed(() =>
  filtered(
    coachingTab.value === 'selected' ? selectedCoaches.value : coaches.value,
  ),
)
const followupFor = (coach) =>
  followups.value.find(
    (f) =>
      f.coachId === coach.uid && ['pending', 'accepted'].includes(f.status),
  )
const registrationFor = (item) =>
  registrations.value.find((r) => r.masterclassId === item.id)
const date = (value) =>
  Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Date à préciser'
const statusLabels = {
  requested: 'À confirmer par le coach',
  scheduled: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
}
const coachName = (item) =>
  item.coachName ||
  followups.value.find((f) => f.coachId === item.coachId)?.coachName ||
  coaches.value.find((c) => c.uid === item.coachId)?.firstname ||
  'Coach'
const sortedAppointments = computed(() =>
  [...appointments.value].sort(
    (a, b) => Date.parse(b.startAt) - Date.parse(a.startAt),
  ),
)
const nextEvents = computed(() =>
  [
    ...appointments.value
      .filter((a) => ['requested', 'scheduled'].includes(a.status))
      .map((a) => ({
        ...a,
        path: ROUTE_PATHS.coachCourses,
        label: statusLabels[a.status],
      })),
    ...masterclasses.value
      .filter((m) => registrationFor(m) && m.status !== 'cancelled')
      .map((m) => ({
        ...m,
        startAt: m.scheduleAt,
        path: ROUTE_PATHS.courses,
        query: { tab: 'masterclasses' },
        label: 'Masterclass · Inscrit',
      })),
  ]
    .filter((e) => Date.parse(e.startAt) >= Date.now())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
)
const safeUrl = (value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
async function load() {
  loading.value = true
  error.value = ''
  const sources = [
    ['/courses', courses, 'cours'],
    ['/masterclasses', masterclasses, 'masterclass'],
    ['/exercises', exercises, 'exercices'],
    ['/users?role=coach', coaches, 'coachs'],
    ['/follow-up/me', followups, 'suivis'],
    ['/follow-up/learner-appointments', appointments, 'rendez-vous'],
    ['/masterclasses/registrations/me', registrations, 'inscriptions'],
  ]
  const results = await Promise.allSettled([
    ...sources.map(([url]) => api.get(url)),
    api.get('/users/progress/me'),
  ])
  const failures = []
  sources.forEach(([, target, label], index) => {
    if (results[index].status === 'fulfilled')
      target.value = results[index].value.data
    else failures.push(label)
  })
  const progress = results.at(-1)
  if (progress.status === 'fulfilled') {
    viewed.value = progress.value.data.viewedCourses || []
    exerciseProgress.value = progress.value.data.practicalExercises || {
      completed: {},
      notes: {},
    }
    cacheLearningProgress(auth.user?.uid, progress.value.data)
  } else {
    viewed.value = getViewedCourses(auth.user?.uid)
    exerciseProgress.value = getExerciseProgress(auth.user?.uid)
    failures.push('progression synchronisée')
  }
  if (failures.length)
    error.value = `Chargement incomplet : ${failures.join(', ')}. Réessayez pour actualiser ces données.`
  loading.value = false
}
const detail = ref(null),
  detailKind = ref('course'),
  note = ref('')
function openDetail(item, kind) {
  detail.value = item
  detailKind.value = kind
  note.value = exerciseProgress.value.notes?.[item.id] || ''
}
function viewCourse(item) {
  recordViewedCourse(auth.user?.uid, item)
  viewed.value = [
    { id: item.id, title: item.title },
    ...viewed.value.filter((c) => c.id !== item.id),
  ]
}
async function saveExercise(completed) {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    const next = {
      ...exerciseProgress.value,
      completed: {
        ...exerciseProgress.value.completed,
        [detail.value.id]: completed,
      },
      notes: { ...exerciseProgress.value.notes, [detail.value.id]: note.value },
    }
    await api.put('/users/progress/me', {
      viewedCourses: viewed.value,
      practicalExercises: next,
    })
    exerciseProgress.value = next
    cacheLearningProgress(auth.user?.uid, {
      viewedCourses: viewed.value,
      practicalExercises: next,
    })
    success.value = 'Progression enregistrée.'
    detail.value = null
  } catch {
    error.value = 'Impossible d’enregistrer votre progression. Réessayez.'
  } finally {
    busy.value = false
  }
}
async function selectCoach(coach) {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    const { data } = await api.post('/follow-up', {
      coachId: coach.uid,
      message: 'Je souhaite être accompagné par ce coach.',
    })
    followups.value = [data, ...followups.value]
    success.value =
      'Demande de suivi envoyée. Vous pourrez proposer un rendez-vous après acceptation du coach.'
  } catch (err) {
    error.value =
      err.response?.status === 409
        ? 'Une demande existe déjà pour ce coach. Actualisez la page.'
        : 'La demande de suivi n’a pas pu être envoyée.'
  } finally {
    busy.value = false
  }
}
async function register(item) {
  busy.value = true
  error.value = ''
  success.value = ''
  try {
    const existing = registrationFor(item)
    if (existing) {
      await api.delete(`/masterclasses/registrations/${existing.id}`)
      registrations.value = registrations.value.filter(
        (r) => r.id !== existing.id,
      )
      success.value = 'Inscription annulée.'
    } else {
      const { data } = await api.post(`/masterclasses/${item.id}/register`)
      registrations.value.push(data)
      success.value = 'Votre inscription est confirmée.'
    }
  } catch {
    error.value =
      'Impossible de modifier l’inscription. La masterclass peut être complète ou les inscriptions closes.'
  } finally {
    busy.value = false
  }
}
const booking = ref(false),
  bookingError = ref(''),
  bookingForm = ref({})
function openBooking(followup = activeFollowups.value[0]) {
  bookingForm.value = {
    followupId: followup?.id,
    title: '',
    startAt: '',
    durationMinutes: 30,
  }
  bookingError.value = ''
  booking.value = true
}
async function book() {
  bookingError.value = ''
  if (
    !bookingForm.value.followupId ||
    !bookingForm.value.title.trim() ||
    !Number.isFinite(Date.parse(bookingForm.value.startAt)) ||
    Date.parse(bookingForm.value.startAt) <= Date.now()
  ) {
    bookingError.value = 'Choisissez un coach, un objet et une date à venir.'
    return
  }
  busy.value = true
  try {
    const { data } = await api.post('/follow-up/learner-appointments', {
      ...bookingForm.value,
      startAt: new Date(bookingForm.value.startAt).toISOString(),
    })
    appointments.value.push(data)
    booking.value = false
    success.value =
      'Rendez-vous demandé. Le coach doit encore confirmer le créneau.'
  } catch {
    bookingError.value =
      'Impossible de demander ce rendez-vous. Vérifiez votre suivi et réessayez.'
  } finally {
    busy.value = false
  }
}
async function cancelAppointment(item) {
  busy.value = true
  error.value = ''
  try {
    await api.patch(`/follow-up/learner-appointments/${item.id}/cancel`)
    item.status = 'cancelled'
    success.value = 'Rendez-vous annulé.'
  } catch {
    error.value = 'Impossible d’annuler ce rendez-vous.'
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>

<template>
  <main class="learner-workspace" :class="{ 'formation-workspace': page === 'formation', 'coaching-workspace': page === 'coaching' }">
    <header class="page-heading">
      <div>
        <h1>{{ titles[page] }}</h1>
        <p>{{ subtitles[page] }}</p>
      </div>
      <div v-if="page === 'coaching'" class="coaching-header-actions">
      <v-btn :to="ROUTE_PATHS.chat" variant="outlined" color="#24443f" prepend-icon="mdi-message-outline">
        Mes messages <span v-if="auth.chatUnreadCount" class="messages-count" :aria-label="`${auth.chatUnreadCount} messages non lus`">{{ auth.chatUnreadCount }}</span>
      </v-btn>
      <v-btn
        color="#b55d3f"
        elevation="0"
        prepend-icon="mdi-calendar-plus"
        :disabled="loading || !activeFollowups.length"
        @click="openBooking()"
        >Demander un rendez-vous</v-btn
      >
      </div>
    </header>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="#24443f"
      aria-label="Chargement"
      class="mb-5"
    />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-5"
      >{{ error
      }}<v-btn variant="text" :disabled="loading" @click="load"
        >Réessayer</v-btn
      ></v-alert
    >
    <v-alert
      v-if="success"
      type="success"
      variant="tonal"
      closable
      class="mb-5"
      @click:close="success = ''"
      >{{ success }}</v-alert
    >

    <template v-if="page === 'dashboard'">
      <div class="metrics">
        <router-link :to="ROUTE_PATHS.courses" class="metric metric--courses"
          ><span class="metric-label">Cours consultés<v-icon size="22" aria-hidden="true">mdi-play-circle-outline</v-icon></span
          ><strong>{{ loading ? '—' : viewed.length }}</strong
          ><small>Continuer à apprendre →</small></router-link
        >
        <router-link :to="ROUTE_PATHS.practicalExercises" class="metric metric--exercises"
          ><span class="metric-label">Exercices terminés<v-icon size="22" aria-hidden="true">mdi-check-circle-outline</v-icon></span
          ><strong>{{ loading ? '—' : completedCount }}</strong
          ><small>Passer à la pratique →</small></router-link
        >
        <router-link :to="ROUTE_PATHS.coachCourses" class="metric metric--coaches"
          ><span class="metric-label">Coachs qui me suivent<v-icon size="22" aria-hidden="true">mdi-account-heart-outline</v-icon></span
          ><strong>{{ loading ? '—' : activeFollowups.length }}</strong
          ><small>Mon accompagnement →</small></router-link
        >
        <router-link :to="ROUTE_PATHS.coachCourses" class="metric metric--events"
          ><span class="metric-label">Événements à venir<v-icon size="22" aria-hidden="true">mdi-calendar-outline</v-icon></span
          ><strong>{{ loading ? '—' : nextEvents.length }}</strong
          ><small>Consulter mon agenda →</small></router-link
        >
      </div>
      <div class="dashboard-grid">
        <section class="panel">
          <div class="section-heading">
            <h2>Mes prochains événements</h2>
            <v-btn variant="text" size="small" :to="ROUTE_PATHS.coachCourses"
              >Mon coaching</v-btn
            >
          </div>
          <router-link
            v-for="event in nextEvents.slice(0, 5)"
            :key="`${event.path}-${event.id}`"
            :to="{ path: event.path, query: event.query }"
            class="list-row"
            ><span class="icon-box"><v-icon>mdi-calendar-outline</v-icon></span>
            <div>
              <h3>{{ event.title }}</h3>
              <p>{{ date(event.startAt) }}</p>
              <small>{{ event.label }}</small>
            </div></router-link
          >
          <div v-if="!loading && !nextEvents.length" class="empty">
            <v-icon size="32">mdi-calendar-blank-outline</v-icon>
            <p>Aucun événement prévu.</p>
            <v-btn
              variant="text"
              :to="{
                path: ROUTE_PATHS.courses,
                query: { tab: 'masterclasses' },
              }"
              >Découvrir les masterclass</v-btn
            >
          </div>
        </section>
        <section class="panel">
          <div class="section-heading">
            <h2>Reprendre ma formation</h2>
            <v-btn variant="text" size="small" :to="ROUTE_PATHS.courses"
              >Tous les cours</v-btn
            >
          </div>
          <button
            v-for="course in viewed.slice(0, 4)"
            :key="course.id"
            class="list-row full-row"
            @click="
              openDetail(
                courses.find((c) => c.id === course.id) || course,
                'course',
              )
            "
          >
            <span class="icon-box"
              ><v-icon>mdi-play-circle-outline</v-icon></span
            >
            <div>
              <h3>{{ course.title }}</h3>
              <small>Cours consulté</small>
            </div>
            <v-icon class="ml-auto">mdi-chevron-right</v-icon>
          </button>
          <div v-if="!loading && !viewed.length" class="empty">
            <v-icon size="32">mdi-play-circle-outline</v-icon>
            <p>Votre parcours commence ici.</p>
            <v-btn variant="text" :to="ROUTE_PATHS.courses"
              >Choisir mon premier cours</v-btn
            >
          </div>
          <div class="goal">
            <h3>Mon objectif</h3>
            <p>
              {{
                auth.profile?.primaryGoal ||
                'Renseignez votre objectif dans votre profil pour personnaliser votre parcours.'
              }}
            </p>
            <router-link :to="ROUTE_PATHS.profile">Mon profil</router-link>
          </div>
        </section>
      </div>
    </template>

    <LearnerExercises v-else-if="page === 'exercises'" :exercises="exercises" :loading="loading" @saved="load" />
    <template v-else-if="page === 'formation'">
      <div
        v-if="page === 'formation'"
        class="content-tabs"
        role="tablist"
        aria-label="Type de formation"
      >
        <button
          role="tab"
          :aria-selected="tab === 'courses'"
          :class="{ active: tab === 'courses' }"
          @click="tab = 'courses'"
        >
          Cours <span>{{ videoCourses.length }}</span></button
        ><button
          role="tab"
          :aria-selected="tab === 'masterclasses'"
          :class="{ active: tab === 'masterclasses' }"
          @click="tab = 'masterclasses'"
        >
          Masterclass <span>{{ masterclasses.length }}</span>
        </button>
      </div>
      <v-text-field
        v-model="search"
        :label="
          page === 'exercises'
            ? 'Rechercher un exercice'
            : 'Rechercher une formation'
        "
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        class="search-field"
      />
      <div class="content-grid">
        <article
          v-for="item in contentItems"
          :key="item.id"
          class="content-card formation-card"
          :class="{ 'formation-card--live': tab === 'masterclasses' }"
        >
          <div class="card-top">
            <span class="icon-box"
              ><v-icon size="28">{{
                page === 'exercises'
                  ? 'mdi-pencil-outline'
                  : tab === 'courses'
                    ? 'mdi-play-circle-outline'
                    : 'mdi-calendar-outline'
              }}</v-icon></span
            ><small>{{
              page === 'formation' && tab === 'masterclasses'
                ? date(item.scheduleAt)
                : item.duration
            }}</small>
          </div>
          <span class="formation-format">{{ tab === 'courses' ? 'Cours vidéo' : 'Masterclass' }}</span>
          <h2>{{ item.title }}</h2>
          <p class="description">{{ item.description }}</p>
          <div class="card-footer" v-if="page === 'exercises'">
            <span class="status">{{
              exerciseProgress.completed?.[item.id] ? 'Terminé' : 'À pratiquer'
            }}</span
            ><v-btn
              variant="text"
              color="#24443f"
              @click="openDetail(item, 'exercise')"
              >{{
                exerciseProgress.completed?.[item.id] ? 'Revoir' : 'Commencer'
              }}</v-btn
            >
          </div>
          <div class="card-footer" v-else-if="tab === 'courses'">
            <span class="status">{{
              viewed.some((c) => c.id === item.id) ? 'Consulté' : 'À découvrir'
            }}</span
            ><v-btn
              variant="text"
              color="#24443f"
              @click="openDetail(item, 'course')"
              >Voir le cours</v-btn
            >
          </div>
          <div class="card-footer" v-else>
            <span class="status">{{
              item.status === 'cancelled'
                ? 'Annulée'
                : registrationFor(item)
                  ? 'Inscrit'
                  : Date.parse(item.scheduleAt) < Date.now()
                    ? 'Passée'
                    : 'À venir'
            }}</span
            ><v-btn
              variant="text"
              color="#24443f"
              @click="openDetail(item, 'masterclass')"
              >Consulter</v-btn
            >
          </div>
        </article>
      </div>
      <section v-if="!loading && !contentItems.length" class="panel empty">
        <v-icon size="36">mdi-book-open-page-variant-outline</v-icon>
        <p>
          {{
            search
              ? 'Aucun résultat pour cette recherche.'
              : page === 'exercises'
                ? 'Les exercices publiés par vos coachs apparaîtront ici.'
                : 'Aucune formation disponible pour le moment.'
          }}
        </p>
      </section>
    </template>

    <template v-else-if="page === 'coaching'">
      <LearnerAppointmentCalendar :appointments="appointments.map(item => ({ ...item, coachName: coachName(item) }))" :loading="loading" :error="!!error" @refresh="load" />
      <div class="content-tabs" role="tablist" aria-label="Coachs">
        <button
          role="tab"
          :aria-selected="coachingTab === 'selected'"
          :class="{ active: coachingTab === 'selected' }"
          @click="coachingTab = 'selected'"
        >
          Mes coachs <span>{{ selectedCoaches.length }}</span></button
        ><button
          role="tab"
          :aria-selected="coachingTab === 'directory'"
          :class="{ active: coachingTab === 'directory' }"
          @click="coachingTab = 'directory'"
        >
          Trouver un coach
        </button>
      </div>
      <v-text-field
        v-model="search"
        label="Rechercher un coach"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        class="search-field"
      />
      <div class="content-grid">
        <article
          v-for="coach in displayedCoaches"
          :key="coach.uid"
          class="content-card"
        >
          <div class="card-top">
            <span class="avatar coach-photo">
              <img
                v-if="coach.profilePhoto && failedCoachPhotos[coach.uid] !== coach.profilePhoto"
                :src="coach.profilePhoto"
                :alt="`Photo de ${coach.firstname || 'votre coach'}`"
                loading="lazy"
                @error="failedCoachPhotos[coach.uid] = coach.profilePhoto"
              />
              <span v-else>{{ (coach.firstname || 'C').slice(0, 1).toUpperCase() }}</span>
            </span
            ><span v-if="followupFor(coach)" class="status">{{
              followupFor(coach).status === 'accepted'
                ? 'Suivi actif'
                : 'Demande en attente'
            }}</span>
          </div>
          <h2>{{ coach.firstname || 'Coach' }}</h2>
          <CoachPublicDetails :profile="coach.coachProfile || {}" compact />
          <div class="coach-actions">
            <v-btn
              variant="text"
              color="#24443f"
              @click="openDetail(coach, 'coach')"
              >Voir le profil</v-btn
            ><v-btn
              v-if="!followupFor(coach)"
              color="#24443f"
              :disabled="busy"
              @click="selectCoach(coach)"
              >Sélectionner</v-btn
            ><v-btn
              v-else-if="followupFor(coach).status === 'accepted'"
              color="#24443f"
              @click="openBooking(followupFor(coach))"
              >Rendez-vous</v-btn
            ><v-btn
              v-if="followupFor(coach)"
              variant="text"
              :to="{ path: ROUTE_PATHS.chat, query: { contact: coach.uid } }"
              >Écrire</v-btn
            >
          </div>
        </article>
      </div>
      <section v-if="!loading && !displayedCoaches.length" class="panel empty">
        <v-icon size="36">mdi-account-group-outline</v-icon>
        <p>
          {{
            search
              ? 'Aucun coach ne correspond à votre recherche.'
              : coachingTab === 'selected'
                ? 'Sélectionnez un coach pour commencer votre accompagnement.'
                : 'Aucun coach disponible pour le moment.'
          }}
        </p>
        <v-btn
          v-if="coachingTab === 'selected'"
          variant="outlined"
          @click="showCoachDirectory"
          >Trouver un coach</v-btn
        >
      </section>
      <section class="panel appointments">
        <div class="section-heading">
          <div>
            <h2>Mes rendez-vous</h2>
            <p>
              Retrouvez ici les séances proposées et confirmées par vos coachs.
            </p>
          </div>
          <v-btn
            variant="text"
            :disabled="loading"
            prepend-icon="mdi-refresh"
            @click="load"
            >Actualiser</v-btn
          >
        </div>
        <div
          v-for="item in sortedAppointments"
          :key="item.id"
          class="list-row appointment-row"
        >
          <span class="icon-box"><v-icon>mdi-calendar-outline</v-icon></span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>
              {{ coachName(item) }} · {{ date(item.startAt) }} ·
              {{ item.durationMinutes }} min
            </p>
            <small>{{ statusLabels[item.status] || item.status }}</small>
            <p v-if="item.courseTitle">{{ item.courseTitle }}</p>
          </div>
          <v-btn
            v-if="['requested', 'scheduled'].includes(item.status)"
            variant="text"
            :disabled="busy"
            class="ml-auto"
            @click="cancelAppointment(item)"
            >Annuler</v-btn
          >
        </div>
        <p v-if="!loading && !appointments.length" class="empty">
          Aucun rendez-vous pour le moment. Après acceptation de votre suivi,
          proposez une date à votre coach.
        </p>
      </section>
    </template>

    <v-dialog
      :model-value="!!detail"
      max-width="700"
      :persistent="busy"
      @update:model-value="
        (value) => {
          if (!value) detail = null
        }
      "
      ><v-card v-if="detail" class="editor"
        ><div class="section-heading">
          <h2>{{ detail.title || detail.firstname || 'Coach' }}</h2>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Fermer"
            :disabled="busy"
            @click="detail = null"
          />
        </div>
        <template v-if="detailKind === 'coach'"
          ><CoachPublicDetails :profile="detail.coachProfile || {}" /><v-btn
            v-if="!followupFor(detail)"
            color="#24443f"
            :disabled="busy"
            @click="selectCoach(detail)"
            >Sélectionner ce coach</v-btn
          >
          <p v-else class="mt-4">
            {{
              followupFor(detail).status === 'accepted'
                ? 'Ce coach vous accompagne.'
                : 'Votre demande attend la réponse du coach.'
            }}
          </p></template
        >
        <template v-else
          ><p class="detail-copy">{{ detail.description }}</p>
          <template v-if="detailKind === 'course'"
            ><v-btn
              v-if="safeUrl(detail.videoUrl)"
              :href="safeUrl(detail.videoUrl)"
              target="_blank"
              rel="noopener noreferrer"
              color="#24443f"
              prepend-icon="mdi-play"
              @click="viewCourse(detail)"
              >Regarder la vidéo</v-btn
            >
            <p v-else>La vidéo de ce cours n’est pas disponible.</p></template
          >
          <template v-else-if="detailKind === 'exercise'"
            ><h3 class="mb-3">Consignes</h3>
            <p class="detail-copy">{{ detail.instructions }}</p>
            <v-textarea
              v-model="note"
              label="Mes notes personnelles"
              variant="outlined"
              rows="4"
              maxlength="5000"
            />
            <div class="coach-actions">
              <v-btn
                variant="outlined"
                :disabled="busy"
                @click="
                  saveExercise(Boolean(exerciseProgress.completed?.[detail.id]))
                "
                >Enregistrer mes notes</v-btn
              ><v-btn
                color="#24443f"
                :loading="busy"
                @click="saveExercise(!exerciseProgress.completed?.[detail.id])"
                >{{
                  exerciseProgress.completed?.[detail.id]
                    ? 'Marquer à refaire'
                    : 'Marquer comme terminé'
                }}</v-btn
              >
            </div></template
          >
          <template v-else
            ><p class="mb-4">
              {{ date(detail.scheduleAt) }} · {{ detail.duration }}
            </p>
            <p v-if="detail.status === 'cancelled'">
              Cette masterclass est annulée.
            </p>
            <div v-else class="coach-actions">
              <v-btn
                v-if="
                  registrationFor(detail) ||
                  (detail.status === 'scheduled' &&
                    Date.parse(detail.scheduleAt) > Date.now())
                "
                color="#24443f"
                :disabled="busy"
                @click="register(detail)"
                >{{
                  registrationFor(detail)
                    ? 'Annuler mon inscription'
                    : 'M’inscrire'
                }}</v-btn
              ><v-btn
                v-if="registrationFor(detail) && safeUrl(detail.meetingLink)"
                :href="safeUrl(detail.meetingLink)"
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                >Rejoindre la masterclass</v-btn
              >
            </div></template
          >
        </template>
        <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{
          error
        }}</v-alert
        ><v-alert v-if="success" type="success" variant="tonal" class="mt-4">{{
          success
        }}</v-alert>
      </v-card></v-dialog
    >
    <v-dialog v-model="booking" max-width="580" :persistent="busy"
      ><v-card class="editor"
        ><h2 class="mb-3">Demander un rendez-vous</h2>
        <p class="detail-copy">
          Proposez une date à votre coach. Le rendez-vous sera confirmé après
          son accord.
        </p>
        <form @submit.prevent="book">
          <v-select
            v-model="bookingForm.followupId"
            :items="activeFollowups"
            item-title="coachName"
            item-value="id"
            label="Mon coach"
            variant="outlined"
            required
          /><v-text-field
            v-model="bookingForm.title"
            label="Objet de la séance"
            variant="outlined"
            maxlength="180"
            required
          /><v-text-field
            v-model="bookingForm.startAt"
            type="datetime-local"
            label="Date et heure souhaitées (heure locale)"
            variant="outlined"
            required
          /><v-text-field
            v-model.number="bookingForm.durationMinutes"
            type="number"
            min="5"
            max="480"
            step="1"
            label="Durée en minutes"
            variant="outlined"
            required
          /><v-alert
            v-if="bookingError"
            type="error"
            variant="tonal"
            class="mb-4"
            >{{ bookingError }}</v-alert
          >
          <div class="editor-actions">
            <v-btn variant="text" :disabled="busy" @click="booking = false"
              >Fermer</v-btn
            ><v-btn type="submit" color="#b55d3f" :loading="busy"
              >Envoyer la demande</v-btn
            >
          </div>
        </form></v-card
      ></v-dialog
    >
  </main>
</template>

<style scoped>
.coaching-workspace .content-tabs { width: fit-content; max-width: 100%; padding: 5px; gap: 6px; background: #eae8df; border: 1px solid #24443f0d; border-radius: 12px; }
.coaching-workspace .content-tabs button { border: 0; border-radius: 8px; padding: 11px 18px; }.coaching-workspace .content-tabs button.active { background: #fffdf8; color: #24443f; box-shadow: 0 2px 6px #24443f0b; }
.coaching-workspace .content-card { overflow: hidden; transition: border-color .2s, box-shadow .2s; }.coaching-workspace .content-card:hover { border-color: #b9c9b5; box-shadow: 0 8px 24px #24443f0c; }
.coaching-workspace .card-top { margin: -24px -24px 0; padding: 24px; min-height: 112px; background: linear-gradient(120deg, #e8efdf, #f7f5ec); }.coaching-workspace .content-card:nth-child(3n + 2) .card-top { background: linear-gradient(120deg, #ece5f2, #f8f3f8); }.coaching-workspace .content-card:nth-child(3n + 3) .card-top { background: linear-gradient(120deg, #e3edf0, #f3f7f4); }
.coaching-workspace .coach-photo { width: 72px; height: 72px; border: 3px solid #fffdf8; box-shadow: 0 3px 10px #24443f12; }.coaching-workspace .card-top .status { background: #ffffffb3; }.coaching-workspace .coach-actions { padding-top: 16px; border-top: 1px solid #24443f15; gap: 6px; }.coaching-workspace .appointments { border-top: 3px solid #aec7bd; }.coaching-workspace .appointment-row .icon-box { background: #e6efea; color: #35644e; }.coaching-workspace .appointment-row small { display: inline-block; background: #edf0e9; padding: 3px 8px; border-radius: 20px; }
.formation-format { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #45664b; }
.formation-workspace .content-tabs { width: fit-content; max-width: 100%; padding: 5px; gap: 6px; background: #eae8df; border: 1px solid #24443f0d; border-radius: 12px; }
.formation-workspace .content-tabs button { padding: 11px 18px; border: 0; border-radius: 8px; }
.formation-workspace .content-tabs button.active { background: #fffdf8; color: #24443f; box-shadow: 0 2px 6px #24443f0b; }
.formation-workspace .content-tabs span { background: #edf0e9; padding: 2px 7px; border-radius: 20px; }
.formation-workspace .formation-card { overflow: hidden; gap: 16px; transition: border-color .2s, box-shadow .2s; }
.formation-workspace .formation-card:hover { border-color: #a8bda2; box-shadow: 0 8px 24px #24443f0c; }
.formation-card .card-top { margin: -24px -24px 4px; padding: 24px; min-height: 110px; background: linear-gradient(125deg, #e5eedf, #f1f4e9); }
.formation-card--live .card-top { background: linear-gradient(125deg, #e9e2f2, #f6f0f8); }
.formation-card .icon-box { width: 58px; height: 58px; border-radius: 16px; color: #35644e; background: #ffffffb3; }
.formation-card--live .icon-box, .formation-card--live .formation-format { color: #695483; }
.formation-card .card-top small { padding: 5px 10px; border-radius: 20px; background: #ffffffa6; color: #435a4e; text-align: right; }
.formation-card .card-footer .v-btn { background: #edf2e8; }
.formation-card--live .card-footer .v-btn { background: #eee8f5; }
.formation-workspace .empty { border-style: dashed; background: #fffdf8b3; }
@media(max-width: 600px) { .formation-workspace .content-tabs button { padding-inline: 12px; font-size: 12px; } }
.avatar.coach-photo { width: 64px; height: 64px; overflow: hidden; border-radius: 50%; }
.coach-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.coaching-header-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.messages-count { margin-left: 8px; min-width: 20px; padding: 2px 6px; border-radius: 20px; background: #24443f; color: #fffdf8; font-size: 11px; }
.learner-workspace {
  max-width: 1200px;
  margin: auto;
  padding: 40px 24px 72px;
  color: #24443f;
}
.page-heading,
.section-heading,
.card-top,
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.page-heading {
  margin-bottom: 30px;
}
.page-heading p,
.section-heading p {
  color: #68736c;
  font-size: 14px;
  margin-top: 8px;
  line-height: 1.6;
}
h1 {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.04em;
}
h2 {
  font-size: 18px;
  font-weight: 600;
}
h3 {
  font-size: 15px;
  font-weight: 600;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.metric,
.panel,
.content-card {
  border: 1px solid #24443f1a;
  background: #fffdf8;
  border-radius: 16px;
}
.metric {
  padding: 24px;
  color: inherit;
  text-decoration: none;
  display: grid;
  gap: 18px;
}
.metric:hover {
  border-color: #b55d3f;
}
.metric span,
.metric small {
  font-size: 13px;
  color: #64726b;
}
.metric strong {
  font-size: 36px;
  font-weight: 500;
}
.metric--courses {
  --metric-accent: #35644e;
  --metric-tint: #e8f0e6;
}
.metric--exercises {
  --metric-accent: #9b5037;
  --metric-tint: #faeadd;
}
.metric--coaches {
  --metric-accent: #695483;
  --metric-tint: #eee8f5;
}
.metric--events {
  --metric-accent: #356575;
  --metric-tint: #e6eff3;
}
.metric {
  background: linear-gradient(135deg, var(--metric-tint), #fffdf8);
  border-top: 3px solid var(--metric-accent);
  transition: border-color .2s ease, box-shadow .2s ease;
}
.metric:hover {
  border-color: var(--metric-accent);
  box-shadow: 0 6px 18px #24443f0c;
}
.metric strong,
.metric .metric-label .v-icon {
  color: var(--metric-accent);
}
.metric .metric-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #40564c;
}
.metric-label .v-icon {
  flex-shrink: 0;
}
.dashboard-grid > .panel:first-child {
  border-top: 3px solid #aac5ce;
}
.dashboard-grid > .panel:last-child {
  border-top: 3px solid #afc6a8;
}
.dashboard-grid > .panel:first-child .icon-box {
  color: #356575;
  background: #e6eff3;
}
.dashboard-grid > .panel:last-child .icon-box {
  color: #35644e;
  background: #e8f0e6;
}
.dashboard-grid .goal {
  background: #f6eddc;
  border: 1px solid #e8d7b6;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}
.panel {
  padding: 24px;
}
.section-heading {
  margin-bottom: 22px;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 16px;
  border-top: 1px solid #24443f12;
  padding: 18px 0;
  text-decoration: none;
  color: inherit;
}
.list-row p,
.list-row small {
  color: #6d756f;
  font-size: 13px;
  margin-top: 5px;
}
.full-row {
  width: 100%;
  text-align: left;
}
.full-row:hover {
  background: #edf0e966;
}
.avatar,
.icon-box {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: #edf0e9;
  border-radius: 12px;
}
.icon-box {
  background: #f6e8df;
  color: #b55d3f;
}
.empty {
  padding: 40px 24px;
  font-size: 14px;
  color: #747b73;
  text-align: center;
}
.empty p {
  margin: 16px 0;
}
.goal {
  background: #edf0e9;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}
.goal p {
  font-size: 14px;
  margin: 10px 0;
  line-height: 1.6;
}
.goal a {
  color: #24443f;
  font-size: 13px;
}
.content-tabs {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  border-bottom: 1px solid #24443f22;
  margin-bottom: 28px;
}
.content-tabs button {
  padding: 12px 0;
  white-space: nowrap;
  border-bottom: 3px solid transparent;
  font-size: 14px;
}
.content-tabs button.active {
  color: #b55d3f;
  border-color: #b55d3f;
}
.content-tabs span {
  margin-left: 8px;
  font-size: 12px;
}
.search-field {
  max-width: 380px;
  margin-bottom: 24px;
}
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.content-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.content-card h2 {
  overflow-wrap: anywhere;
}
.card-top small {
  color: #68736c;
  font-size: 12px;
}
.description {
  color: #68736c;
  font-size: 14px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  margin-top: auto;
  border-top: 1px solid #24443f15;
  padding-top: 14px;
  gap: 8px;
}
.status {
  font-size: 12px;
  background: #edf0e9;
  padding: 6px 10px;
  border-radius: 20px;
}
.coach-actions,
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.coach-actions {
  margin-top: auto;
}
.appointments {
  margin-top: 28px;
}
.appointment-row {
  flex-wrap: wrap;
}
.editor {
  padding: 28px;
  background: #fffdf8;
  color: #24443f;
}
.detail-copy {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.7;
  font-size: 14px;
  margin-bottom: 24px;
}
.editor-actions {
  justify-content: flex-end;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
  border-radius: 8px;
}
button:focus-visible,
a:focus-visible {
  outline: 2px solid #b55d3f;
  outline-offset: 4px;
}
@media (max-width: 960px) {
  .metrics,
  .content-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 680px) {
  .learner-workspace {
    padding: 28px 16px 48px;
  }
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }
  h1 {
    font-size: 28px;
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
  .metric {
    padding: 18px;
  }
  .panel {
    padding: 20px;
  }
  .section-heading {
    flex-wrap: wrap;
    gap: 10px;
  }
  .metric small {
    line-height: 1.5;
  }
}
</style>

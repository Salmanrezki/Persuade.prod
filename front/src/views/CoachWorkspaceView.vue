<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { notifyCoachJourneyUpdated } from '@/services/coachJourneyService'
import { invalidateContent } from '@/services/contentService'
import { ROUTE_PATHS } from '@/router/paths'
import CoachClientCalendar from '@/components/CoachClientCalendar.vue'
import AppointmentAccessPanel from '@/components/AppointmentAccessPanel.vue'
const props = defineProps({ page: { type: String, default: 'dashboard' } })
const route = useRoute()
const courses = ref([]),
  masterclasses = ref([]),
  exercises = ref([]),
  clients = ref([])
const loading = ref(true),
  error = ref(''),
  saving = ref(false),
  success = ref('')
const search = ref(''),
  selected = ref(null),
  progress = ref(null),
  progressLoading = ref(false),
  progressError = ref('')
const clientCalendar = ref(null)
const clientStatus = ref('all')
const normalizeSearch = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
function createClientAppointment(client) {
  openClient(client)
  clientCalendar.value?.createForClient(client)
}
const tabs = [
  { key: 'courses', label: 'Cours préenregistrés' },
  { key: 'masterclasses', label: 'Masterclass' },
  { key: 'exercises', label: 'Exercices' },
]
const tab = ref('courses')
watch(
  () => route.query.tab,
  (value) => {
    tab.value = tabs.some((t) => t.key === value) ? value : 'courses'
  },
  { immediate: true },
)
const title = computed(
  () =>
    ({ dashboard: 'Vue d’ensemble', clients: 'Mes clients', content: 'Mes contenus' })[
      props.page
    ],
)
const items = computed(
  () =>
    ({
      courses: courses.value.filter((c) => c.coachingMode === 'video'),
      masterclasses: masterclasses.value,
      exercises: exercises.value,
    })[tab.value],
)
const filteredClients = computed(() =>
  clients.value.filter((c) =>
    (clientStatus.value === 'all' || c.status === clientStatus.value) &&
    normalizeSearch(`${c.clientName || ''} ${c.clientEmail || ''}`)
      .includes(normalizeSearch(search.value)),
  ),
)
const upcoming = computed(() =>
  masterclasses.value
    .filter((m) => new Date(m.scheduleAt) > new Date())
    .sort((a, b) => new Date(a.scheduleAt) - new Date(b.scheduleAt)),
)
const pending = computed(() =>
  clients.value.filter((c) => c.status === 'pending'),
)
const formatDate = (value) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Non planifiée'
const statusLabel = (status) =>
  ({ pending: 'En attente', accepted: 'Suivi actif', rejected: 'Refusé' })[
    status
  ] || status
async function load() {
  loading.value = true
  error.value = ''
  const results = await Promise.allSettled(
    [
      '/courses/coach',
      '/masterclasses/coach',
      '/exercises/coach',
      '/follow-up/coach',
    ].map((url) => api.get(url)),
  )
  const targets = [courses, masterclasses, exercises, clients]
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') targets[i].value = result.value.data
    else error.value = 'Certaines données n’ont pas pu être chargées.'
  })
  loading.value = false
}
let progressRequest = 0
async function openClient(client) {
  const request = ++progressRequest
  selected.value = client
  progress.value = null
  progressError.value = ''
  progressLoading.value = false
  if (client.status !== 'accepted') return
  progressLoading.value = true
  try {
    const response = await api.get(`/users/progress/${client.clientId}`)
    if (request === progressRequest) progress.value = response.data
  } catch {
    if (request === progressRequest)
      progressError.value = 'La progression n’a pas pu être chargée.'
  } finally {
    if (request === progressRequest) progressLoading.value = false
  }
}
async function respond(client, status) {
  saving.value = true
  error.value = ''
  try {
    const { data } = await api.patch(`/follow-up/${client.id}`, { status })
    clients.value = clients.value.map((c) => (c.id === data.id ? data : c))
    await openClient(data)
  } catch {
    error.value = 'La demande n’a pas pu être mise à jour.'
  } finally {
    saving.value = false
  }
}
const dialog = ref(false),
  form = ref({}),
  formError = ref(''),
  editId = ref(null),
  formKind = ref('courses')
const actionLabel = computed(
  () =>
    ({
      courses: 'Publier un cours',
      masterclasses: 'Planifier une masterclass',
      exercises: 'Créer un exercice',
    })[tab.value],
)
const dialogTitle = computed(() =>
  editId.value
    ? 'Modifier le contenu'
    : {
        courses: 'Publier un cours',
        masterclasses: 'Planifier une masterclass',
        exercises: 'Créer un exercice',
      }[formKind.value],
)
function openForm(item = null) {
  formKind.value = tab.value
  editId.value = item?.id || null
  formError.value = ''
  form.value = item
    ? JSON.parse(JSON.stringify(item))
    : {
        title: '',
        description: '',
        videoUrl: '',
        duration: '',
        scheduleAt: '',
        meetingLink: '',
        instructions: '',
        capacity: 30,
        assessment: null,
      }
  if (form.value.scheduleAt) {
    const d = new Date(form.value.scheduleAt)
    form.value.scheduleAt = new Date(
      d.getTime() - d.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16)
  }
  dialog.value = true
}
function validUrl(value) {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
async function save() {
  formError.value = ''
  success.value = ''
  if (!form.value.title?.trim() || !form.value.description?.trim()) {
    formError.value = 'Renseignez le titre et la description.'
    return
  }
  if (formKind.value === 'courses' && !validUrl(form.value.videoUrl)) {
    formError.value = 'Ajoutez un lien vidéo HTTP ou HTTPS valide.'
    return
  }
  if (
    formKind.value === 'masterclasses' &&
    (!form.value.scheduleAt || new Date(form.value.scheduleAt) <= new Date())
  ) {
    formError.value = 'Choisissez une date et une heure à venir.'
    return
  }
  if (formKind.value === 'masterclasses' && !validUrl(form.value.meetingLink)) {
    formError.value = 'Ajoutez un lien de visioconférence valide.'
    return
  }
  if (formKind.value === 'exercises' && !form.value.instructions?.trim()) {
    formError.value = 'Renseignez les consignes de l’exercice.'
    return
  }
  saving.value = true
  try {
    const payload = { ...form.value }
    if (formKind.value === 'courses') {
      payload.type = 'coach'
      payload.coachingMode = 'video'
    }
    if (formKind.value === 'masterclasses') {
      payload.scheduleAt = new Date(payload.scheduleAt).toISOString()
      payload.format = 'online'
    }
    const endpoint = `/${formKind.value}${editId.value ? '/' + editId.value : ''}`
    const { data } = await api[editId.value ? 'patch' : 'post'](
      endpoint,
      payload,
    )
    const target = { courses, masterclasses, exercises }[formKind.value]
    target.value = editId.value
      ? target.value.map((item) => (item.id === editId.value ? data : item))
      : [data, ...target.value]
    invalidateContent('courses', 'masterclasses')
    notifyCoachJourneyUpdated()
    dialog.value = false
    success.value = 'Contenu enregistré.'
  } catch (error) {
    formError.value = error.response?.data?.message || 'L’enregistrement a échoué. Réessayez.'
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>

<template>
  <main class="coach-workspace">
    <header class="page-heading">
      <h1>{{ title }}</h1>
      <v-btn
        v-if="page === 'content'"
        color="#b55d3f"
        elevation="0"
        prepend-icon="mdi-plus"
        @click="openForm()"
        >{{ actionLabel }}</v-btn
      >
    </header>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="#24443f"
      aria-label="Chargement"
    />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-5"
      >{{ error }}
      <v-btn variant="text" @click="load">Réessayer</v-btn></v-alert
    >
    <v-alert
      v-if="success && page === 'content'"
      type="success"
      variant="tonal"
      closable
      class="mb-5"
      @click:close="success = ''"
      >{{ success }}</v-alert
    >
    <template v-if="page === 'dashboard'">
      <AppointmentAccessPanel coach />
      <div class="metrics">
        <router-link :to="ROUTE_PATHS.coachClients" class="metric"
          ><span>Clients suivis</span
          ><strong>{{
            loading
              ? '—'
              : clients.filter((c) => c.status === 'accepted').length
          }}</strong></router-link
        >
        <router-link :to="ROUTE_PATHS.coachClients" class="metric"
          ><span>Demandes en attente</span
          ><strong>{{ loading ? '—' : pending.length }}</strong></router-link
        >
        <router-link :to="ROUTE_PATHS.coachContent" class="metric"
          ><span>Cours préenregistrés</span
          ><strong>{{
            loading
              ? '—'
              : courses.filter((c) => c.coachingMode === 'video').length
          }}</strong></router-link
        >
        <router-link
          :to="{
            path: ROUTE_PATHS.coachContent,
            query: { tab: 'masterclasses' },
          }"
          class="metric"
          ><span>Masterclass à venir</span
          ><strong>{{ loading ? '—' : upcoming.length }}</strong></router-link
        >
      </div>
      <div class="dashboard-grid">
        <section class="panel">
          <div class="section-heading">
            <h2>Prochaines masterclass</h2>
            <router-link
              :to="{
                path: ROUTE_PATHS.coachContent,
                query: { tab: 'masterclasses' },
              }"
              >Voir tout</router-link
            >
          </div>
          <div
            v-for="item in upcoming.slice(0, 5)"
            :key="item.id"
            class="list-row"
          >
            <div class="date-icon"><v-icon>mdi-calendar-outline</v-icon></div>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ formatDate(item.scheduleAt) }}</p>
            </div>
          </div>
          <p v-if="!loading && !upcoming.length" class="empty">
            Aucune masterclass planifiée.
          </p>
        </section>
        <section class="panel">
          <div class="section-heading">
            <h2>Demandes de suivi</h2>
            <router-link :to="ROUTE_PATHS.coachClients">Voir tout</router-link>
          </div>
          <div
            v-for="client in pending.slice(0, 5)"
            :key="client.id"
            class="list-row"
          >
            <div class="avatar">
              {{ (client.clientName || 'C').slice(0, 1) }}
            </div>
            <div>
              <h3>{{ client.clientName || client.clientEmail || 'Client' }}</h3>
              <p>En attente</p>
            </div>
          </div>
          <p v-if="!loading && !pending.length" class="empty">
            Aucune demande en attente.
          </p>
        </section>
      </div>
    </template>
    <template v-else-if="page === 'clients'">
      <section class="panel client-directory" aria-labelledby="client-directory-title">
        <div class="section-heading">
          <div>
            <h2 id="client-directory-title">Vos élèves, à portée de main</h2>
            <p class="directory-intro">Retrouvez un client, contactez-le ou planifiez votre prochain échange.</p>
          </div>
          <span class="status">{{ clients.length }} élèves</span>
        </div>
      <v-text-field
        v-model="search"
        label="Rechercher un client par nom ou e-mail"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        clearable
        hide-details
        class="search-field"
      />
      <div class="client-filters" role="group" aria-label="Filtrer les clients">
        <v-btn v-for="filter in [{ value: 'all', label: 'Tous' }, { value: 'accepted', label: 'Suivis actifs' }, { value: 'pending', label: 'En attente' }, { value: 'rejected', label: 'Refusés' }]"
          :key="filter.value" :variant="clientStatus === filter.value ? 'flat' : 'text'"
          color="#24443f" :aria-pressed="clientStatus === filter.value" @click="clientStatus = filter.value">{{ filter.label }}</v-btn>
        <span aria-live="polite">{{ filteredClients.length }} résultat{{ filteredClients.length > 1 ? 's' : '' }}</span>
      </div>
      <div class="clients-grid">
        <section class="client-list" aria-label="Liste des élèves">
          <article
            v-for="client in filteredClients"
            :key="client.id"
            class="client-row"
            :class="{ active: selected?.id === client.id }"
          >
            <button class="client-identity" :aria-pressed="selected?.id === client.id" @click="openClient(client)">
            <span class="avatar">{{
              (client.clientName || 'C').slice(0, 1)
            }}</span
            ><span
              ><strong>{{
                client.clientName || client.clientEmail || 'Client'
              }}</strong
              ><small>{{ client.clientEmail }}</small><small>{{ statusLabel(client.status) }}</small></span>
            </button>
            <div class="client-quick-actions">
              <v-btn :to="{ path: ROUTE_PATHS.chat, query: { contact: client.clientId } }" variant="outlined" color="#24443f" prepend-icon="mdi-message-outline" :aria-label="`Contacter ${client.clientName || client.clientEmail || 'cet élève'}`">Contacter</v-btn>
              <v-btn v-if="client.status === 'accepted'" color="#24443f" prepend-icon="mdi-calendar-plus" @click="createClientAppointment(client)">Créer un RDV</v-btn>
              <v-btn variant="text" @click="openClient(client)">Voir le suivi</v-btn>
            </div>
          </article>
          <p v-if="!loading && !filteredClients.length" class="empty">
            Aucun client{{ search ? ' trouvé' : ' pour le moment' }}.
          </p>
        </section>
        <section v-if="selected" class="panel client-detail" aria-live="polite">
          <template v-if="selected"
            ><div class="section-heading">
              <h2>{{ selected.clientName || 'Client' }}</h2>
              <span class="status">{{ statusLabel(selected.status) }}</span>
            </div>
            <p v-if="selected.message" class="client-message">
              {{ selected.message }}
            </p>
            <div class="actions">
              <v-btn
                :to="{
                  path: ROUTE_PATHS.chat,
                  query: { contact: selected.clientId },
                }"
                variant="outlined"
                color="#24443f"
                prepend-icon="mdi-message-outline"
                >Écrire</v-btn
              ><template v-if="selected.status === 'pending'"
                ><v-btn
                  color="#24443f"
                  :loading="saving"
                  @click="respond(selected, 'accepted')"
                  >Accepter</v-btn
                ><v-btn
                  variant="text"
                  :disabled="saving"
                  @click="respond(selected, 'rejected')"
                  >Refuser</v-btn
                ></template
              >
            </div>
            <v-progress-linear
              v-if="progressLoading"
              indeterminate
              color="#24443f"
              class="mt-6"
            />
            <v-alert
              v-if="progressError"
              type="error"
              variant="tonal"
              class="mt-6"
              >{{ progressError
              }}<v-btn variant="text" @click="openClient(selected)"
                >Réessayer</v-btn
              ></v-alert
            >
            <template v-if="progress"
              ><h3 class="detail-title">Objectif</h3>
              <p>{{ progress.client.primaryGoal || 'Non renseigné' }}</p>
              <h3 class="detail-title">Progression</h3>
              <div class="progress-summary">
                <span
                  ><strong>{{
                    progress.learningProgress.summary?.viewedCoursesCount ??
                    progress.learningProgress.viewedCourses?.length ??
                    0
                  }}</strong>
                  cours consultés</span
                ><span
                  ><strong>{{
                    progress.learningProgress.summary
                      ?.completedExercisesCount ??
                    Object.values(
                      progress.learningProgress.practicalExercises?.completed ||
                        {},
                    ).filter(Boolean).length
                  }}</strong>
                  exercices terminés</span
                >
              </div>
              <div
                v-for="course in progress.learningProgress.viewedCourses || []"
                :key="course.id || course.courseId"
                class="list-row"
              >
                {{ course.title || course.courseTitle }}
              </div></template
            >
          </template>
          <p v-else class="empty">
            Sélectionnez un client pour consulter son suivi.
          </p>
        </section>
      </div>
      </section>
      <AppointmentAccessPanel coach />
      <CoachClientCalendar
        ref="clientCalendar"
        :clients="clients"
        :courses="courses"
        :masterclasses="masterclasses"
        :selected="selected"
        @select-client="openClient"
      />
    </template>
    <template v-else>
      <div class="content-tabs" role="tablist" aria-label="Type de contenu">
        <button
          v-for="item in tabs"
          :key="item.key"
          role="tab"
          :aria-selected="tab === item.key"
          :class="{ active: tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="content-grid">
        <article v-for="item in items" :key="item.id" class="content-card">
          <div class="content-icon">
            <v-icon size="30">{{
              tab === 'courses'
                ? 'mdi-play-circle-outline'
                : tab === 'masterclasses'
                  ? 'mdi-calendar-outline'
                  : 'mdi-pencil-outline'
            }}</v-icon
            ><span>{{
              tab === 'masterclasses'
                ? formatDate(item.scheduleAt)
                : item.duration
            }}</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <div class="card-footer">
            <span>{{
              tab === 'courses'
                ? 'Cours publié'
                : tab === 'masterclasses'
                  ? 'Masterclass'
                  : 'Exercice'
            }}</span
            ><v-btn variant="text" color="#24443f" @click="openForm(item)"
              >Modifier</v-btn
            >
          </div>
        </article>
      </div>
      <section v-if="!loading && !items.length" class="panel empty-content">
        <v-icon size="38" color="#b55d3f">{{
          tab === 'courses'
            ? 'mdi-play-circle-outline'
            : tab === 'masterclasses'
              ? 'mdi-calendar-outline'
              : 'mdi-pencil-outline'
        }}</v-icon>
        <p>
          {{
            tab === 'courses'
              ? 'Aucun cours publié.'
              : tab === 'masterclasses'
                ? 'Aucune masterclass créée.'
                : 'Aucun exercice créé.'
          }}
        </p>
        <v-btn variant="outlined" color="#24443f" @click="openForm()">{{
          actionLabel
        }}</v-btn>
      </section>
    </template>
    <v-dialog v-model="dialog" max-width="640" :persistent="saving"
      ><v-card class="editor"
        ><h2>{{ dialogTitle }}</h2>
        <form @submit.prevent="save">
          <v-text-field
            v-model="form.title"
            label="Titre"
            variant="outlined"
            required
            maxlength="180"
          /><v-textarea
            v-model="form.description"
            label="Description"
            variant="outlined"
            rows="3"
            required
            maxlength="10000"
          /><v-text-field
            v-model="form.duration"
            label="Durée"
            placeholder="30 min"
            variant="outlined"
          />
          <v-text-field
            v-if="formKind === 'courses'"
            v-model="form.videoUrl"
            label="Lien de la vidéo préenregistrée"
            type="url"
            variant="outlined"
            required
          />
          <template v-if="formKind === 'masterclasses'"
            ><v-text-field
              v-model="form.scheduleAt"
              label="Date et heure (heure locale)"
              type="datetime-local"
              variant="outlined"
              required /><v-text-field
              v-model="form.meetingLink"
              label="Lien de visioconférence"
              type="url"
              variant="outlined"
              required /><v-text-field
              v-model.number="form.capacity"
              label="Nombre de places"
              type="number"
              min="1"
              variant="outlined"
              required
          /></template>
          <v-textarea
            v-if="formKind === 'exercises'"
            v-model="form.instructions"
            label="Consignes"
            variant="outlined"
            rows="6"
            required
            maxlength="20000"
          />
          <section v-if="formKind === 'exercises'" class="mb-5">
            <v-switch :model-value="!!form.assessment" label="Exercice noté (QCM)" color="#24443f" @update:model-value="value => form.assessment = value ? { questions: [{ prompt: '', options: ['', ''], correctIndex: 0 }] } : null" />
            <template v-if="form.assessment">
              <p class="mb-4">Chaque question vaut un point. Le score est calculé sur 100.</p>
              <div v-for="(question, index) in form.assessment.questions" :key="index" class="panel mb-4">
                <v-text-field v-model="question.prompt" :label="`Question ${index + 1}`" variant="outlined" maxlength="1000" required />
                <v-text-field v-for="(_, choiceIndex) in question.options" :key="choiceIndex" v-model="question.options[choiceIndex]" :label="`Choix ${choiceIndex + 1}`" variant="outlined" maxlength="500" required />
                <v-select v-model="question.correctIndex" :items="question.options.map((option, choiceIndex) => ({ title: `Choix ${choiceIndex + 1}`, value: choiceIndex }))" label="Bonne réponse" variant="outlined" />
                <v-btn variant="text" :disabled="question.options.length >= 6" @click="question.options.push('')">Ajouter un choix</v-btn>
                <v-btn variant="text" :disabled="form.assessment.questions.length <= 1" @click="form.assessment.questions.splice(index, 1)">Retirer la question</v-btn>
              </div>
              <v-btn variant="outlined" :disabled="form.assessment.questions.length >= 20" @click="form.assessment.questions.push({ prompt: '', options: ['', ''], correctIndex: 0 })">Ajouter une question</v-btn>
            </template>
          </section>
          <v-alert v-if="formError" type="error" variant="tonal" class="mb-4">{{
            formError
          }}</v-alert>
          <div class="editor-actions">
            <v-btn variant="text" :disabled="saving" @click="dialog = false"
              >Annuler</v-btn
            ><v-btn type="submit" color="#b55d3f" :loading="saving">{{
              editId
                ? 'Enregistrer'
                : formKind === 'courses'
                  ? 'Publier'
                  : formKind === 'masterclasses'
                    ? 'Planifier'
                    : 'Créer'
            }}</v-btn>
          </div>
        </form></v-card
      ></v-dialog
    >
  </main>
</template>

<style scoped>
.coach-workspace {
  max-width: 1200px;
  margin: auto;
  padding: 40px 24px 72px;
  color: #24443f;
}
.page-heading,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.page-heading {
  margin-bottom: 30px;
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
  transition: border-color 0.2s;
}
.metric:hover {
  border-color: #b55d3f;
}
.metric span {
  font-size: 13px;
  color: #64726b;
}
.metric strong {
  font-size: 36px;
  font-weight: 500;
}
.metric:nth-child(2) strong {
  color: #b55d3f;
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
.section-heading a {
  font-size: 13px;
  color: #b55d3f;
  white-space: nowrap;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 16px;
  border-top: 1px solid #24443f12;
  padding: 18px 0;
}
.list-row p {
  color: #6d756f;
  font-size: 13px;
  margin-top: 5px;
}
.avatar,
.date-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  background: #edf0e9;
  border-radius: 12px;
}
.date-icon {
  background: #f6e8df;
  color: #b55d3f;
}
.empty {
  padding: 40px 0;
  font-size: 14px;
  color: #747b73;
  text-align: center;
}
.search-field {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
}
.client-directory {
  margin-bottom: 28px;
}
.directory-intro {
  margin-top: 8px;
  color: #68766d;
  font-size: 14px;
}
.client-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}
.client-filters > span {
  margin-left: auto;
  font-size: 13px;
  color: #68766d;
}
.clients-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
.client-list {
  padding: 0;
  align-self: start;
}
.client-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  width: 100%;
  text-align: left;
  border-radius: 10px;
  border-bottom: 1px solid #24443f12;
  justify-content: space-between;
  flex-wrap: wrap;
}
.client-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: inherit;
  min-width: 0;
  flex: 1 1 220px;
}
.client-identity > span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.client-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.client-row.active,
.client-row:hover {
  background: #eef0e8;
}
.client-row strong {
  font-size: 14px;
}
.client-row small {
  display: block;
  margin-top: 4px;
  color: #68766d;
}
.client-row .v-icon {
  margin-left: auto;
}
.status {
  font-size: 12px;
  background: #edf0e9;
  padding: 6px 10px;
  border-radius: 20px;
}
.client-message {
  white-space: pre-wrap;
  margin-bottom: 24px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.detail-title {
  margin: 26px 0 12px;
}
.progress-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 14px;
}
.progress-summary strong {
  font-size: 24px;
  display: block;
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
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.content-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.content-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #b55d3f;
}
.content-icon span {
  font-size: 12px;
  color: #67736b;
}
.content-card h2 {
  overflow-wrap: anywhere;
}
.content-card p {
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
  padding-top: 14px;
  border-top: 1px solid #24443f15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.empty-content {
  text-align: center;
  padding: 64px 24px;
}
.empty-content p {
  margin: 16px 0 24px;
  color: #68736c;
}
.editor {
  padding: 28px;
  background: #fffdf8;
  color: #24443f;
}
.editor h2 {
  margin-bottom: 24px;
}
.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .content-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 680px) {
  .coach-workspace {
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
  .dashboard-grid,
  .clients-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
  .metric {
    padding: 18px;
  }
  .panel {
    padding: 20px;
  }
  .client-list {
    padding: 0;
  }
  .client-row {
    padding: 16px 0;
  }
  .client-quick-actions {
    width: 100%;
  }
  .client-quick-actions .v-btn {
    flex: 1 1 auto;
  }
  .section-heading {
    flex-wrap: wrap;
    gap: 10px;
  }
  .content-tabs {
    gap: 20px;
  }
}
</style>

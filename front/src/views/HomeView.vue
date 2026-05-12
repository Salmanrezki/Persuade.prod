<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import AppNewsCarousel from '@/components/AppNewsCarousel.vue'
import api from '@/services/api'
import { db } from '@/services/firebase'
import { getUserProfile } from '@/services/userService'
import { getCourses, getMasterclasses } from '@/services/contentService'
import { collection, getDocs, query, where } from 'firebase/firestore'

const auth = useAuthStore()
const profile = ref(null)
const loadingProfile = ref(false)
const profileError = ref('')
const courses = ref([])
const masterclasses = ref([])
const conversations = ref([])
const courseRequests = ref([])
const masterclassRegistrations = ref([])

const role = computed(() => profile.value?.role || '—')
const roleLabel = computed(() => {
  if (role.value === 'coach') return 'Coach'
  if (role.value === 'apprenant') return 'Apprenant'
  return role.value
})
const coachApplicationStatus = computed(() => profile.value?.coachApplicationStatus || auth.profile?.coachApplicationStatus || '')
const isCoach = computed(() => role.value === 'coach')
const isCoachPendingReview = computed(() => isCoach.value && coachApplicationStatus.value === 'pending_review')
const accountStatusLabel = computed(() => (isCoachPendingReview.value ? 'En évaluation' : 'Actif'))
const dashboardSummary = computed(() =>
  isCoach.value
    ? 'Suivez vos demandes, vos sessions et vos contenus en un coup d’œil.'
    : 'Retrouvez rapidement vos cours, réservations et échanges essentiels.'
)
const heroMeta = computed(() => [
  { label: 'Rôle', value: roleLabel.value !== '—' ? roleLabel.value : 'Compte' },
  { label: 'Statut', value: accountStatusLabel.value },
])

const toMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value.toMillis) return value.toMillis()
  if (value.seconds) return value.seconds * 1000
  if (value._seconds) return value._seconds * 1000
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const formatRelativeDate = (value) => {
  const millis = toMillis(value)
  if (!millis) return 'Aucune donnée'

  const diff = Date.now() - millis
  const hour = 60 * 60 * 1000
  const day = 24 * hour
  if (diff < hour) return 'Il y a moins d’une heure'
  if (diff < day) return `Il y a ${Math.max(1, Math.floor(diff / hour))}h`
  if (diff < 7 * day) return `Il y a ${Math.max(1, Math.floor(diff / day))}j`
  return new Date(millis).toLocaleDateString('fr-FR')
}

const formatFutureDate = (value) => {
  const millis = toMillis(value)
  if (!millis) return 'Aucune date'
  return new Date(millis).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const buildBars = (items, getTimestamp) => {
  const bucketSize = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const buckets = Array.from({ length: 6 }, () => 0)

  items.forEach((item) => {
    const millis = toMillis(getTimestamp(item))
    if (!millis) return
    const diff = now - millis
    if (diff < 0 || diff >= bucketSize * 6) return
    const bucketIndex = 5 - Math.floor(diff / bucketSize)
    buckets[bucketIndex] += 1
  })

  const max = Math.max(...buckets, 0)
  if (max === 0) return [14, 14, 14, 14, 14, 14]

  return buckets.map((count) => Math.max(14, Math.round((count / max) * 78) + 10))
}

const libraryCourses = computed(() => courses.value.filter((item) => item?.type === 'library' || !item?.coachId))
const coachCourses = computed(() => courses.value.filter((item) => item?.coachId))
const ownedCoachCourses = computed(() => coachCourses.value.filter((item) => item?.coachId === profile.value?.uid))
const ownedMasterclasses = computed(() => masterclasses.value.filter((item) => item?.coachId === profile.value?.uid))
const upcomingOwnedMasterclasses = computed(() =>
  ownedMasterclasses.value.filter((item) => item?.status === 'scheduled' && toMillis(item?.scheduleAt) >= Date.now())
)
const activeLearnerRequests = computed(() =>
  courseRequests.value.filter((item) => ['pending', 'accepted'].includes(item?.status))
)
const pendingCourseRequests = computed(() => courseRequests.value.filter((item) => item?.status === 'pending'))
const pendingRegistrations = computed(() =>
  masterclassRegistrations.value.filter((item) => ['registered', 'pending'].includes(item?.status))
)
const confirmedRegistrations = computed(() =>
  masterclassRegistrations.value.filter((item) => item?.status === 'confirmed')
)
const latestConversation = computed(() =>
  [...conversations.value].sort((a, b) => toMillis(b?.updatedAt || b?.createdAt) - toMillis(a?.updatedAt || a?.createdAt))[0] || null
)
const latestLibraryCourse = computed(() =>
  [...libraryCourses.value].sort((a, b) => toMillis(b?.createdAt || b?.updatedAt) - toMillis(a?.createdAt || a?.updatedAt))[0] || null
)
const latestOwnedCourse = computed(() =>
  [...ownedCoachCourses.value].sort((a, b) => toMillis(b?.createdAt || b?.updatedAt) - toMillis(a?.createdAt || a?.updatedAt))[0] || null
)
const nextRegisteredMasterclass = computed(() =>
  [...masterclassRegistrations.value]
    .filter((item) => item?.status !== 'declined')
    .filter((item) => toMillis(item?.scheduleAt) >= Date.now())
    .sort((a, b) => toMillis(a?.scheduleAt) - toMillis(b?.scheduleAt))[0] || null
)
const nextOwnedMasterclass = computed(() =>
  [...upcomingOwnedMasterclasses.value].sort((a, b) => toMillis(a?.scheduleAt) - toMillis(b?.scheduleAt))[0] || null
)
const latestDemand = computed(() =>
  [...courseRequests.value, ...masterclassRegistrations.value]
    .sort((a, b) => toMillis(b?.updatedAt || b?.createdAt) - toMillis(a?.updatedAt || a?.createdAt))[0] || null
)

const levelPriority = {
  Débutant: 1,
  'Tous niveaux': 2,
  Intermédiaire: 3,
  Avancé: 4,
}

const sortedLibraryCourses = computed(() =>
  [...libraryCourses.value].sort((left, right) => {
    const featuredDelta = Number(Boolean(right?.featured)) - Number(Boolean(left?.featured))
    if (featuredDelta !== 0) return featuredDelta

    const levelDelta = (levelPriority[left?.level] || 99) - (levelPriority[right?.level] || 99)
    if (levelDelta !== 0) return levelDelta

    return toMillis(right?.createdAt || right?.updatedAt) - toMillis(left?.createdAt || left?.updatedAt)
  })
)

const learnerGuidedPaths = computed(() => {
  if (isCoach.value) return []

  const buildPath = ({ id, title, subtitle, tone, levels }) => {
    const matches = sortedLibraryCourses.value.filter((course) => levels.includes(course?.level || 'Tous niveaux'))
    const spotlight = matches[0] || null

    if (!spotlight) return null

    return {
      id,
      title,
      subtitle,
      tone,
      spotlight,
      total: matches.length,
      items: matches.slice(0, 3),
    }
  }

  return [
    buildPath({
      id: 'commencer',
      title: 'Commencer',
      subtitle: 'Les bases pour poser un cadre clair et progresser rapidement.',
      tone: 'teal',
      levels: ['Débutant', 'Tous niveaux'],
    }),
    buildPath({
      id: 'continuer',
      title: 'Continuer',
      subtitle: 'Des méthodes plus structurées pour mieux conduire vos échanges.',
      tone: 'gold',
      levels: ['Intermédiaire'],
    }),
    buildPath({
      id: 'approfondir',
      title: 'Approfondir',
      subtitle: 'Les situations complexes, les arbitrages sensibles et les accords à fort enjeu.',
      tone: 'coral',
      levels: ['Avancé'],
    }),
  ].filter(Boolean)
})

const statCards = computed(() => {
  if (isCoach.value) {
    const publishedOffers = ownedCoachCourses.value.length + ownedMasterclasses.value.length
    const incomingDemand = courseRequests.value.length + masterclassRegistrations.value.length
    const pendingDemand =
      courseRequests.value.filter((item) => item?.status === 'pending').length +
      masterclassRegistrations.value.filter((item) => ['registered', 'pending'].includes(item?.status)).length

    return [
      {
        label: 'Offres publiées',
        value: String(publishedOffers),
        hint: 'Cours et masterclasses',
        note: `${ownedCoachCourses.value.length} cours coach · ${ownedMasterclasses.value.length} masterclasses`,
        tone: 'teal',
        bars: buildBars([...ownedCoachCourses.value, ...ownedMasterclasses.value], (item) => item?.createdAt || item?.updatedAt),
      },
      {
        label: 'Demandes reçues',
        value: String(incomingDemand),
        hint: 'Cours et inscriptions',
        note: `${pendingDemand} en attente de traitement`,
        tone: 'gold',
        bars: buildBars([...courseRequests.value, ...masterclassRegistrations.value], (item) => item?.createdAt || item?.updatedAt),
      },
      {
        label: 'Sessions à venir',
        value: String(upcomingOwnedMasterclasses.value.length),
        hint: 'Masterclasses planifiées',
        note: `${confirmedRegistrations.value.length} inscriptions confirmées`,
        tone: 'coral',
        bars: buildBars(upcomingOwnedMasterclasses.value, (item) => item?.createdAt || item?.updatedAt),
      },
    ]
  }

  const learnerBookings = activeLearnerRequests.value.length + masterclassRegistrations.value.length
  const pendingActions = pendingCourseRequests.value.length + pendingRegistrations.value.length

  return [
    {
      label: 'Cours disponibles',
      value: String(libraryCourses.value.length),
      hint: 'Bibliothèque ouverte',
      note: `${coachCourses.value.length} parcours avec coach accessibles`,
      tone: 'teal',
      bars: buildBars(libraryCourses.value, (item) => item?.createdAt || item?.updatedAt),
    },
    {
      label: 'Réservations actives',
      value: String(learnerBookings),
      hint: 'Cours et masterclasses',
      note: `${pendingActions} en attente de validation`,
      tone: 'gold',
      bars: buildBars([...courseRequests.value, ...masterclassRegistrations.value], (item) => item?.createdAt || item?.updatedAt),
    },
    {
      label: 'Conversations',
      value: String(conversations.value.length),
      hint: 'Réseau actif',
      note: `${auth.chatUnreadCount || 0} messages non lus`,
      tone: 'coral',
      bars: buildBars(conversations.value, (item) => item?.updatedAt || item?.createdAt),
    },
  ]
})

const heroSignals = computed(() => {
  if (isCoach.value) {
    const pendingDemand =
      courseRequests.value.filter((item) => item?.status === 'pending').length +
      masterclassRegistrations.value.filter((item) => ['registered', 'pending'].includes(item?.status)).length

    return [
      { label: 'Cours coach', value: String(ownedCoachCourses.value.length), detail: 'Offres publiées', tone: 'teal' },
      { label: 'En attente', value: String(pendingDemand), detail: 'Demandes à traiter', tone: 'coral' },
      { label: 'À venir', value: String(upcomingOwnedMasterclasses.value.length), detail: 'Sessions planifiées', tone: 'gold' },
    ]
  }

  return [
    { label: 'Bibliothèque', value: String(libraryCourses.value.length), detail: 'Cours disponibles', tone: 'teal' },
    { label: 'Réservations', value: String(activeLearnerRequests.value.length + masterclassRegistrations.value.length), detail: 'Parcours actifs', tone: 'coral' },
    { label: 'Messages', value: String(auth.chatUnreadCount || 0), detail: 'Non lus', tone: 'gold' },
  ]
})

const focusItems = computed(() => {
  if (isCoach.value) {
    return [
      {
        icon: 'mdi-book-open-page-variant-outline',
        label: 'Dernier cours',
        state: latestOwnedCourse.value?.title || 'Aucun cours créé',
      },
      {
        icon: 'mdi-calendar-clock-outline',
        label: 'Prochaine session',
        state: nextOwnedMasterclass.value ? `${nextOwnedMasterclass.value.title} · ${formatFutureDate(nextOwnedMasterclass.value.scheduleAt)}` : 'Aucune masterclass planifiée',
      },
      {
        icon: 'mdi-account-clock-outline',
        label: 'Dernière demande',
        state: latestDemand.value ? formatRelativeDate(latestDemand.value.updatedAt || latestDemand.value.createdAt) : 'Aucune demande récente',
      },
    ]
  }

  return [
    {
      icon: 'mdi-book-open-page-variant-outline',
      label: 'Dernier cours',
      state: latestLibraryCourse.value?.title || 'Aucun cours récent',
    },
    {
      icon: 'mdi-calendar-star',
      label: 'Prochaine masterclass',
      state: nextRegisteredMasterclass.value
        ? `${nextRegisteredMasterclass.value.masterclassTitle} · ${formatFutureDate(nextRegisteredMasterclass.value.scheduleAt)}`
        : 'Aucune inscription planifiée',
    },
    {
      icon: 'mdi-message-text-outline',
      label: 'Dernier message',
      state: latestConversation.value ? formatRelativeDate(latestConversation.value.updatedAt || latestConversation.value.createdAt) : 'Aucun échange récent',
    },
  ]
})

const heroPanelTitle = computed(() => (isCoach.value ? 'Vos priorités du moment' : 'Votre espace du jour'))
const heroPanelSubtitle = computed(() =>
  isCoach.value
    ? 'Repérez en un coup d’œil les demandes, sessions et actions importantes.'
    : 'Gardez vos apprentissages, réservations et conversations à portée de main.'
)

const dashboardActions = computed(() => {
  if (isCoach.value) {
    return [
      { label: 'Gérer mes offres', path: ROUTE_PATHS.coachCourses, tone: 'teal' },
      { label: 'Voir mes masterclass', path: ROUTE_PATHS.masterclass, tone: 'gold' },
      { label: 'Ouvrir le chat', path: ROUTE_PATHS.chat, tone: 'coral' },
    ]
  }

  return [
    { label: 'Explorer les cours', path: ROUTE_PATHS.courses, tone: 'teal' },
    { label: 'Voir les masterclass', path: ROUTE_PATHS.masterclass, tone: 'gold' },
    { label: 'Ouvrir le chat', path: ROUTE_PATHS.chat, tone: 'coral' },
  ]
})

const activities = computed(() => {
  const items = []

  if (isCoach.value) {
    courseRequests.value.forEach((item) => {
      items.push({
        title: item.status === 'accepted' ? 'Demande acceptée' : item.status === 'rejected' ? 'Demande refusée' : 'Nouvelle demande reçue',
        detail: item.courseTitle || 'Cours avec coach',
        time: formatRelativeDate(item.updatedAt || item.createdAt),
        icon: item.status === 'accepted' ? 'mdi-check-decagram-outline' : 'mdi-account-voice-outline',
        order: toMillis(item.updatedAt || item.createdAt),
      })
    })

    masterclassRegistrations.value.forEach((item) => {
      items.push({
        title: item.status === 'confirmed' ? 'Inscription confirmée' : item.status === 'declined' ? 'Inscription refusée' : 'Nouvelle inscription masterclass',
        detail: item.masterclassTitle || 'Masterclass',
        time: formatRelativeDate(item.updatedAt || item.createdAt),
        icon: 'mdi-calendar-star',
        order: toMillis(item.updatedAt || item.createdAt),
      })
    })

    ownedMasterclasses.value.forEach((item) => {
      items.push({
        title: 'Masterclass mise à jour',
        detail: item.title || 'Masterclass',
        time: formatRelativeDate(item.updatedAt || item.createdAt || item.scheduleAt),
        icon: 'mdi-presentation-play',
        order: toMillis(item.updatedAt || item.createdAt || item.scheduleAt),
      })
    })
  } else {
    libraryCourses.value.forEach((item) => {
      items.push({
        title: 'Nouveau cours disponible',
        detail: item.title || 'Cours pré-enregistré',
        time: formatRelativeDate(item.createdAt || item.updatedAt),
        icon: 'mdi-book-open-page-variant-outline',
        order: toMillis(item.createdAt || item.updatedAt),
      })
    })

    courseRequests.value.forEach((item) => {
      items.push({
        title: item.status === 'accepted' ? 'Demande acceptée' : item.status === 'rejected' ? 'Demande clôturée' : 'Demande envoyée',
        detail: item.courseTitle || 'Cours avec coach',
        time: formatRelativeDate(item.updatedAt || item.createdAt),
        icon: 'mdi-account-check-outline',
        order: toMillis(item.updatedAt || item.createdAt),
      })
    })

    masterclassRegistrations.value.forEach((item) => {
      items.push({
        title: item.status === 'confirmed' ? 'Participation confirmée' : 'Masterclass réservée',
        detail: item.masterclassTitle || 'Masterclass',
        time: formatRelativeDate(item.updatedAt || item.createdAt),
        icon: 'mdi-calendar-check-outline',
        order: toMillis(item.updatedAt || item.createdAt),
      })
    })
  }

  conversations.value.forEach((item) => {
    items.push({
      title: 'Conversation mise à jour',
      detail: item.lastMessage || 'Nouvel échange dans le chat',
      time: formatRelativeDate(item.updatedAt || item.createdAt),
      icon: 'mdi-message-text-outline',
      order: toMillis(item.updatedAt || item.createdAt),
    })
  })

  return items
    .filter((item) => item.order > 0)
    .sort((a, b) => b.order - a.order)
    .slice(0, 3)
})

const loadDashboardData = async () => {
  if (!auth.user?.uid) return

  const [coursesRes, masterclassesRes, conversationsRes] = await Promise.allSettled([
    getCourses(),
    getMasterclasses(),
    getDocs(query(collection(db, 'conversations'), where('participants', 'array-contains', auth.user.uid))),
  ])

  courses.value =
    coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value : []
  masterclasses.value =
    masterclassesRes.status === 'fulfilled' && Array.isArray(masterclassesRes.value)
      ? masterclassesRes.value
      : []
  conversations.value =
    conversationsRes.status === 'fulfilled'
      ? conversationsRes.value.docs.map((item) => ({ id: item.id, ...item.data() }))
      : []

  if (role.value === 'coach') {
    const [requestsRes, registrationsRes] = await Promise.allSettled([
      api.get('/requests/coach'),
      api.get('/masterclasses/registrations/coach'),
    ])

    courseRequests.value =
      requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value.data)
        ? requestsRes.value.data
        : []
    masterclassRegistrations.value =
      registrationsRes.status === 'fulfilled' && Array.isArray(registrationsRes.value.data)
        ? registrationsRes.value.data
        : []
    return
  }

  const [requestsRes, registrationsRes] = await Promise.allSettled([
    api.get('/requests/me'),
    api.get('/masterclasses/registrations/me'),
  ])

  courseRequests.value =
    requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value.data)
      ? requestsRes.value.data
      : []
  masterclassRegistrations.value =
    registrationsRes.status === 'fulfilled' && Array.isArray(registrationsRes.value.data)
      ? registrationsRes.value.data
      : []
}

onMounted(async () => {
  loadingProfile.value = true
  profileError.value = ''

  try {
    profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
  } catch (error) {
    console.error(error)
  }

  try {
    await loadDashboardData()
  } catch (error) {
    profileError.value = 'Impossible de charger une partie du tableau de bord.'
    console.error(error)
  }

  loadingProfile.value = false
})
</script>

<template>
  <v-container class="home-container" fluid>
    <div class="home-backdrop" aria-hidden="true"></div>

    <v-row class="home-top-grid" align="stretch" justify="center">
      <v-col cols="12" md="6">
        <div class="home-top-stack">
          <div class="home-top-overview">
            <div class="home-top-overview__eyebrow">Tableau de bord</div>
            <div class="home-top-overview__subtitle">{{ dashboardSummary }}</div>

            <div class="home-top-overview__meta">
              <div v-for="item in heroMeta" :key="item.label" class="home-top-overview__pill">
                <span class="home-top-overview__pill-label">{{ item.label }}</span>
                <span class="home-top-overview__pill-value">{{ item.value }}</span>
              </div>
            </div>
          </div>

          <div class="home-news-shell">
            <div class="home-section-heading">
              <div class="home-section-heading__eyebrow">Actualités</div>
              <div class="home-section-heading__title">Les nouveautés utiles en ce moment</div>
            </div>
            <AppNewsCarousel variant="dashboard" />
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="4">
        <div class="home-hero-panel home-hero-panel--top">
          <div class="home-hero-panel__eyebrow">Vue rapide</div>
          <div class="home-hero-panel__title">{{ heroPanelTitle }}</div>
          <div class="home-hero-panel__subtitle">{{ heroPanelSubtitle }}</div>

          <div class="home-hero-actions">
            <v-btn
              v-for="action in dashboardActions"
              :key="action.path"
              class="home-hero-action-btn"
              :class="`home-hero-action-btn--${action.tone}`"
              variant="flat"
              size="small"
              :to="action.path"
            >
              {{ action.label }}
            </v-btn>
          </div>

          <div class="home-hero-signal-grid">
            <div
              v-for="signal in heroSignals"
              :key="signal.label"
              class="home-hero-signal"
              :class="`home-hero-signal--${signal.tone}`"
            >
              <div class="home-hero-signal__label">{{ signal.label }}</div>
              <div class="home-hero-signal__value">{{ signal.value }}</div>
              <div class="home-hero-signal__detail">{{ signal.detail }}</div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="isCoachPendingReview" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-alert
          class="home-review-alert"
          type="info"
          variant="tonal"
          border="start"
          density="comfortable"
          icon="mdi-shield-account-outline"
        >
          <div class="home-review-alert__title">Votre compte coach est en cours d’évaluation.</div>
          <div class="home-review-alert__text">
            Nous vous contacterons par email pour passer à l’étape de validation de votre compte.
            Nous tenons à avoir des coachs de qualité sur notre plateforme afin de garantir la meilleure expérience possible.
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <v-row class="home-grid home-grid--stats" align="center" justify="center">
      <v-col cols="12" md="3" v-for="stat in statCards" :key="stat.label">
        <v-card class="home-stat-card" elevation="6">
          <div class="home-stat-header">
            <div class="home-stat-headline">
              <div class="home-stat-label">{{ stat.label }}</div>
              <div class="home-stat-hint">{{ stat.hint }}</div>
            </div>

            <div class="home-stat-mini-chart" :class="`home-stat-mini-chart--${stat.tone}`">
              <span
                v-for="(bar, index) in stat.bars"
                :key="`${stat.label}-${index}`"
                class="home-stat-mini-chart__bar"
                :style="{ height: `${bar}%` }"
              ></span>
            </div>
          </div>

          <div class="home-stat-value">{{ stat.value }}</div>
          <div class="home-stat-note">{{ stat.note }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="learnerGuidedPaths.length" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-card home-card--paths" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Parcours guidés</div>
              <div class="home-card-subtitle">Commencer, continuer ou approfondir selon votre niveau actuel.</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">Bibliothèque</v-chip>
          </div>

          <div class="home-path-grid">
            <div
              v-for="path in learnerGuidedPaths"
              :key="path.id"
              class="home-path-card"
              :class="`home-path-card--${path.tone}`"
            >
              <div class="home-path-card__header">
                <div>
                  <div class="home-path-card__eyebrow">{{ path.title }}</div>
                  <div class="home-path-card__title">{{ path.spotlight.title }}</div>
                  <div class="home-path-card__subtitle">{{ path.subtitle }}</div>
                </div>
                <div class="home-path-card__count">{{ path.total }}</div>
              </div>

              <div class="home-path-card__meta">
                <span>{{ path.spotlight.level || 'Tous niveaux' }}</span>
                <span>{{ path.spotlight.duration || '—' }}</span>
                <span>{{ path.spotlight.category || 'Négociation' }}</span>
              </div>

              <div class="home-path-card__list">
                <div v-for="course in path.items" :key="`${path.id}-${course.id}`" class="home-path-card__item">
                  <span class="home-path-card__item-title">{{ course.title }}</span>
                  <span class="home-path-card__item-level">{{ course.level || 'Tous niveaux' }}</span>
                </div>
              </div>

              <v-btn class="home-path-card__cta" variant="flat" :to="ROUTE_PATHS.courses">
                Voir les cours
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="home-grid" align="center" justify="center">
      <v-col cols="12" md="5">
        <v-card class="home-card" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Activité récente</div>
              <div class="home-card-subtitle">Ce qui s’est passé sur votre compte</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">
              {{ loadingProfile ? 'Synchronisation…' : 'À jour' }}
            </v-chip>
          </div>

          <div class="home-activity-list">
            <div class="home-activity-item" v-for="activity in activities" :key="activity.title">
              <div class="home-activity-icon">
                <v-icon size="20">{{ activity.icon }}</v-icon>
              </div>
              <div class="home-activity-content">
                <div class="home-activity-title">{{ activity.title }}</div>
                <div class="home-activity-detail">{{ activity.detail }}</div>
              </div>
              <div class="home-activity-time">{{ activity.time }}</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="home-card" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Focus du moment</div>
              <div class="home-card-subtitle">L’essentiel à garder sous les yeux</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">{{ accountStatusLabel }}</v-chip>
          </div>

          <div class="home-focus-list">
            <div class="home-focus-item" v-for="item in focusItems" :key="item.label">
              <div class="home-focus-icon">
                <v-icon size="18">{{ item.icon }}</v-icon>
              </div>
              <div class="home-focus-content">
                <div class="home-focus-title">{{ item.label }}</div>
                <div class="home-focus-state">{{ item.state }}</div>
              </div>
            </div>
          </div>

          <div class="home-action-grid">
            <v-btn
              v-for="action in dashboardActions"
              :key="`focus-${action.path}`"
              class="home-action-btn"
              :class="`home-action-btn--${action.tone}`"
              variant="tonal"
              :to="action.path"
            >
              {{ action.label }}
            </v-btn>
          </div>

          <div v-if="profileError" class="home-error">
            {{ profileError }}
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.home-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.home-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.home-top-grid,
.home-grid {
  position: relative;
  z-index: 1;
}

.home-top-grid {
  margin-top: 4px;
}

.home-top-stack {
  display: grid;
  gap: 20px;
}

.home-top-overview {
  display: grid;
  gap: 12px;
}

.home-top-overview__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.48);
}

.home-top-overview__subtitle {
  max-width: 620px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(19, 58, 59, 0.72);
}

.home-top-overview__meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.home-top-overview__pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.home-top-overview__pill-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.5);
}

.home-top-overview__pill-value {
  font-size: 13px;
  font-weight: 700;
  color: #133a3b;
}

.home-hero-panel {
  padding: 18px;
  border-radius: 28px;
  background:
    linear-gradient(170deg, rgba(19, 58, 59, 0.98), rgba(27, 79, 81, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  display: grid;
  gap: 18px;
}

.home-hero-panel--top {
  height: 100%;
  min-height: 100%;
}

.home-hero-panel__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(245, 239, 230, 0.62);
}

.home-hero-panel__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #fffaf2;
}

.home-hero-panel__subtitle {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(245, 239, 230, 0.78);
}

.home-hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.home-hero-action-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
}

.home-hero-action-btn--teal {
  background: rgba(67, 196, 175, 0.18);
  color: #dbfff8;
}

.home-hero-action-btn--gold {
  background: rgba(245, 191, 71, 0.18);
  color: #fff0c9;
}

.home-hero-action-btn--coral {
  background: rgba(240, 90, 40, 0.18);
  color: #ffe1d5;
}

.home-hero-signal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.home-hero-signal {
  padding: 14px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.home-hero-signal--gold {
  background: rgba(245, 191, 71, 0.12);
}

.home-hero-signal--coral {
  background: rgba(240, 90, 40, 0.12);
}

.home-hero-signal__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(245, 239, 230, 0.58);
}

.home-hero-signal__value {
  margin-top: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #fffaf2;
}

.home-hero-signal__detail {
  margin-top: 4px;
  font-size: 11px;
  color: rgba(245, 239, 230, 0.7);
}

.home-grid {
  margin-top: 28px;
  gap: 20px;
}

.home-grid--stats {
  margin-top: 24px;
}

.home-grid--full {
  margin-top: 34px;
}

.home-section-heading {
  margin-bottom: 14px;
}

.home-section-heading__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.52);
}

.home-section-heading__title {
  margin-top: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #133a3b;
}

.home-news-shell {
  display: grid;
  gap: 14px;
}

.home-stat-card {
  border-radius: 22px;
  padding: 18px;
  background: #fff;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.1);
  display: grid;
  gap: 14px;
}

.home-stat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.home-stat-headline {
  min-width: 0;
}

.home-stat-mini-chart {
  height: 54px;
  width: 86px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 5px;
  padding: 6px 8px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.05);
}

.home-stat-mini-chart--teal {
  background: rgba(28, 124, 125, 0.08);
}

.home-stat-mini-chart--gold {
  background: rgba(245, 191, 71, 0.12);
}

.home-stat-mini-chart--coral {
  background: rgba(240, 90, 40, 0.1);
}

.home-stat-mini-chart__bar {
  width: 7px;
  border-radius: 999px;
  background: linear-gradient(180deg, #43c4af, #1c7c7d);
}

.home-stat-mini-chart--gold .home-stat-mini-chart__bar {
  background: linear-gradient(180deg, #f7cb6a, #d79c1c);
}

.home-stat-mini-chart--coral .home-stat-mini-chart__bar {
  background: linear-gradient(180deg, #f58a63, #e45526);
}

.home-stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
  line-height: 1;
}

.home-stat-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: rgba(19, 58, 59, 0.78);
}

.home-stat-hint {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.5);
}

.home-stat-note {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.62);
  line-height: 1.5;
}

.home-card {
  border-radius: 24px;
  padding: 20px 22px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.home-card--paths {
  display: grid;
  gap: 18px;
}

.home-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.home-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #133a3b;
}

.home-card-subtitle {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.home-chip {
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 600;
}

.home-path-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.home-path-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  display: grid;
  gap: 14px;
}

.home-path-card--teal {
  background: linear-gradient(180deg, rgba(228, 245, 243, 0.92), rgba(255, 255, 255, 0.98));
}

.home-path-card--gold {
  background: linear-gradient(180deg, rgba(255, 243, 218, 0.94), rgba(255, 255, 255, 0.98));
}

.home-path-card--coral {
  background: linear-gradient(180deg, rgba(255, 235, 228, 0.94), rgba(255, 255, 255, 0.98));
}

.home-path-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.home-path-card__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.56);
}

.home-path-card__title {
  margin-top: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  color: #133a3b;
}

.home-path-card__subtitle {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(19, 58, 59, 0.66);
}

.home-path-card__count {
  min-width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.74);
  color: #133a3b;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.home-path-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-path-card__meta span {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 600;
  color: #133a3b;
}

.home-path-card__list {
  display: grid;
  gap: 10px;
}

.home-path-card__item {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.home-path-card__item-title {
  font-size: 13px;
  font-weight: 700;
  color: #133a3b;
}

.home-path-card__item-level {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.58);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.home-path-card__cta {
  justify-self: flex-start;
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
  background: #133a3b;
  color: #fffaf2;
}

.home-review-alert {
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(28, 124, 125, 0.12), rgba(245, 191, 71, 0.12));
  border-color: rgba(28, 124, 125, 0.22);
  color: #133a3b;
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.08);
}

.home-review-alert__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.home-review-alert__text {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(19, 58, 59, 0.82);
}

.home-activity-list {
  display: grid;
  gap: 12px;
}

.home-activity-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.04);
}

.home-activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(245, 177, 63, 0.18);
  color: #a96014;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-activity-title {
  font-size: 14px;
  font-weight: 600;
  color: #133a3b;
}

.home-activity-detail {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.home-activity-time {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.5);
}

.home-focus-list {
  display: grid;
  gap: 12px;
}

.home-focus-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
}

.home-focus-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
}

.home-focus-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.56);
}

.home-focus-state {
  margin-top: 4px;
  font-size: 14px;
  color: #133a3b;
}

.home-action-grid {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.home-action-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 14px;
}

.home-action-btn--teal {
  color: #1c7c7d;
}

.home-action-btn--gold {
  color: #c78812;
}

.home-action-btn--coral {
  color: #d45a30;
}

.home-error {
  margin-top: 14px;
  font-size: 12px;
  color: #b94a2f;
}

@media (max-width: 960px) {
  .home-hero-signal-grid {
    grid-template-columns: 1fr;
  }

  .home-path-grid {
    grid-template-columns: 1fr;
  }

  .home-hero-actions,
  .home-action-grid,
  .home-top-overview__meta {
    flex-direction: column;
  }
}
</style>

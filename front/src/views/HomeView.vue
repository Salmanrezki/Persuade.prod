<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import AppNewsCarousel from '@/components/AppNewsCarousel.vue'
import api from '@/services/api'
import { db } from '@/services/firebase'
import { getUserProfile } from '@/services/userService'
import { getCourses, getMasterclasses } from '@/services/contentService'
import { getCachedCoachDirectory, getCoachDirectory } from '@/services/coachDirectoryService'
import { collection, getDocs, query, where } from 'firebase/firestore'

const auth = useAuthStore()
const router = useRouter()
const profile = ref(null)
const loadingProfile = ref(false)
const profileError = ref('')
const courses = ref([])
const masterclasses = ref([])
const conversations = ref([])
const courseRequests = ref([])
const masterclassRegistrations = ref([])
const availableCoaches = ref([])
const followupRequests = ref([])
const coachClientProgress = ref([])
const selectedCoachId = ref('')
const followupMessage = ref('')
const followupLoading = ref(false)
const followupError = ref('')
const followupDecisionId = ref('')
const coachesLoading = ref(false)
const coachPreviewDialog = ref(false)
const coachClientFilter = ref('all')
const coachClientNotes = ref({})
const coachClientActions = ref({})

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
    ? 'Suivez l’activité de vos clients, vos cours validés et les prochaines sessions depuis un seul espace.'
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
const selectedCoach = computed(() => availableCoaches.value.find((coach) => coach.uid === selectedCoachId.value) || null)
const acceptedFollowupRequests = computed(() => followupRequests.value.filter((item) => item?.status === 'accepted'))
const pendingFollowupRequests = computed(() => followupRequests.value.filter((item) => item?.status === 'pending'))
const coachFollowupPending = computed(() => followupRequests.value.filter((item) => item?.status === 'pending'))
const coachOptions = computed(() =>
  availableCoaches.value.map((coach) => ({
    title:
      coach.coachApplicationStatus === 'pending_review'
        ? `${coach.firstname || coach.email || 'Coach'} · validation en cours`
        : coach.firstname || coach.email || 'Coach',
    value: coach.uid,
    raw: coach,
  }))
)

const selectedCoachHeadline = computed(() => {
  if (!selectedCoach.value) return 'Coach disponible sur la plateforme'

  return (
    selectedCoach.value.jobTitleDetail ||
    selectedCoach.value.jobTitle ||
    selectedCoach.value.professionDetail ||
    selectedCoach.value.profession ||
    selectedCoach.value.speakerBio ||
    selectedCoach.value.sectorDetail ||
    selectedCoach.value.sector ||
    'Coach disponible sur la plateforme'
  )
})

const selectedCoachMeta = computed(() => {
  if (!selectedCoach.value) return []

  return [
    selectedCoach.value.sectorDetail || selectedCoach.value.sector || '',
    selectedCoach.value.seniority || '',
    selectedCoach.value.learningFormat || '',
  ].filter(Boolean)
})

const isSeedCoachId = (value) => typeof value === 'string' && value.startsWith('seed-coach-')

const deriveCoachOptionsFromContent = (courseItems, masterclassItems) => {
  const coachMap = new Map()

  courseItems
    .filter((item) => item?.coachId && !isSeedCoachId(item.coachId))
    .forEach((item) => {
      if (!coachMap.has(item.coachId)) {
        coachMap.set(item.coachId, {
          uid: item.coachId,
          firstname: item.coachName || 'Coach',
          email: '',
          coachApplicationStatus: 'pending_review',
        })
      }
    })

  masterclassItems
    .filter((item) => item?.coachId && !isSeedCoachId(item.coachId))
    .forEach((item) => {
      if (!coachMap.has(item.coachId)) {
        coachMap.set(item.coachId, {
          uid: item.coachId,
          firstname: item.coachName || 'Coach',
          email: '',
          coachApplicationStatus: 'pending_review',
        })
      }
    })

  return Array.from(coachMap.values()).sort((a, b) =>
    (a.firstname || '').localeCompare(b.firstname || '', 'fr')
  )
}

const coachClientSummaries = computed(() => {
  if (!isCoach.value) return []

  const clientMap = new Map()
  const now = Date.now()

  const ensureClient = (studentId, studentName) => {
    const key = studentId || `client-${studentName || 'inconnu'}`
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        id: studentId || '',
        key,
        name: studentName || 'Client',
        pendingRequests: 0,
        acceptedCourses: 0,
        totalRequests: 0,
        activeMasterclasses: 0,
        confirmedMasterclasses: 0,
        declinedMasterclasses: 0,
        lastActivityAt: 0,
        nextSessionAt: 0,
        nextSessionTitle: '',
        latestCourseTitle: '',
        timeline: [],
      })
    }

    return clientMap.get(key)
  }

  courseRequests.value.forEach((request) => {
    const client = ensureClient(request.studentId, request.studentName)
    const activityAt = toMillis(request.updatedAt || request.createdAt)
    client.totalRequests += 1
    client.latestCourseTitle = request.courseTitle || client.latestCourseTitle

    if (request.status === 'pending') client.pendingRequests += 1
    if (request.status === 'accepted') client.acceptedCourses += 1

    client.lastActivityAt = Math.max(client.lastActivityAt, activityAt)
    client.timeline.push({
      title:
        request.status === 'accepted'
          ? 'Cours accepté'
          : request.status === 'rejected'
          ? 'Demande refusée'
          : 'Demande en attente',
      detail: request.courseTitle || 'Cours particulier',
      at: activityAt,
    })
  })

  masterclassRegistrations.value.forEach((registration) => {
    const client = ensureClient(registration.studentId, registration.studentName)
    const activityAt = toMillis(registration.updatedAt || registration.createdAt)
    const sessionAt = toMillis(registration.scheduleAt)
    const isUpcoming = sessionAt >= now && registration.status !== 'declined'

    if (registration.status === 'confirmed') client.confirmedMasterclasses += 1
    if (registration.status === 'declined') client.declinedMasterclasses += 1
    if (isUpcoming) client.activeMasterclasses += 1

    if (isUpcoming && (!client.nextSessionAt || sessionAt < client.nextSessionAt)) {
      client.nextSessionAt = sessionAt
      client.nextSessionTitle = registration.masterclassTitle || 'Masterclass'
    }

    client.lastActivityAt = Math.max(client.lastActivityAt, activityAt, sessionAt)
    client.timeline.push({
      title:
        registration.status === 'confirmed'
          ? 'Session confirmée'
          : registration.status === 'declined'
          ? 'Session refusée'
          : 'Inscription masterclass',
      detail: registration.masterclassTitle || 'Masterclass',
      at: Math.max(activityAt, sessionAt),
    })
  })

  return Array.from(clientMap.values())
    .map((client) => ({
      ...client,
      timeline: client.timeline.sort((a, b) => b.at - a.at).slice(0, 2),
    }))
    .sort((a, b) => {
      if (b.pendingRequests !== a.pendingRequests) return b.pendingRequests - a.pendingRequests
      if (b.activeMasterclasses !== a.activeMasterclasses) return b.activeMasterclasses - a.activeMasterclasses
      return b.lastActivityAt - a.lastActivityAt
    })
})

const coachClientSummaryStats = computed(() => {
  if (!isCoach.value) return null

  return {
    totalClients: coachClientSummaries.value.length,
    activeClients: coachClientSummaries.value.filter(
      (client) => client.acceptedCourses > 0 || client.activeMasterclasses > 0
    ).length,
    clientsNeedingReply: coachClientSummaries.value.filter((client) => client.pendingRequests > 0).length,
  }
})

const getCoachCrmStorageKey = (uid) => `persuade.coach-crm.${uid}`

const readCoachCrmState = () => {
  const uid = profile.value?.uid || auth.user?.uid
  if (!uid || typeof window === 'undefined') return { notes: {}, actions: {} }

  try {
    const raw = window.localStorage.getItem(getCoachCrmStorageKey(uid))
    if (!raw) return { notes: {}, actions: {} }
    const parsed = JSON.parse(raw)
    return {
      notes: parsed?.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      actions: parsed?.actions && typeof parsed.actions === 'object' ? parsed.actions : {},
    }
  } catch (error) {
    return { notes: {}, actions: {} }
  }
}

const persistCoachCrmState = () => {
  const uid = profile.value?.uid || auth.user?.uid
  if (!uid || typeof window === 'undefined') return

  window.localStorage.setItem(
    getCoachCrmStorageKey(uid),
    JSON.stringify({
      notes: coachClientNotes.value,
      actions: coachClientActions.value,
    })
  )
}

const coachClientStatus = (client) => {
  if (client.pendingRequests > 0) return 'À relancer'
  if (client.activeMasterclasses > 0) return 'Session planifiée'
  if (client.acceptedCourses > 0) return 'Suivi actif'
  return 'À qualifier'
}

const coachClientStatusTone = (client) => {
  if (client.pendingRequests > 0) return 'coral'
  if (client.activeMasterclasses > 0) return 'gold'
  if (client.acceptedCourses > 0) return 'teal'
  return 'slate'
}

const filteredCoachClientSummaries = computed(() => {
  if (!isCoach.value) return []

  if (coachClientFilter.value === 'follow_up') {
    return coachClientSummaries.value.filter((client) => client.pendingRequests > 0)
  }

  if (coachClientFilter.value === 'active') {
    return coachClientSummaries.value.filter(
      (client) => client.acceptedCourses > 0 || client.activeMasterclasses > 0
    )
  }

  if (coachClientFilter.value === 'planned') {
    return coachClientSummaries.value.filter((client) => client.activeMasterclasses > 0)
  }

  return coachClientSummaries.value
})

const coachProgressMap = computed(() =>
  coachClientProgress.value.reduce((map, item) => {
    if (item?.client?.uid) {
      map[item.client.uid] = item
    }
    return map
  }, {})
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
        note: `${ownedCoachCourses.value.length} cours particuliers · ${ownedMasterclasses.value.length} masterclasses`,
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
      { label: 'Cours particuliers', value: String(ownedCoachCourses.value.length), detail: 'Offres publiées', tone: 'teal' },
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
    ? 'Pilotez vos clients, les validations en attente et les sessions prévues.'
    : 'Gardez vos apprentissages, réservations et conversations à portée de main.'
)

const openClientFollowUp = (client) => {
  if (!client?.id) {
    router.push(ROUTE_PATHS.chat)
    return
  }

  router.push({
    path: ROUTE_PATHS.chat,
    query: { contact: client.id },
  })
}

const coachPlanningEntries = computed(() => {
  if (!isCoach.value) return []

  const now = Date.now()
  const entries = []

  courseRequests.value
    .filter((request) => request?.status === 'accepted')
    .forEach((request) => {
      entries.push({
        id: `course-${request.id}`,
        title: request.courseTitle || 'Cours particulier',
        clientName: request.studentName || 'Client',
        status: 'A organiser',
        whenLabel: 'Sans date fixée',
        sortValue: toMillis(request.updatedAt || request.createdAt) || now,
        tone: 'teal',
      })
    })

  masterclassRegistrations.value
    .filter((registration) => registration?.status !== 'declined')
    .forEach((registration) => {
      const sessionAt = toMillis(registration.scheduleAt)
      entries.push({
        id: `masterclass-${registration.id}`,
        title: registration.masterclassTitle || 'Masterclass',
        clientName: registration.studentName || 'Client',
        status: registration.status === 'confirmed' ? 'Confirmée' : 'Inscription reçue',
        whenLabel: sessionAt ? formatFutureDate(sessionAt) : 'Date à confirmer',
        sortValue: sessionAt || toMillis(registration.updatedAt || registration.createdAt) || now,
        tone: 'gold',
      })
    })

  return entries.sort((a, b) => a.sortValue - b.sortValue).slice(0, 8)
})

const updateCoachClientNote = (clientKey, value) => {
  coachClientNotes.value = {
    ...coachClientNotes.value,
    [clientKey]: value,
  }
  persistCoachCrmState()
}

const updateCoachClientAction = (clientKey, value) => {
  coachClientActions.value = {
    ...coachClientActions.value,
    [clientKey]: value,
  }
  persistCoachCrmState()
}

const submitFollowupRequest = async () => {
  if (!selectedCoachId.value) {
    followupError.value = 'Choisissez un coach.'
    return
  }

  followupLoading.value = true
  followupError.value = ''

  try {
    await api.post('/follow-up', {
      coachId: selectedCoachId.value,
      message: followupMessage.value,
    })

    followupMessage.value = ''
    const followupRes = await api.get('/follow-up/me')
    followupRequests.value = Array.isArray(followupRes.data) ? followupRes.data : []
  } catch (error) {
    const backendMessage = error?.response?.data?.message
    followupError.value =
      error?.response?.status === 409
        ? 'Une demande active existe déjà pour ce coach.'
        : error?.response?.status === 404
        ? 'Ce coach est introuvable pour le suivi approfondi.'
        : error?.response?.status === 403
        ? 'Votre compte ne peut pas envoyer cette demande pour le moment.'
        : error?.response?.status === 503
        ? 'Connexion Firebase indisponible. Réessayez dans un instant.'
        : backendMessage || 'Impossible d envoyer la demande de suivi.'
  } finally {
    followupLoading.value = false
  }
}

const updateFollowupRequestStatus = async (requestId, status) => {
  followupDecisionId.value = requestId

  try {
    await api.patch(`/follow-up/${requestId}`, { status })
    const followupRes = await api.get('/follow-up/coach')
    followupRequests.value = Array.isArray(followupRes.data) ? followupRes.data : []

    const acceptedClients = followupRequests.value
      .filter((item) => item.status === 'accepted' && item.clientId)
      .map((item) => item.clientId)

    const progressResults = await Promise.allSettled(
      acceptedClients.map((clientId) => api.get(`/users/progress/${clientId}`))
    )

    coachClientProgress.value = progressResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value.data)
  } finally {
    followupDecisionId.value = ''
  }
}

const dashboardActions = computed(() => {
  if (isCoach.value) {
    return [
      { label: 'Mes cours particuliers', path: ROUTE_PATHS.coachCourses, tone: 'teal' },
      { label: 'Créer mes masterclass', path: ROUTE_PATHS.masterclass, tone: 'gold' },
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
        detail: item.courseTitle || 'Cours particulier',
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
        detail: item.courseTitle || 'Cours particulier',
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

  coachesLoading.value = !isCoach.value

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
    coachesLoading.value = false
    const [requestsRes, registrationsRes, followupRes] = await Promise.allSettled([
      api.get('/requests/coach'),
      api.get('/masterclasses/registrations/coach'),
      api.get('/follow-up/coach'),
    ])

    courseRequests.value =
      requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value.data)
        ? requestsRes.value.data
        : []
    masterclassRegistrations.value =
      registrationsRes.status === 'fulfilled' && Array.isArray(registrationsRes.value.data)
        ? registrationsRes.value.data
        : []

    followupRequests.value =
      followupRes.status === 'fulfilled' && Array.isArray(followupRes.value.data)
        ? followupRes.value.data
        : []

    const acceptedClients = followupRequests.value
      .filter((item) => item.status === 'accepted' && item.clientId)
      .map((item) => item.clientId)

    const progressResults = await Promise.allSettled(
      acceptedClients.map((clientId) => api.get(`/users/progress/${clientId}`))
    )

    coachClientProgress.value = progressResults
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value.data)
    return
  }

  const fallbackCoaches = deriveCoachOptionsFromContent(courses.value, masterclasses.value)
  const cachedCoaches = getCachedCoachDirectory(profile.value?.uid || auth.user?.uid)
  if (cachedCoaches.length) {
    availableCoaches.value = cachedCoaches
    coachesLoading.value = false
  }

  const [requestsRes, registrationsRes, followupRes, coachesDirectoryRes] = await Promise.allSettled([
    api.get('/requests/me'),
    api.get('/masterclasses/registrations/me'),
    api.get('/follow-up/me'),
    getCoachDirectory(profile.value?.uid || auth.user?.uid, fallbackCoaches),
  ])

  courseRequests.value =
    requestsRes.status === 'fulfilled' && Array.isArray(requestsRes.value.data)
      ? requestsRes.value.data
      : []
  masterclassRegistrations.value =
    registrationsRes.status === 'fulfilled' && Array.isArray(registrationsRes.value.data)
      ? registrationsRes.value.data
      : []
  availableCoaches.value =
    coachesDirectoryRes.status === 'fulfilled' && Array.isArray(coachesDirectoryRes.value)
      ? coachesDirectoryRes.value
      : fallbackCoaches
  coachesLoading.value = false
  followupRequests.value =
    followupRes.status === 'fulfilled' && Array.isArray(followupRes.value.data) ? followupRes.value.data : []
}

onMounted(async () => {
  loadingProfile.value = true
  profileError.value = ''

  try {
    profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
  } catch (error) {
    console.error(error)
  }

  const crmState = readCoachCrmState()
  coachClientNotes.value = crmState.notes
  coachClientActions.value = crmState.actions

  try {
    await loadDashboardData()
  } catch (error) {
    profileError.value = 'Impossible de charger une partie du tableau de bord.'
    console.error(error)
  }

  loadingProfile.value = false
})

watch(
  () => [auth.user?.uid, auth.profileLoaded, auth.profile?.role],
  async ([uid, profileLoaded]) => {
    if (!uid || !profileLoaded) return

    profile.value = auth.profile || profile.value || (await getUserProfile(uid))

    if (!isCoach.value && availableCoaches.value.length === 0) {
      try {
        await loadDashboardData()
      } catch (error) {
        console.error(error)
      }
    }
  },
  { immediate: true }
)
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

          <div v-if="!isCoach" class="home-news-shell">
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

    <v-row v-if="isCoach" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-card" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Planning coach</div>
              <div class="home-card-subtitle">Les suivis à organiser et les prochaines sessions prévues avec vos clients.</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">{{ coachPlanningEntries.length }} éléments</v-chip>
          </div>

          <div v-if="coachPlanningEntries.length" class="home-planning-list">
            <div
              v-for="entry in coachPlanningEntries"
              :key="entry.id"
              class="home-planning-item"
              :class="`home-planning-item--${entry.tone}`"
            >
              <div class="home-planning-item__main">
                <div class="home-planning-item__title">{{ entry.title }}</div>
                <div class="home-planning-item__meta">{{ entry.clientName }} · {{ entry.status }}</div>
              </div>
              <div class="home-planning-item__when">{{ entry.whenLabel }}</div>
            </div>
          </div>

          <div v-else class="home-empty-state">
            Aucun élément de planning pour le moment.
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="isCoach" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-card home-card--coach-clients" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Suivi clients</div>
              <div class="home-card-subtitle">Visualisez l’activité de vos apprenants, les cours validés et les sessions à venir.</div>
            </div>
            <div class="home-card-header-actions">
              <v-chip class="home-chip" size="small" variant="flat">
                {{ coachClientSummaryStats?.totalClients || 0 }} clients
              </v-chip>
              <v-btn-toggle v-model="coachClientFilter" mandatory density="comfortable" class="home-filter-toggle">
                <v-btn value="all" size="small">Tous</v-btn>
                <v-btn value="active" size="small">Actifs</v-btn>
                <v-btn value="follow_up" size="small">À relancer</v-btn>
                <v-btn value="planned" size="small">Planifiés</v-btn>
              </v-btn-toggle>
            </div>
          </div>

          <div class="home-coach-summary-grid">
            <div class="home-coach-summary-pill">
              <div class="home-coach-summary-pill__label">Clients actifs</div>
              <div class="home-coach-summary-pill__value">{{ coachClientSummaryStats?.activeClients || 0 }}</div>
            </div>
            <div class="home-coach-summary-pill">
              <div class="home-coach-summary-pill__label">À relancer</div>
              <div class="home-coach-summary-pill__value">{{ coachClientSummaryStats?.clientsNeedingReply || 0 }}</div>
            </div>
            <div class="home-coach-summary-pill">
              <div class="home-coach-summary-pill__label">Sessions prévues</div>
              <div class="home-coach-summary-pill__value">
                {{ coachClientSummaries.reduce((total, client) => total + client.activeMasterclasses, 0) }}
              </div>
            </div>
          </div>

          <div v-if="filteredCoachClientSummaries.length" class="home-coach-client-list">
            <div
              v-for="client in filteredCoachClientSummaries.slice(0, 8)"
              :key="client.key"
              class="home-coach-client-card"
            >
              <div class="home-coach-client-card__head">
                <div>
                  <div class="home-coach-client-card__name">{{ client.name }}</div>
                  <div class="home-coach-client-card__meta">
                    Dernière activité {{ formatRelativeDate(client.lastActivityAt) }}
                  </div>
                </div>
                <div class="home-coach-client-card__head-actions">
                  <v-chip
                    size="small"
                    class="home-coach-status-chip"
                    :class="`home-coach-status-chip--${coachClientStatusTone(client)}`"
                  >
                    {{ coachClientStatus(client) }}
                  </v-chip>
                  <v-btn
                    class="home-coach-client-card__cta"
                    variant="tonal"
                    size="small"
                    @click="openClientFollowUp(client)"
                  >
                    Suivre
                  </v-btn>
                </div>
              </div>

              <div class="home-coach-client-card__stats">
                <div class="home-coach-client-card__stat">
                  <span class="home-coach-client-card__stat-value">{{ client.acceptedCourses }}</span>
                  <span class="home-coach-client-card__stat-label">cours validés</span>
                </div>
                <div class="home-coach-client-card__stat">
                  <span class="home-coach-client-card__stat-value">{{ client.pendingRequests }}</span>
                  <span class="home-coach-client-card__stat-label">demandes en attente</span>
                </div>
                <div class="home-coach-client-card__stat">
                  <span class="home-coach-client-card__stat-value">{{ client.activeMasterclasses }}</span>
                  <span class="home-coach-client-card__stat-label">sessions à venir</span>
                </div>
              </div>

              <div class="home-coach-client-card__body">
                <div v-if="client.latestCourseTitle" class="home-coach-client-card__line">
                  <strong>Cours :</strong> {{ client.latestCourseTitle }}
                </div>
                <div v-if="client.nextSessionAt" class="home-coach-client-card__line">
                  <strong>Prochaine session :</strong> {{ client.nextSessionTitle }} · {{ formatFutureDate(client.nextSessionAt) }}
                </div>
                <div v-else class="home-coach-client-card__line">
                  <strong>Prochaine session :</strong> aucune session planifiée
                </div>
                <div v-if="coachProgressMap[client.id]" class="home-coach-client-card__line">
                  <strong>Progression :</strong>
                  {{ coachProgressMap[client.id].learningProgress?.summary?.viewedCoursesCount || 0 }} cours consultés ·
                  {{ coachProgressMap[client.id].learningProgress?.summary?.completedExercisesCount || 0 }} exercices complétés
                </div>
                <div v-if="coachProgressMap[client.id]?.client?.primaryGoal" class="home-coach-client-card__line">
                  <strong>Objectif :</strong> {{ coachProgressMap[client.id].client.primaryGoal }}
                </div>
              </div>

              <div v-if="client.timeline.length" class="home-coach-client-card__timeline">
                <div
                  v-for="entry in client.timeline"
                  :key="`${client.key}-${entry.title}-${entry.at}`"
                  class="home-coach-client-card__timeline-item"
                >
                  <span class="home-coach-client-card__timeline-title">{{ entry.title }}</span>
                  <span class="home-coach-client-card__timeline-detail">{{ entry.detail }}</span>
                </div>
              </div>

              <div class="home-coach-client-card__crm">
                <v-select
                  :model-value="coachClientActions[client.key] || ''"
                  :items="['À relancer', 'Planifier un créneau', 'Envoyer ressources', 'Préparer session', 'Suivi terminé']"
                  label="Prochaine action"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:modelValue="updateCoachClientAction(client.key, $event)"
                />
                <v-textarea
                  :model-value="coachClientNotes[client.key] || ''"
                  label="Notes de suivi"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  hide-details
                  @update:modelValue="updateCoachClientNote(client.key, $event)"
                />
              </div>
            </div>
          </div>

          <div v-else class="home-empty-state">
            Aucun client suivi pour le moment. Les demandes de cours et inscriptions apparaîtront ici.
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="home-grid home-grid--stats" align="stretch" justify="center">
      <v-col cols="12" md="6" lg="3" v-for="stat in statCards" :key="stat.label">
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
        <v-card class="home-card home-card--paths home-card--feature" elevation="6">
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

    <v-row v-if="!isCoach" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-card home-card--feature" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Demande de suivi approfondi</div>
              <div class="home-card-subtitle">Connectez-vous à un coach pour un accompagnement plus poussé et personnalisé.</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">{{ followupRequests.length }} demande(s)</v-chip>
          </div>

          <div class="home-followup-grid">
            <v-select
              v-model="selectedCoachId"
              :items="coachOptions"
              item-title="title"
              item-value="value"
              label="Choisir un coach"
              variant="outlined"
              density="comfortable"
              :loading="coachesLoading"
              :no-data-text="coachesLoading ? 'Chargement des coachs...' : 'Aucun coach disponible pour le moment.'"
              hide-details
            />
            <v-textarea
              v-model="followupMessage"
              label="Expliquez votre besoin"
              variant="outlined"
              density="comfortable"
              rows="4"
              hide-details
            />
          </div>

          <div v-if="selectedCoach" class="home-selected-coach">
            <div class="home-selected-coach__main">
              <v-avatar size="72" class="home-selected-coach__avatar">
                <v-img
                  v-if="selectedCoach.profilePhoto"
                  :src="selectedCoach.profilePhoto"
                  :alt="selectedCoach.firstname || 'Coach'"
                />
                <v-icon v-else size="28">mdi-account-tie</v-icon>
              </v-avatar>

              <div class="home-selected-coach__content">
                <div class="home-selected-coach__name">
                  {{ selectedCoach.firstname || selectedCoach.email || 'Coach' }}
                </div>
                <div class="home-selected-coach__headline">{{ selectedCoachHeadline }}</div>
                <div class="home-selected-coach__chips">
                  <v-chip
                    size="small"
                    class="home-coach-status-chip"
                    :class="`home-coach-status-chip--${selectedCoach.coachApplicationStatus === 'pending_review' ? 'gold' : 'teal'}`"
                    variant="flat"
                  >
                    {{ selectedCoach.coachApplicationStatus === 'pending_review' ? 'Validation en cours' : 'Coach actif' }}
                  </v-chip>
                  <v-chip
                    v-for="item in selectedCoachMeta"
                    :key="`${selectedCoach.uid}-${item}`"
                    size="small"
                    class="home-selected-coach__chip"
                    variant="flat"
                  >
                    {{ item }}
                  </v-chip>
                </div>
              </div>
            </div>

            <v-btn class="home-action-btn home-action-btn--gold" variant="tonal" @click="coachPreviewDialog = true">
              Voir le profil du coach
            </v-btn>
          </div>

          <div class="home-followup-actions">
            <v-btn class="home-action-btn home-action-btn--teal" variant="tonal" :loading="followupLoading" @click="submitFollowupRequest">
              Envoyer la demande
            </v-btn>
            <div v-if="followupError" class="home-error">{{ followupError }}</div>
          </div>

          <div v-if="followupRequests.length" class="home-followup-list">
            <div v-for="request in followupRequests" :key="request.id" class="home-followup-item">
              <div>
                <div class="home-followup-item__title">{{ request.coachName || 'Coach' }}</div>
                <div class="home-followup-item__meta">{{ request.message || 'Demande de suivi approfondi' }}</div>
              </div>
              <v-chip size="small" class="home-chip" variant="flat">{{ request.status }}</v-chip>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="coachPreviewDialog" max-width="720">
      <v-card v-if="selectedCoach" class="home-coach-preview-dialog">
        <div class="home-coach-preview-dialog__header">
          <div class="home-selected-coach__main">
            <v-avatar size="84" class="home-selected-coach__avatar">
              <v-img
                v-if="selectedCoach.profilePhoto"
                :src="selectedCoach.profilePhoto"
                :alt="selectedCoach.firstname || 'Coach'"
              />
              <v-icon v-else size="34">mdi-account-tie</v-icon>
            </v-avatar>

            <div class="home-selected-coach__content">
              <div class="home-selected-coach__name">
                {{ selectedCoach.firstname || selectedCoach.email || 'Coach' }}
              </div>
              <div class="home-selected-coach__headline">{{ selectedCoachHeadline }}</div>
              <div class="home-selected-coach__chips">
                <v-chip
                  size="small"
                  class="home-coach-status-chip"
                  :class="`home-coach-status-chip--${selectedCoach.coachApplicationStatus === 'pending_review' ? 'gold' : 'teal'}`"
                  variant="flat"
                >
                  {{ selectedCoach.coachApplicationStatus === 'pending_review' ? 'Validation en cours' : 'Coach actif' }}
                </v-chip>
                <v-chip
                  v-for="item in selectedCoachMeta"
                  :key="`dialog-${selectedCoach.uid}-${item}`"
                  size="small"
                  class="home-selected-coach__chip"
                  variant="flat"
                >
                  {{ item }}
                </v-chip>
              </div>
            </div>
          </div>

          <v-btn icon="mdi-close" variant="text" @click="coachPreviewDialog = false" />
        </div>

        <div class="home-coach-preview-dialog__body">
          <div class="home-coach-preview-dialog__block">
            <div class="home-coach-preview-dialog__label">Statut</div>
            <div class="home-coach-preview-dialog__text">
              {{ selectedCoach.coachApplicationStatus === 'pending_review' ? 'Ce coach est visible et peut recevoir votre demande, mais sa validation plateforme est encore en cours.' : 'Ce coach est actif sur la plateforme.' }}
            </div>
          </div>

          <div class="home-coach-preview-dialog__block">
            <div class="home-coach-preview-dialog__label">Spécialité</div>
            <div class="home-coach-preview-dialog__text">{{ selectedCoachHeadline }}</div>
          </div>

          <div class="home-coach-preview-dialog__block" v-if="selectedCoach.email">
            <div class="home-coach-preview-dialog__label">Contact</div>
            <div class="home-coach-preview-dialog__text">{{ selectedCoach.email }}</div>
          </div>
        </div>

        <div class="home-coach-preview-dialog__footer">
          <v-btn class="home-action-btn home-action-btn--gold" variant="tonal" @click="coachPreviewDialog = false">
            Fermer
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-row v-if="isCoach" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <div class="home-news-shell">
          <div class="home-section-heading">
            <div class="home-section-heading__eyebrow">Actualités</div>
            <div class="home-section-heading__title">Les nouveautés utiles en ce moment</div>
          </div>
          <AppNewsCarousel variant="dashboard" />
        </div>
      </v-col>
    </v-row>

    <v-row class="home-grid home-grid--balanced" align="stretch" justify="center">
      <v-col cols="12" md="5">
        <v-card class="home-card home-card--side" elevation="6">
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
        <v-card class="home-card home-card--side" elevation="6">
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

    <v-row v-if="isCoach" class="home-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-card home-card--feature" elevation="6">
          <div class="home-card-header">
            <div>
              <div class="home-card-title">Demandes de suivi reçues</div>
              <div class="home-card-subtitle">Les clients peuvent vous demander un accompagnement approfondi et partager leur progression une fois acceptés.</div>
            </div>
            <v-chip class="home-chip" size="small" variant="flat">{{ coachFollowupPending.length }} en attente</v-chip>
          </div>

          <div v-if="followupRequests.length" class="home-followup-list">
            <div v-for="request in followupRequests" :key="request.id" class="home-followup-item">
              <div>
                <div class="home-followup-item__title">{{ request.clientName || 'Client' }}</div>
                <div class="home-followup-item__meta">{{ request.message || 'Demande de suivi approfondi' }}</div>
              </div>
              <div class="home-followup-item__actions">
                <v-chip size="small" class="home-chip" variant="flat">{{ request.status }}</v-chip>
                <v-btn
                  v-if="request.status === 'pending'"
                  class="home-action-btn home-action-btn--teal"
                  variant="tonal"
                  size="small"
                  :loading="followupDecisionId === request.id"
                  @click="updateFollowupRequestStatus(request.id, 'accepted')"
                >
                  Accepter
                </v-btn>
                <v-btn
                  v-if="request.status === 'pending'"
                  class="home-action-btn home-action-btn--coral"
                  variant="tonal"
                  size="small"
                  :loading="followupDecisionId === request.id"
                  @click="updateFollowupRequestStatus(request.id, 'rejected')"
                >
                  Refuser
                </v-btn>
              </div>
            </div>
          </div>

          <div v-else class="home-empty-state">
            Aucune demande de suivi pour le moment.
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
  margin-top: 32px;
  gap: 20px;
}

.home-grid--stats {
  margin-top: 26px;
}

.home-grid--balanced {
  align-items: stretch;
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
  min-height: 214px;
  padding: 22px;
  background: #fff;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.1);
  display: grid;
  gap: 18px;
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
  font-size: 38px;
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
  padding: 24px 26px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.home-card--feature {
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 24px 44px rgba(12, 31, 32, 0.14);
}

.home-card--side {
  height: 100%;
  min-height: 100%;
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
  margin-bottom: 20px;
}

.home-card-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.home-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 23px;
  font-weight: 600;
  color: #133a3b;
}

.home-card-subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: rgba(19, 58, 59, 0.6);
}

.home-chip {
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 600;
}

.home-filter-toggle {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(19, 58, 59, 0.05);
}

.home-followup-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
}

.home-selected-coach {
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(19, 58, 59, 0.04);
  border: 1px solid rgba(19, 58, 59, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.home-selected-coach__main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.home-selected-coach__avatar {
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.home-selected-coach__content {
  min-width: 0;
}

.home-selected-coach__name {
  font-size: 16px;
  font-weight: 700;
  color: #133a3b;
}

.home-selected-coach__headline {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.68);
}

.home-selected-coach__chips {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.home-selected-coach__chip {
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.home-coach-preview-dialog {
  border-radius: 28px;
  padding: 22px;
}

.home-coach-preview-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.home-coach-preview-dialog__body {
  margin-top: 18px;
  display: grid;
  gap: 14px;
}

.home-coach-preview-dialog__block {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.04);
}

.home-coach-preview-dialog__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.52);
}

.home-coach-preview-dialog__text {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(19, 58, 59, 0.74);
}

.home-coach-preview-dialog__footer {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.home-followup-actions {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.home-followup-list {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.home-followup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.04);
}

.home-followup-item__title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.home-followup-item__meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.home-followup-item__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.home-path-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.home-path-card {
  min-height: 100%;
  padding: 22px;
  border-radius: 22px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  display: grid;
  gap: 16px;
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

.home-card--coach-clients {
  display: grid;
  gap: 18px;
}

.home-coach-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.home-coach-summary-pill {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.04);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.home-coach-summary-pill__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.52);
}

.home-coach-summary-pill__value {
  margin-top: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #133a3b;
}

.home-coach-client-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.home-coach-client-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(28, 124, 125, 0.14), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(247, 244, 238, 0.98));
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.home-coach-client-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.home-coach-client-card__head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.home-coach-client-card__name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #133a3b;
}

.home-coach-client-card__meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(19, 58, 59, 0.58);
}

.home-coach-client-card__cta {
  text-transform: none;
  font-weight: 700;
  color: #1c7c7d;
}

.home-coach-status-chip {
  font-weight: 700;
}

.home-coach-status-chip--teal {
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
}

.home-coach-status-chip--gold {
  background: rgba(245, 191, 71, 0.18);
  color: #a56e08;
}

.home-coach-status-chip--coral {
  background: rgba(240, 90, 40, 0.16);
  color: #cc5a30;
}

.home-coach-status-chip--slate {
  background: rgba(19, 58, 59, 0.1);
  color: #50686a;
}

.home-coach-client-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.home-coach-client-card__stat {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.04);
  display: grid;
  gap: 6px;
}

.home-coach-client-card__stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #133a3b;
}

.home-coach-client-card__stat-label {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.58);
}

.home-coach-client-card__body,
.home-coach-client-card__timeline {
  display: grid;
  gap: 8px;
}

.home-coach-client-card__crm {
  display: grid;
  gap: 10px;
}

.home-coach-client-card__line {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.76);
}

.home-coach-client-card__timeline-item {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(245, 191, 71, 0.1);
}

.home-coach-client-card__timeline-title {
  font-size: 12px;
  font-weight: 700;
  color: #7f5b11;
}

.home-coach-client-card__timeline-detail {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.64);
}

.home-empty-state {
  padding: 20px 22px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.04);
  font-size: 14px;
  color: rgba(19, 58, 59, 0.6);
}

.home-planning-list {
  display: grid;
  gap: 12px;
}

.home-planning-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.home-planning-item--teal {
  background: rgba(28, 124, 125, 0.06);
}

.home-planning-item--gold {
  background: rgba(245, 191, 71, 0.1);
}

.home-planning-item__title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.home-planning-item__meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.home-planning-item__when {
  font-size: 12px;
  font-weight: 700;
  color: #133a3b;
  white-space: nowrap;
}

.home-activity-list {
  display: grid;
  gap: 14px;
}

.home-activity-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
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
  gap: 14px;
}

.home-focus-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  border-radius: 18px;
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
  margin-top: 22px;
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
  .home-coach-summary-grid,
  .home-hero-signal-grid {
    grid-template-columns: 1fr;
  }

  .home-coach-client-list,
  .home-path-grid {
    grid-template-columns: 1fr;
  }

  .home-followup-grid {
    grid-template-columns: 1fr;
  }

  .home-selected-coach,
  .home-selected-coach__main,
  .home-coach-preview-dialog__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-coach-client-card__stats {
    grid-template-columns: 1fr;
  }

  .home-card-header,
  .home-card-header-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-card,
  .home-card--feature {
    padding: 20px;
  }

  .home-followup-item,
  .home-planning-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-hero-actions,
  .home-action-grid,
  .home-top-overview__meta {
    flex-direction: column;
  }
}
</style>

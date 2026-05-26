<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'
import { curatedMasterclasses } from '@/data/curatedMasterclasses'
import {
  getMasterclasses,
  getMasterclassRegistrationSummary,
  invalidateContent,
} from '@/services/contentService'

const MASTERCLASS_IMAGE_MAX_SIZE = 1024 * 1024 * 1.5
const auth = useAuthStore()

const masterclasses = ref([])
const profile = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const registrations = ref([])
const coachRegistrations = ref([])
const registrationSummary = ref({})
const registerError = ref('')
const registerLoadingId = ref('')
const cancelLoadingId = ref('')
const coachDecisionId = ref('')

const formError = ref('')
const formLoading = ref(false)
const editingMasterclassId = ref('')
const deleteLoadingId = ref('')
const duplicateLoadingId = ref('')
const searchQuery = ref('')
const filterLevel = ref('all')
const filterFormat = ref('all')
const filterStatus = ref('all')
const sortOption = ref('date_asc')
const pageSize = ref(6)
const scheduledPage = ref(1)
const allPage = ref(1)
const featuredReorderIds = ref([])
const draggedFeaturedId = ref('')
const reorderLoading = ref(false)

const newMasterclass = ref(createEmptyMasterclass())

const levelOptions = ['Tous niveaux', 'Débutant', 'Intermédiaire', 'Avancé']
const formatOptions = [
  { title: 'En ligne', value: 'online' },
  { title: 'Présentiel', value: 'in_person' },
  { title: 'Hybride', value: 'hybrid' },
]
const statusOptions = [
  { title: 'Brouillon', value: 'draft' },
  { title: 'Planifiée', value: 'scheduled' },
  { title: 'Terminée', value: 'completed' },
  { title: 'Annulée', value: 'cancelled' },
]
const languageOptions = ['Français', 'Anglais', 'Bilingue']
const filterLevelOptions = ['all', ...levelOptions]
const filterFormatOptions = ['all', ...formatOptions.map((item) => item.value)]
const filterStatusOptions = ['all', 'draft', 'scheduled', 'completed', 'cancelled']
const sortOptions = [
  { title: 'Date proche', value: 'date_asc' },
  { title: 'Date lointaine', value: 'date_desc' },
  { title: 'Plus populaires', value: 'popular' },
  { title: 'Titre A-Z', value: 'title_asc' },
]
const pageSizeOptions = [6, 9, 12]
const externalMasterclasses = curatedMasterclasses

const externalMasterclassOpenId = ref(externalMasterclasses[0]?.id || '')
const featuredExternalMasterclasses = computed(() => externalMasterclasses.filter((item) => item.featured))
const upcomingExternalMasterclasses = computed(() => externalMasterclasses)

const toggleExternalMasterclass = (id) => {
  externalMasterclassOpenId.value = externalMasterclassOpenId.value === id ? '' : id
}

const isExternalMasterclassOpen = (id) => externalMasterclassOpenId.value === id

function createEmptyMasterclass() {
  return {
    title: '',
    subtitle: '',
    description: '',
    level: 'Tous niveaux',
    format: 'online',
    language: 'Français',
    scheduleAt: '',
    registrationDeadline: '',
    duration: '90 min',
    capacity: 30,
    location: 'En ligne',
    city: '',
    address: '',
    price: 'Gratuit',
    tags: '',
    targetAudience: '',
    prerequisites: '',
    agenda: '',
    takeaways: '',
    coverImage: '',
    meetingLink: '',
    replayAvailable: false,
    certificateAvailable: false,
    supportIncluded: false,
    speakerBio: '',
    featured: false,
    status: 'scheduled',
  }
}

function masterclassToForm(item) {
  return {
    title: item.title || '',
    subtitle: item.subtitle || '',
    description: item.description || '',
    level: item.level || 'Tous niveaux',
    format: item.format || 'online',
    language: item.language || 'Français',
    scheduleAt: item.scheduleAt || '',
    registrationDeadline: item.registrationDeadline || '',
    duration: item.duration || '90 min',
    capacity: item.capacity || 30,
    location: item.location || '',
    city: item.city || '',
    address: item.address || '',
    price: item.price || 'Gratuit',
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    targetAudience: item.targetAudience || '',
    prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites.join('\n') : '',
    agenda: Array.isArray(item.agenda) ? item.agenda.join('\n') : '',
    takeaways: Array.isArray(item.takeaways) ? item.takeaways.join('\n') : '',
    coverImage: item.coverImage || '',
    meetingLink: item.meetingLink || '',
    replayAvailable: !!item.replayAvailable,
    certificateAvailable: !!item.certificateAvailable,
    supportIncluded: !!item.supportIncluded,
    speakerBio: item.speakerBio || '',
    featured: !!item.featured,
    status: item.status || 'scheduled',
  }
}

const role = computed(() => profile.value?.role || '—')
const isCoach = computed(() => role.value === 'coach')
const isLearner = computed(() => role.value === 'apprenant')
const isEditingMasterclass = computed(() => !!editingMasterclassId.value)
const formTitle = computed(() =>
  isEditingMasterclass.value ? 'Modifier ma masterclass' : 'Créer ma masterclass'
)
const formSubtitle = computed(() =>
  isEditingMasterclass.value
    ? 'Mettez à jour le contenu, la date, l’image ou les modalités de votre session.'
    : 'Créez une nouvelle masterclass avec image, programme, bénéfices et modalités détaillées.'
)

const now = () => new Date()

const scheduledMasterclasses = computed(() =>
  masterclasses.value.filter(
    (item) => item.status === 'scheduled' && item.scheduleAt && new Date(item.scheduleAt) >= now()
  )
)

const featuredMasterclasses = computed(() =>
  scheduledMasterclasses.value.filter((item) => item.featured)
)

const allMasterclasses = computed(() => masterclasses.value)

const matchesMasterclassFilters = (item) => {
  const queryValue = searchQuery.value.trim().toLowerCase()
  const matchesQuery =
    !queryValue ||
    [
      item.title,
      item.subtitle,
      item.description,
      item.location,
      item.coachName,
      ...(Array.isArray(item.tags) ? item.tags : []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(queryValue))

  const matchesLevel = filterLevel.value === 'all' || item.level === filterLevel.value
  const matchesFormat = filterFormat.value === 'all' || item.format === filterFormat.value
  const matchesStatus = filterStatus.value === 'all' || item.status === filterStatus.value

  return matchesQuery && matchesLevel && matchesFormat && matchesStatus
}

const filteredMasterclasses = computed(() => allMasterclasses.value.filter(matchesMasterclassFilters))

const filteredScheduledMasterclasses = computed(() => scheduledMasterclasses.value.filter(matchesMasterclassFilters))

const filteredFeaturedMasterclasses = computed(() => featuredMasterclasses.value.filter(matchesMasterclassFilters))
const featuredDisplayMasterclasses = computed(() =>
  isCoach.value
    ? sortItems(filteredFeaturedMasterclasses.value.filter((item) => isOwnedMasterclass(item)))
    : sortItems(filteredFeaturedMasterclasses.value)
)

const myScheduled = computed(() =>
  masterclasses.value.filter(
    (item) =>
      item.coachId === profile.value?.uid &&
      ['scheduled', 'draft'].includes(item.status) &&
      item.scheduleAt &&
      new Date(item.scheduleAt) >= now()
  )
)

const filteredMyScheduled = computed(() => myScheduled.value.filter(matchesMasterclassFilters))

const sortedFeaturedMasterclasses = computed(() => sortItems(filteredFeaturedMasterclasses.value))
const sortedScheduledMasterclasses = computed(() => sortItems(filteredScheduledMasterclasses.value))
const sortedMyScheduled = computed(() => sortItems(filteredMyScheduled.value))
const sortedAllMasterclasses = computed(() => sortItems(filteredMasterclasses.value))
const allDisplayMasterclasses = computed(() =>
  isCoach.value
    ? sortItems(filteredMasterclasses.value.filter((item) => isOwnedMasterclass(item)))
    : sortedAllMasterclasses.value
)

const scheduledList = computed(() =>
  isCoach.value ? sortedMyScheduled.value : sortedScheduledMasterclasses.value
)

const paginatedScheduledMasterclasses = computed(() =>
  paginateItems(scheduledList.value, scheduledPage.value)
)

const paginatedAllMasterclasses = computed(() =>
  paginateItems(allDisplayMasterclasses.value, allPage.value)
)

const scheduledPageCount = computed(() =>
  Math.max(1, Math.ceil(scheduledList.value.length / pageSize.value))
)

const allPageCount = computed(() =>
  Math.max(1, Math.ceil(allDisplayMasterclasses.value.length / pageSize.value))
)

const ownedFeaturedMasterclasses = computed(() =>
  sortItems(masterclasses.value.filter((item) => item.featured && isOwnedMasterclass(item)))
)

const orderedOwnedFeaturedMasterclasses = computed(() => {
  const itemsById = new Map(ownedFeaturedMasterclasses.value.map((item) => [item.id, item]))
  return featuredReorderIds.value.map((id) => itemsById.get(id)).filter(Boolean)
})

const hasFeaturedReorderChanges = computed(() => {
  const currentIds = ownedFeaturedMasterclasses.value.map((item) => item.id)
  return currentIds.join('|') !== featuredReorderIds.value.join('|')
})

const registrationMap = computed(() => {
  const map = {}
  registrations.value.forEach((item) => {
    map[item.masterclassId] = item
  })
  return map
})

const coverPreview = computed(() => newMasterclass.value.coverImage || '')
const needsMeetingLink = computed(
  () => ['online', 'hybrid'].includes(newMasterclass.value.format)
)
const needsAddress = computed(
  () => ['in_person', 'hybrid'].includes(newMasterclass.value.format)
)

const registrationCount = (id) => registrationSummary.value[id] || 0

const seatsLeft = (item) => {
  const capacity = Number(item.capacity)
  if (!Number.isFinite(capacity)) return null
  return Math.max(capacity - registrationCount(item.id), 0)
}

const isRegistrationClosed = (item) => {
  if (!item.registrationDeadline) return false
  const deadline = new Date(item.registrationDeadline).getTime()
  return !Number.isNaN(deadline) && deadline < Date.now()
}

const canRegister = (item) => {
  if (!isLearner.value) return false
  if (item.status !== 'scheduled') return false
  if (!item.scheduleAt) return false
  const scheduleTime = new Date(item.scheduleAt).getTime()
  if (!Number.isNaN(scheduleTime) && scheduleTime < Date.now()) return false
  if (isRegistrationClosed(item)) return false
  if (registrationMap.value[item.id]) return false
  const remaining = seatsLeft(item)
  if (remaining !== null && remaining <= 0) return false
  return true
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatShortDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMasterclassStatus = (status) => {
  if (status === 'draft') return 'Brouillon'
  if (status === 'completed') return 'Terminée'
  if (status === 'cancelled') return 'Annulée'
  return 'Planifiée'
}

const formatMasterclassFormat = (format) => {
  if (format === 'in_person') return 'Présentiel'
  if (format === 'hybrid') return 'Hybride'
  return 'En ligne'
}

const filterFormatLabel = (format) => {
  if (format === 'all') return 'Tous formats'
  return formatMasterclassFormat(format)
}

const filterLevelLabel = (level) => (level === 'all' ? 'Tous niveaux' : level)

const filterStatusLabel = (status) => {
  if (status === 'all') return 'Tous statuts'
  return formatMasterclassStatus(status)
}

const sortLabel = (value) =>
  sortOptions.find((option) => option.value === value)?.title || 'Date proche'

const pageSizeLabel = (value) => `${value} / page`

const getMasterclassApiMessage = (error, fallbackMessage) => {
  const status = error?.response?.status
  const backendMessage = error?.response?.data?.message

  if (status === 503) return 'Connexion Firebase indisponible. Reessayez dans un instant.'
  if (status === 403) return 'Votre compte ne permet pas cette action pour le moment.'
  if (status === 409) return backendMessage || 'Cette action a deja ete effectuee.'
  if (status === 400) return backendMessage || fallbackMessage
  if (status === 404) return backendMessage || fallbackMessage
  return backendMessage || fallbackMessage
}

const registrationStatusClass = (status) => {
  if (status === 'confirmed' || status === 'accepted') return 'status-chip--success'
  if (status === 'declined' || status === 'rejected') return 'status-chip--danger'
  return 'status-chip--warning'
}

const masterclassRegistrationsMap = computed(() => {
  const map = {}
  coachRegistrations.value.forEach((registration) => {
    if (!registration.masterclassId) return
    if (!map[registration.masterclassId]) {
      map[registration.masterclassId] = {
        total: 0,
        confirmed: 0,
        pending: 0,
        declined: 0,
      }
    }

    map[registration.masterclassId].total += 1

    if (registration.status === 'confirmed') {
      map[registration.masterclassId].confirmed += 1
    } else if (registration.status === 'declined') {
      map[registration.masterclassId].declined += 1
    } else {
      map[registration.masterclassId].pending += 1
    }
  })

  return map
})

const getMasterclassStats = (item) => {
  const coachStats = masterclassRegistrationsMap.value[item.id] || {
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
  }
  const total = registrationCount(item.id)

  return {
    total,
    confirmed: coachStats.confirmed,
    pending: coachStats.pending,
    declined: coachStats.declined,
    remaining: seatsLeft(item),
  }
}

const compareMasterclasses = (left, right) => {
  if (sortOption.value === 'title_asc') {
    return (left.title || '').localeCompare(right.title || '', 'fr', { sensitivity: 'base' })
  }

  if (sortOption.value === 'popular') {
    return registrationCount(right.id) - registrationCount(left.id)
  }

  if (sortOption.value === 'date_desc') {
    const leftTime = left.scheduleAt ? new Date(left.scheduleAt).getTime() : 0
    const rightTime = right.scheduleAt ? new Date(right.scheduleAt).getTime() : 0
    return rightTime - leftTime
  }

  const leftTime = left.scheduleAt ? new Date(left.scheduleAt).getTime() : 0
  const rightTime = right.scheduleAt ? new Date(right.scheduleAt).getTime() : 0
  return leftTime - rightTime
}

const sortItems = (items) => [...items].sort(compareMasterclasses)

const paginateItems = (items, page) => {
  const start = (page - 1) * pageSize.value
  return items.slice(start, start + pageSize.value)
}

const parseCommaList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const parseLineList = (value) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const coverStyle = (item) => {
  if (!item.coverImage) return {}
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.52)), url('${item.coverImage}')`,
  }
}

const isOwnedMasterclass = (item) => item?.coachId && item.coachId === profile.value?.uid

const syncFeaturedReorder = () => {
  featuredReorderIds.value = ownedFeaturedMasterclasses.value.map((item) => item.id)
}

const moveFeaturedItem = (draggedId, targetId) => {
  if (!draggedId || !targetId || draggedId === targetId) return

  const nextIds = [...featuredReorderIds.value]
  const fromIndex = nextIds.indexOf(draggedId)
  const toIndex = nextIds.indexOf(targetId)
  if (fromIndex === -1 || toIndex === -1) return

  const [movedId] = nextIds.splice(fromIndex, 1)
  nextIds.splice(toIndex, 0, movedId)
  featuredReorderIds.value = nextIds
}

const handleFeaturedDragStart = (id) => {
  draggedFeaturedId.value = id
}

const handleFeaturedDrop = (id) => {
  moveFeaturedItem(draggedFeaturedId.value, id)
  draggedFeaturedId.value = ''
}

const saveFeaturedOrder = async () => {
  if (!featuredReorderIds.value.length) return

  reorderLoading.value = true
  try {
    await api.post('/masterclasses/reorder', { ids: featuredReorderIds.value })
    invalidateContent('masterclasses')
    await loadMasterclasses()
    syncFeaturedReorder()
  } catch (error) {
    formError.value = 'Impossible de réorganiser les masterclass mises en avant.'
    console.error(error)
  } finally {
    reorderLoading.value = false
  }
}

const loadProfile = async () => {
  profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
}

const loadMasterclasses = async () => {
  masterclasses.value = await getMasterclasses()
}

const loadRegistrations = async () => {
  const requests = [getMasterclassRegistrationSummary()]

  if (isLearner.value) {
    requests.push(api.get('/masterclasses/registrations/me'))
  }

  if (isCoach.value) {
    requests.push(api.get('/masterclasses/registrations/coach'))
  }

  const results = await Promise.allSettled(requests)

  const summaryResult = results[0]
  registrationSummary.value =
    summaryResult?.status === 'fulfilled' && summaryResult.value && typeof summaryResult.value === 'object'
      ? summaryResult.value
      : registrationSummary.value

  let resultIndex = 1

  if (isLearner.value) {
    const learnerResult = results[resultIndex]
    if (learnerResult?.status === 'fulfilled' && Array.isArray(learnerResult.value.data)) {
      registrations.value = learnerResult.value.data
    }
    resultIndex += 1
  }

  if (isCoach.value) {
    const coachResult = results[resultIndex]
    if (coachResult?.status === 'fulfilled' && Array.isArray(coachResult.value.data)) {
      coachRegistrations.value = coachResult.value.data
    }
  }
}

const applyRegistrationOptimisticState = (item) => {
  const existing = registrations.value.find((registration) => registration.masterclassId === item.id)
  if (existing) return

  registrations.value = [
    {
      id: `optimistic-${item.id}`,
      masterclassId: item.id,
      masterclassTitle: item.title || 'Masterclass',
      scheduleAt: item.scheduleAt || '',
      coachId: item.coachId || null,
      coachName: item.coachName || 'Coach',
      status: 'registered',
      createdAt: new Date().toISOString(),
    },
    ...registrations.value,
  ]

  registrationSummary.value = {
    ...registrationSummary.value,
    [item.id]: Number(registrationSummary.value[item.id] || 0) + 1,
  }
}

const registerToMasterclass = async (item) => {
  registerError.value = ''
  registerLoadingId.value = item.id

  try {
    const existing = registrations.value.find((registration) => registration.masterclassId === item.id)
    if (existing) {
      registerError.value = 'Vous etes deja inscrit a cette masterclass.'
      return
    }

    if (item.registrationDeadline) {
      const deadline = new Date(item.registrationDeadline).getTime()
      if (!Number.isNaN(deadline) && deadline < Date.now()) {
        registerError.value = 'Les inscriptions a cette masterclass sont closes.'
        return
      }
    }

    if (item.scheduleAt) {
      const scheduleTime = new Date(item.scheduleAt).getTime()
      if (!Number.isNaN(scheduleTime) && scheduleTime < Date.now()) {
        registerError.value = 'Cette masterclass est deja terminee.'
        return
      }
    }

    const registeredCount = Number(registrationSummary.value[item.id] || 0)
    const capacity = Number(item.capacity)
    if (Number.isFinite(capacity) && capacity > 0 && registeredCount >= capacity) {
      registerError.value = 'Cette masterclass est complete.'
      return
    }

    const response = await api.post(`/masterclasses/${item.id}/register`)
    if (response?.status === 201) {
      applyRegistrationOptimisticState(item)
    }
    invalidateContent('masterclass-registration-summary')
    void loadRegistrations()
  } catch (error) {
    registerError.value =
      error?.response?.status === 409
        ? 'Vous etes deja inscrit a cette masterclass.'
        : error?.response?.status === 403
        ? 'Votre compte doit etre apprenant pour s inscrire.'
        : error?.response?.status === 503
        ? 'Connexion Firebase indisponible. Reessayez dans un instant.'
        : getMasterclassApiMessage(error, 'Impossible de s inscrire a la masterclass.')
  } finally {
    registerLoadingId.value = ''
  }
}

const cancelRegistration = async (registration) => {
  registerError.value = ''
  cancelLoadingId.value = registration.id

  try {
    await api.delete(`/masterclasses/registrations/${registration.id}`)
    invalidateContent('masterclass-registration-summary')
    await loadRegistrations()
  } catch (error) {
    registerError.value = getMasterclassApiMessage(error, 'Impossible d annuler l inscription.')
  } finally {
    cancelLoadingId.value = ''
  }
}

const updateRegistrationStatus = async (registration, status) => {
  coachDecisionId.value = registration.id

  try {
    await api.patch(`/masterclasses/registrations/${registration.id}`, { status })
    await loadRegistrations()
  } catch (error) {
    registerError.value = getMasterclassApiMessage(error, 'Impossible de mettre a jour l inscription.')
  } finally {
    coachDecisionId.value = ''
  }
}

const handleCoverImageSelected = (file) => {
  if (!file) {
    newMasterclass.value.coverImage = ''
    return
  }

  if (file.size > MASTERCLASS_IMAGE_MAX_SIZE) {
    formError.value = 'L’image dépasse 1.5 Mo. Choisissez un fichier plus léger.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    newMasterclass.value.coverImage = reader.result
  }
  reader.readAsDataURL(file)
}

const clearCoverImage = () => {
  newMasterclass.value.coverImage = ''
}

const resetMasterclassForm = () => {
  editingMasterclassId.value = ''
  newMasterclass.value = createEmptyMasterclass()
  formError.value = ''
}

const startEditMasterclass = (item) => {
  if (!isOwnedMasterclass(item)) return
  editingMasterclassId.value = item.id
  newMasterclass.value = masterclassToForm(item)
  formError.value = ''
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

const cancelEditMasterclass = () => {
  resetMasterclassForm()
}

const deleteMasterclass = async (item) => {
  if (!isOwnedMasterclass(item)) return
  const confirmed = window.confirm(`Supprimer la masterclass "${item.title}" ?`)
  if (!confirmed) return

  deleteLoadingId.value = item.id
  try {
    await api.delete(`/masterclasses/${item.id}`)
    invalidateContent('masterclasses', 'masterclass-registration-summary')
    if (editingMasterclassId.value === item.id) {
      resetMasterclassForm()
    }
    await loadMasterclasses()
    await loadRegistrations()
  } catch (error) {
    formError.value = getMasterclassApiMessage(error, 'Impossible de supprimer la masterclass.')
  } finally {
    deleteLoadingId.value = ''
  }
}

const duplicateMasterclass = async (item) => {
  if (!isOwnedMasterclass(item)) return

  duplicateLoadingId.value = item.id
  try {
    await api.post('/masterclasses', {
      ...item,
      title: `${item.title} (copie)`,
      status: 'draft',
      featured: false,
    })
    invalidateContent('masterclasses')
    await loadMasterclasses()
  } catch (error) {
    formError.value = getMasterclassApiMessage(error, 'Impossible de dupliquer la masterclass.')
  } finally {
    duplicateLoadingId.value = ''
  }
}

const handleSubmitMasterclass = async () => {
  formError.value = ''

  if (!newMasterclass.value.title || !newMasterclass.value.description || !newMasterclass.value.scheduleAt) {
    formError.value = 'Merci de renseigner le titre, la description et la date.'
    return
  }

  if (needsMeetingLink.value && !newMasterclass.value.meetingLink && newMasterclass.value.format !== 'hybrid') {
    formError.value = 'Ajoutez un lien de session pour une masterclass en ligne.'
    return
  }

  formLoading.value = true
  try {
    const payload = {
      ...newMasterclass.value,
      tags: newMasterclass.value.tags ? parseCommaList(newMasterclass.value.tags) : [],
      prerequisites: newMasterclass.value.prerequisites
        ? parseLineList(newMasterclass.value.prerequisites)
        : [],
      agenda: newMasterclass.value.agenda ? parseLineList(newMasterclass.value.agenda) : [],
      takeaways: newMasterclass.value.takeaways
        ? parseLineList(newMasterclass.value.takeaways)
        : [],
    }

    if (isEditingMasterclass.value) {
      await api.patch(`/masterclasses/${editingMasterclassId.value}`, payload)
    } else {
      await api.post('/masterclasses', payload)
    }

    resetMasterclassForm()
    invalidateContent('masterclasses')
    await loadMasterclasses()
    await loadRegistrations()
  } catch (error) {
    formError.value = getMasterclassApiMessage(
      error,
      isEditingMasterclass.value
        ? 'Impossible de mettre a jour la masterclass.'
        : 'Impossible de creer la masterclass.'
    )
  } finally {
    formLoading.value = false
  }
}

watch(
  [searchQuery, filterLevel, filterFormat, filterStatus, sortOption, pageSize, isCoach],
  () => {
    scheduledPage.value = 1
    allPage.value = 1
  }
)

watch(scheduledPageCount, (count) => {
  if (scheduledPage.value > count) {
    scheduledPage.value = count
  }
})

watch(allPageCount, (count) => {
  if (allPage.value > count) {
    allPage.value = count
  }
})

watch(
  () => ownedFeaturedMasterclasses.value.map((item) => item.id).join('|'),
  () => {
    syncFeaturedReorder()
  },
  { immediate: true }
)

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await loadProfile()
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-container class="masterclass-container" fluid>
    <div class="masterclass-backdrop" aria-hidden="true"></div>

    <v-row class="masterclass-hero" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="masterclass-hero-card" elevation="8">
          <div class="masterclass-hero-content">
            <div class="masterclass-hero-left">
              <div class="masterclass-hero-title">Masterclass</div>
            </div>

            <div class="masterclass-hero-stats">
              <div class="masterclass-hero-stat-card">
                <div class="masterclass-hero-stat">{{ upcomingExternalMasterclasses.length }}</div>
                <div class="masterclass-hero-label">planifiées</div>
              </div>
              <div class="masterclass-hero-stat-card">
                <div class="masterclass-hero-stat">{{ featuredExternalMasterclasses.length }}</div>
                <div class="masterclass-hero-label">sélectionnées</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="masterclass-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-progress-linear v-if="loading" color="#1c7c7d" indeterminate class="mb-6" />

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div v-if="!loading && upcomingExternalMasterclasses.length" class="masterclass-section">
          <div class="masterclass-section-title">Masterclass retenues</div>
        </div>

        <v-row v-if="!loading && upcomingExternalMasterclasses.length" class="masterclass-list">
          <v-col cols="12" md="6" v-for="item in upcomingExternalMasterclasses" :key="`featured-${item.id}`">
            <v-card class="masterclass-card masterclass-card--featured" elevation="6">
              <div class="masterclass-card-body">
                <div class="masterclass-card-head">
                  <div class="masterclass-card-head-top">
                    <div class="masterclass-card-badge">Masterclass</div>
                    <div class="masterclass-card-pill masterclass-card-pill--ghost">{{ item.sourceLabel }}</div>
                  </div>
                  <div class="masterclass-card-title">{{ item.title }}</div>
                  <div v-if="item.subtitle" class="masterclass-card-subtitle">{{ item.subtitle }}</div>
                </div>

                <div class="masterclass-card-inline-chips">
                  <span class="masterclass-inline-chip">{{ formatMasterclassFormat(item.format) }}</span>
                  <span class="masterclass-inline-chip">{{ item.language }}</span>
                  <span class="masterclass-inline-chip">{{ item.organizer }}</span>
                </div>

                <div class="masterclass-card-description">{{ item.description }}</div>

                <div class="masterclass-card-highlights">
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-calendar-clock</v-icon>
                    <span>{{ item.displayDate }}</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ item.duration }}</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-map-marker-outline</v-icon>
                    <span>{{ item.location }}</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ item.price }}</span>
                  </div>
                </div>

                <div class="masterclass-actions">
                  <v-btn
                    class="masterclass-action-btn-outline"
                    size="small"
                    @click="toggleExternalMasterclass(item.id)"
                  >
                    {{ isExternalMasterclassOpen(item.id) ? 'Fermer détails' : 'Voir détails' }}
                  </v-btn>
                  <v-btn class="masterclass-btn" size="small" :href="item.sourceUrl" target="_blank">
                    Voir la fiche
                  </v-btn>
                </div>

                <div v-if="isExternalMasterclassOpen(item.id)" class="masterclass-card-block masterclass-card-block--expanded">
                  <div v-if="item.targetAudience" class="masterclass-card-note">
                    <strong>Pour :</strong> {{ item.targetAudience }}
                  </div>
                  <div v-if="item.tags?.length" class="masterclass-tags">
                    <v-chip v-for="tag in item.tags" :key="tag" size="small" class="masterclass-chip">
                      {{ tag }}
                    </v-chip>
                  </div>
                  <div v-if="item.takeaways?.length" class="masterclass-card-block">
                    <div class="masterclass-card-block-title">Points forts</div>
                    <div class="masterclass-card-list">
                      <div v-for="entry in item.takeaways" :key="entry" class="masterclass-card-list-item">
                        {{ entry }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.masterclass-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.masterclass-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.masterclass-hero,
.masterclass-grid {
  position: relative;
  z-index: 1;
}

.masterclass-hero-card {
  border-radius: 28px;
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 241, 233, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 56px rgba(21, 18, 14, 0.1);
}

.masterclass-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.masterclass-hero-title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #1c1a16;
}

.masterclass-hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.masterclass-hero-stat-card {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(28, 26, 22, 0.08);
}

.masterclass-hero-stat {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  color: #1c1a16;
}

.masterclass-hero-label {
  font-size: 12px;
  color: #625b53;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.masterclass-grid {
  margin-top: 28px;
}

.masterclass-section {
  margin: 24px 0 12px;
}

.masterclass-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #133a3b;
}

.masterclass-section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.masterclass-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 8px 0 20px;
}

.masterclass-list {
  row-gap: 24px;
}

.masterclass-card {
  overflow: hidden;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  height: 100%;
  display: grid;
}

.masterclass-card--featured {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 250, 248, 0.98)),
    #ffffff;
  border-color: rgba(19, 58, 59, 0.08);
  box-shadow: 0 22px 44px rgba(12, 31, 32, 0.12);
}

.masterclass-card-cover {
  min-height: 220px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.52)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.masterclass-card-cover--compact {
  min-height: 180px;
}

.masterclass-card-cover-top,
.masterclass-card-cover-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.masterclass-card-pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.07);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
}

.masterclass-card-pill--ghost {
  background: rgba(19, 58, 59, 0.1);
}

.masterclass-card-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
}

.masterclass-card-head {
  display: grid;
  gap: 10px;
  padding: 0 0 2px;
}

.masterclass-card-head--compact {
  gap: 8px;
}

.masterclass-card-head-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.masterclass-card-title {
  color: #133a3b;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.masterclass-card-subtitle {
  color: rgba(19, 58, 59, 0.62);
  font-size: 13px;
  line-height: 1.45;
}

.masterclass-card-cover-title {
  width: 100%;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
}

.masterclass-card-cover-subtitle {
  width: 100%;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.masterclass-card-body {
  padding: 20px;
  display: grid;
  gap: 14px;
}

.masterclass-card-inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.masterclass-inline-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 600;
}

.masterclass-card-description {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(19, 58, 59, 0.74);
}

.masterclass-card-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.masterclass-card-highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
  font-size: 13px;
  color: rgba(19, 58, 59, 0.78);
}

.masterclass-card-note {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(245, 177, 63, 0.12);
  color: rgba(44, 28, 2, 0.88);
  font-size: 13px;
}

.masterclass-card-block {
  display: grid;
  gap: 8px;
}

.masterclass-card-block--expanded {
  padding-top: 6px;
  border-top: 1px solid rgba(19, 58, 59, 0.08);
}

.masterclass-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.masterclass-stat-chip {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
}

.masterclass-card-block-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(19, 58, 59, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.masterclass-card-list {
  display: grid;
  gap: 8px;
}

.masterclass-card-list-item {
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.72);
}

.masterclass-card-list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1c7c7d;
}

.masterclass-card-meta {
  display: grid;
  gap: 8px;
}

.masterclass-card-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.65);
}

.masterclass-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.masterclass-chip {
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 600;
}

.status-chip--success {
  background: rgba(31, 143, 87, 0.14);
  color: #1f8f57;
}

.status-chip--warning {
  background: rgba(186, 123, 17, 0.14);
  color: #ba7b11;
}

.status-chip--danger {
  background: rgba(185, 74, 47, 0.14);
  color: #b94a2f;
}

.masterclass-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.masterclass-owner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.masterclass-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0 4px;
  flex-wrap: wrap;
}

.masterclass-pagination-label {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.masterclass-btn {
  text-transform: none;
  font-weight: 600;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

.masterclass-panel {
  margin-top: 32px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.masterclass-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.masterclass-panel-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
}

.masterclass-panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.masterclass-reorder-list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.masterclass-reorder-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(246, 242, 234, 0.72);
  cursor: grab;
}

.masterclass-reorder-rank {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 700;
}

.masterclass-reorder-main {
  min-width: 0;
}

.masterclass-reorder-title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.masterclass-reorder-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.masterclass-form-cover {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.masterclass-form-cover-preview {
  min-height: 220px;
  border-radius: 22px;
  overflow: hidden;
  background: #f8fbfb;
  border: 1px solid rgba(19, 58, 59, 0.08);
  display: flex;
}

.masterclass-form-cover-overlay {
  width: 100%;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #133a3b;
}

.masterclass-form-cover-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(19, 58, 59, 0.58);
}

.masterclass-form-cover-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.masterclass-form-cover-subtitle {
  font-size: 14px;
  color: rgba(19, 58, 59, 0.72);
}

.masterclass-form-cover-actions {
  display: grid;
  gap: 10px;
  align-content: start;
}

.masterclass-form {
  margin-top: 16px;
}

.masterclass-error {
  margin: 10px 0;
  font-size: 13px;
  color: #b94a2f;
}

.masterclass-empty {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.masterclass-registration-list {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.masterclass-registration-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.05);
}

.masterclass-registration-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.masterclass-registration-title {
  font-size: 14px;
  font-weight: 600;
  color: #133a3b;
}

.masterclass-registration-subtitle {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.masterclass-action-btn {
  text-transform: none;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

.masterclass-action-btn-outline {
  text-transform: none;
  border-color: rgba(28, 124, 125, 0.4);
  color: #1c7c7d;
}

.masterclass-action-btn-danger {
  text-transform: none;
  border: 1px solid rgba(185, 74, 47, 0.24);
  background: rgba(185, 74, 47, 0.08);
  color: #b94a2f;
}

.masterclass-form-footer {
  margin-top: 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .masterclass-filters {
    grid-template-columns: 1fr;
  }

  .masterclass-card-highlights {
    grid-template-columns: 1fr;
  }

  .masterclass-form-cover {
    grid-template-columns: 1fr;
  }

  .masterclass-registration-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

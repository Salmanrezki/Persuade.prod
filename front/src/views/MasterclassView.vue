<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import logoUrl from '@/assets/logo.png'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'
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
  isEditingMasterclass.value ? 'Modifier la masterclass' : 'Planifier une masterclass'
)
const formSubtitle = computed(() =>
  isEditingMasterclass.value
    ? 'Mettez à jour le contenu, la date, l’image ou les modalités de votre session.'
    : 'Ajoutez une image, un programme, des bénéfices et les modalités détaillées.'
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

const scheduledList = computed(() =>
  isCoach.value ? sortedMyScheduled.value : sortedScheduledMasterclasses.value
)

const paginatedScheduledMasterclasses = computed(() =>
  paginateItems(scheduledList.value, scheduledPage.value)
)

const paginatedAllMasterclasses = computed(() =>
  paginateItems(sortedAllMasterclasses.value, allPage.value)
)

const scheduledPageCount = computed(() =>
  Math.max(1, Math.ceil(scheduledList.value.length / pageSize.value))
)

const allPageCount = computed(() =>
  Math.max(1, Math.ceil(sortedAllMasterclasses.value.length / pageSize.value))
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
  const summary = await getMasterclassRegistrationSummary()
  registrationSummary.value = summary && typeof summary === 'object' ? summary : {}

  if (isLearner.value) {
    const res = await api.get('/masterclasses/registrations/me')
    registrations.value = Array.isArray(res.data) ? res.data : []
  }

  if (isCoach.value) {
    const res = await api.get('/masterclasses/registrations/coach')
    coachRegistrations.value = Array.isArray(res.data) ? res.data : []
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

    await api.post(`/masterclasses/${item.id}/register`)
    invalidateContent('masterclass-registration-summary')
    await loadRegistrations()
  } catch (error) {
    registerError.value = 'Impossible de s’inscrire à la masterclass.'
    console.error(error)
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
    registerError.value = 'Impossible d’annuler l’inscription.'
    console.error(error)
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
    console.error(error)
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
    formError.value = 'Impossible de supprimer la masterclass.'
    console.error(error)
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
    formError.value = 'Impossible de dupliquer la masterclass.'
    console.error(error)
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
    formError.value = isEditingMasterclass.value
      ? 'Impossible de mettre à jour la masterclass.'
      : 'Impossible de créer la masterclass.'
    console.error(error)
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

  const [profileResult, masterclassesResult] = await Promise.allSettled([
    loadProfile(),
    loadMasterclasses(),
  ])

  if (profileResult.status === 'rejected') {
    console.error(profileResult.reason)
  }

  if (masterclassesResult.status === 'rejected') {
    errorMessage.value = 'Impossible de charger les masterclass.'
    console.error(masterclassesResult.reason)
  }

  try {
    await loadRegistrations()
  } catch (error) {
    console.error(error)
  }

  loading.value = false
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
              <div class="masterclass-brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="72" height="72" class="masterclass-logo" />
                <div class="masterclass-brand-text">Persuade</div>
              </div>
              <div class="masterclass-hero-title">Masterclass</div>
              <div class="masterclass-hero-subtitle">
                {{ isCoach ? 'Créez des sessions riches avec couverture, programme et infos détaillées.' : 'Explorez des masterclass plus complètes avec programme, image et modalités claires.' }}
              </div>
            </div>

            <div class="masterclass-hero-stats">
              <div class="masterclass-hero-stat-card">
                <div class="masterclass-hero-stat">{{ scheduledMasterclasses.length }}</div>
                <div class="masterclass-hero-label">planifiées</div>
              </div>
              <div class="masterclass-hero-stat-card">
              <div class="masterclass-hero-stat">{{ filteredFeaturedMasterclasses.length }}</div>
                <div class="masterclass-hero-label">mises en avant</div>
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

        <div v-if="!loading" class="masterclass-filters">
          <v-text-field
            v-model="searchQuery"
            label="Rechercher une masterclass"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="filterLevel"
            :items="filterLevelOptions"
            :item-title="filterLevelLabel"
            :item-value="(item) => item"
            label="Niveau"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="filterFormat"
            :items="filterFormatOptions"
            :item-title="filterFormatLabel"
            :item-value="(item) => item"
            label="Format"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="filterStatus"
            :items="filterStatusOptions"
            :item-title="filterStatusLabel"
            :item-value="(item) => item"
            label="Statut"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="sortOption"
            :items="sortOptions"
            item-title="title"
            item-value="value"
            label="Tri"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="pageSize"
            :items="pageSizeOptions"
            :item-title="pageSizeLabel"
            :item-value="(item) => item"
            label="Pagination"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>

        <div v-if="!loading && filteredFeaturedMasterclasses.length" class="masterclass-section">
          <div class="masterclass-section-title">Sélection du moment</div>
          <div class="masterclass-section-subtitle">
            Les masterclass les plus visibles et les plus complètes.
          </div>
        </div>

        <v-row v-if="!loading && sortedFeaturedMasterclasses.length" class="masterclass-list">
          <v-col cols="12" md="6" v-for="item in sortedFeaturedMasterclasses" :key="`featured-${item.id}`">
            <v-card class="masterclass-card masterclass-card--featured" elevation="6">
              <div class="masterclass-card-cover" :style="coverStyle(item)">
                <div class="masterclass-card-cover-top">
                  <div class="masterclass-card-pill">{{ item.level || 'Tous niveaux' }}</div>
                  <div class="masterclass-card-pill masterclass-card-pill--ghost">
                    {{ formatMasterclassStatus(item.status) }}
                  </div>
                </div>
                <div class="masterclass-card-cover-bottom">
                  <div class="masterclass-card-badge">À la une</div>
                  <div class="masterclass-card-cover-title">{{ item.title }}</div>
                  <div v-if="item.subtitle" class="masterclass-card-cover-subtitle">{{ item.subtitle }}</div>
                </div>
              </div>

              <div class="masterclass-card-body">
                <div class="masterclass-card-inline-chips">
                  <span class="masterclass-inline-chip">{{ formatMasterclassFormat(item.format) }}</span>
                  <span class="masterclass-inline-chip">{{ item.language || 'Français' }}</span>
                  <span class="masterclass-inline-chip" v-if="item.replayAvailable">Replay</span>
                  <span class="masterclass-inline-chip" v-if="item.certificateAvailable">Certificat</span>
                </div>

                <div class="masterclass-card-description">{{ item.description }}</div>

                <div class="masterclass-card-highlights">
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-calendar-clock</v-icon>
                    <span>{{ formatDateTime(item.scheduleAt) }}</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ item.duration || '—' }}</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-seat-outline</v-icon>
                    <span>{{ seatsLeft(item) !== null ? seatsLeft(item) : '—' }} places restantes</span>
                  </div>
                  <div class="masterclass-card-highlight">
                    <v-icon size="18">mdi-map-marker-outline</v-icon>
                    <span>{{ item.location || '—' }}</span>
                  </div>
                </div>

                <div v-if="item.targetAudience" class="masterclass-card-note">
                  <strong>Pour :</strong> {{ item.targetAudience }}
                </div>

                <div v-if="item.agenda?.length" class="masterclass-card-block">
                  <div class="masterclass-card-block-title">Programme</div>
                  <div class="masterclass-card-list">
                    <div v-for="entry in item.agenda.slice(0, 3)" :key="entry" class="masterclass-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-card-stats">
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).total }} inscrits</div>
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).confirmed }} confirmés</div>
                  <div class="masterclass-stat-chip" v-if="getMasterclassStats(item).remaining !== null">
                    {{ getMasterclassStats(item).remaining }} places libres
                  </div>
                </div>

                <div class="masterclass-actions">
                  <v-chip v-if="registrationMap[item.id]" size="small" class="masterclass-chip">Inscrit</v-chip>
                  <v-chip v-else-if="isRegistrationClosed(item)" size="small" class="masterclass-chip">Clôturée</v-chip>
                  <v-chip v-else-if="seatsLeft(item) === 0" size="small" class="masterclass-chip">Complet</v-chip>

                  <v-btn
                    v-if="canRegister(item)"
                    class="masterclass-btn"
                    size="large"
                    :loading="registerLoadingId === item.id"
                    @click="registerToMasterclass(item)"
                  >
                    S’inscrire
                  </v-btn>

                  <v-btn
                    v-else-if="registrationMap[item.id] && item.meetingLink"
                    class="masterclass-btn"
                    size="large"
                    :href="item.meetingLink"
                    target="_blank"
                  >
                    Rejoindre
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-owner-actions">
                  <v-btn
                    class="masterclass-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === item.id"
                    @click="duplicateMasterclass(item)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="masterclass-action-btn-outline" size="small" @click="startEditMasterclass(item)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="masterclass-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === item.id"
                    @click="deleteMasterclass(item)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading" class="masterclass-section">
          <div class="masterclass-section-title">
            {{ isCoach ? 'Mes masterclass planifiées' : 'Masterclass planifiées' }}
          </div>
          <div class="masterclass-section-subtitle">
            {{ isCoach ? 'Suivez vos sessions à venir et leur niveau de remplissage.' : 'Retrouvez les prochaines sessions ouvertes aux inscriptions.' }}
          </div>
        </div>

        <v-row v-if="!loading" class="masterclass-list">
          <v-col cols="12" md="4" v-for="item in paginatedScheduledMasterclasses" :key="item.id">
            <v-card class="masterclass-card" elevation="6">
              <div class="masterclass-card-cover masterclass-card-cover--compact" :style="coverStyle(item)">
                <div class="masterclass-card-cover-top">
                  <div class="masterclass-card-pill">{{ formatMasterclassFormat(item.format) }}</div>
                  <div class="masterclass-card-pill masterclass-card-pill--ghost">
                    {{ formatMasterclassStatus(item.status) }}
                  </div>
                </div>
                <div class="masterclass-card-cover-bottom">
                  <div class="masterclass-card-cover-title">{{ item.title }}</div>
                  <div v-if="item.subtitle" class="masterclass-card-cover-subtitle">{{ item.subtitle }}</div>
                </div>
              </div>

              <div class="masterclass-card-body">
                <div class="masterclass-card-description">{{ item.description }}</div>

                <div class="masterclass-card-meta">
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-calendar-clock</v-icon>
                    <span>{{ formatDateTime(item.scheduleAt) }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ item.duration || '—' }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-account-group-outline</v-icon>
                    <span>{{ item.capacity || '—' }} places</span>
                  </div>
                  <div class="masterclass-card-line" v-if="item.capacity">
                    <v-icon size="18">mdi-seat-outline</v-icon>
                    <span>{{ seatsLeft(item) !== null ? seatsLeft(item) : '—' }} restantes</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-map-marker-outline</v-icon>
                    <span>{{ item.location || '—' }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ item.price || '—' }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-translate</v-icon>
                    <span>{{ item.language || '—' }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-account-circle</v-icon>
                    <span>{{ item.coachName || 'Coach' }}</span>
                  </div>
                  <div class="masterclass-card-line" v-if="item.registrationDeadline">
                    <v-icon size="18">mdi-clock-check-outline</v-icon>
                    <span>Clôture: {{ formatShortDateTime(item.registrationDeadline) }}</span>
                  </div>
                </div>

                <div v-if="item.tags?.length" class="masterclass-tags">
                  <v-chip v-for="tag in item.tags" :key="tag" size="small" class="masterclass-chip">
                    {{ tag }}
                  </v-chip>
                </div>

                <div v-if="item.takeaways?.length" class="masterclass-card-block">
                  <div class="masterclass-card-block-title">Vous repartez avec</div>
                  <div class="masterclass-card-list">
                    <div v-for="entry in item.takeaways.slice(0, 3)" :key="entry" class="masterclass-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-card-stats">
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).total }} inscrits</div>
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).pending }} en attente</div>
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).confirmed }} confirmés</div>
                </div>

                <div class="masterclass-actions">
                  <v-chip v-if="registrationMap[item.id]" size="small" class="masterclass-chip">Inscrit</v-chip>
                  <v-chip v-else-if="isRegistrationClosed(item)" size="small" class="masterclass-chip">Clôturée</v-chip>
                  <v-chip v-else-if="seatsLeft(item) === 0" size="small" class="masterclass-chip">Complet</v-chip>

                  <v-btn
                    v-if="canRegister(item)"
                    class="masterclass-btn"
                    size="large"
                    :loading="registerLoadingId === item.id"
                    @click="registerToMasterclass(item)"
                  >
                    S’inscrire
                  </v-btn>

                  <v-btn
                    v-else-if="registrationMap[item.id] && item.meetingLink"
                    class="masterclass-btn"
                    size="large"
                    :href="item.meetingLink"
                    target="_blank"
                  >
                    Rejoindre
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-owner-actions">
                  <v-btn
                    class="masterclass-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === item.id"
                    @click="duplicateMasterclass(item)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="masterclass-action-btn-outline" size="small" @click="startEditMasterclass(item)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="masterclass-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === item.id"
                    @click="deleteMasterclass(item)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && scheduledPageCount > 1" class="masterclass-pagination">
          <div class="masterclass-pagination-label">
            {{ scheduledList.length }} résultat(s) · tri {{ sortLabel(sortOption).toLowerCase() }}
          </div>
          <v-pagination
            v-model="scheduledPage"
            :length="scheduledPageCount"
            rounded="circle"
            density="comfortable"
          />
        </div>

        <div v-if="!loading" class="masterclass-section">
          <div class="masterclass-section-title">Toutes les masterclass</div>
          <div class="masterclass-section-subtitle">
            Catalogue complet des sessions, y compris brouillons, passées ou annulées.
          </div>
        </div>

        <v-row v-if="!loading" class="masterclass-list">
          <v-col cols="12" md="4" v-for="item in paginatedAllMasterclasses" :key="`all-${item.id}`">
            <v-card class="masterclass-card" elevation="6">
              <div class="masterclass-card-cover masterclass-card-cover--compact" :style="coverStyle(item)">
                <div class="masterclass-card-cover-top">
                  <div class="masterclass-card-pill">{{ item.level || 'Tous niveaux' }}</div>
                  <div class="masterclass-card-pill masterclass-card-pill--ghost">
                    {{ formatMasterclassStatus(item.status) }}
                  </div>
                </div>
                <div class="masterclass-card-cover-bottom">
                  <div class="masterclass-card-cover-title">{{ item.title }}</div>
                </div>
              </div>

              <div class="masterclass-card-body">
                <div class="masterclass-card-inline-chips">
                  <span class="masterclass-inline-chip">{{ formatMasterclassFormat(item.format) }}</span>
                  <span class="masterclass-inline-chip">{{ item.language || 'Français' }}</span>
                  <span class="masterclass-inline-chip" v-if="item.supportIncluded">Supports inclus</span>
                </div>

                <div class="masterclass-card-description">{{ item.description }}</div>

                <div class="masterclass-card-meta">
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-calendar-clock</v-icon>
                    <span>{{ formatDateTime(item.scheduleAt) }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-map-marker-outline</v-icon>
                    <span>{{ item.location || '—' }}</span>
                  </div>
                  <div class="masterclass-card-line">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ item.price || '—' }}</span>
                  </div>
                </div>

                <div v-if="item.prerequisites?.length" class="masterclass-card-block">
                  <div class="masterclass-card-block-title">Pré-requis</div>
                  <div class="masterclass-card-list">
                    <div
                      v-for="entry in item.prerequisites.slice(0, 2)"
                      :key="entry"
                      class="masterclass-card-list-item"
                    >
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-card-stats">
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).total }} inscrits</div>
                  <div class="masterclass-stat-chip">{{ getMasterclassStats(item).declined }} refusés</div>
                  <div class="masterclass-stat-chip">{{ formatMasterclassStatus(item.status) }}</div>
                </div>

                <div v-if="isCoach && isOwnedMasterclass(item)" class="masterclass-owner-actions">
                  <v-btn
                    class="masterclass-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === item.id"
                    @click="duplicateMasterclass(item)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="masterclass-action-btn-outline" size="small" @click="startEditMasterclass(item)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="masterclass-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === item.id"
                    @click="deleteMasterclass(item)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && allPageCount > 1" class="masterclass-pagination">
          <div class="masterclass-pagination-label">
            {{ sortedAllMasterclasses.length }} masterclass au total
          </div>
          <v-pagination
            v-model="allPage"
            :length="allPageCount"
            rounded="circle"
            density="comfortable"
          />
        </div>

        <div v-if="isLearner" class="masterclass-panel">
          <div class="masterclass-panel-title">Mes inscriptions</div>
          <div class="masterclass-panel-subtitle">Retrouvez vos masterclass réservées.</div>

          <div v-if="registerError" class="masterclass-error">{{ registerError }}</div>

          <div v-if="registrations.length === 0" class="masterclass-empty">
            Aucune inscription pour le moment.
          </div>

          <div v-else class="masterclass-registration-list">
            <div class="masterclass-registration-item" v-for="registration in registrations" :key="registration.id">
              <div>
                <div class="masterclass-registration-title">{{ registration.masterclassTitle }}</div>
                <div class="masterclass-registration-subtitle">
                  {{ formatDateTime(registration.scheduleAt) }} · Coach: {{ registration.coachName }}
                </div>
              </div>
              <div class="masterclass-registration-actions">
                <v-chip size="small" class="masterclass-chip" :class="registrationStatusClass(registration.status)">
                  {{ registration.status === 'confirmed' ? 'Confirmé' : 'Inscrit' }}
                </v-chip>
                <v-btn
                  class="masterclass-action-btn-outline"
                  size="small"
                  :loading="cancelLoadingId === registration.id"
                  @click="cancelRegistration(registration)"
                >
                  Annuler
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="masterclass-panel">
          <div class="masterclass-panel-title">Inscriptions reçues</div>
          <div class="masterclass-panel-subtitle">Liste des apprenants inscrits.</div>

          <div v-if="coachRegistrations.length === 0" class="masterclass-empty">
            Aucune inscription reçue.
          </div>

          <div v-else class="masterclass-registration-list">
            <div class="masterclass-registration-item" v-for="registration in coachRegistrations" :key="registration.id">
              <div>
                <div class="masterclass-registration-title">{{ registration.masterclassTitle }}</div>
                <div class="masterclass-registration-subtitle">
                  {{ registration.studentName }} · {{ formatDateTime(registration.scheduleAt) }}
                </div>
              </div>
              <div class="masterclass-registration-actions">
                <v-chip
                  size="small"
                  class="masterclass-chip"
                  :class="registrationStatusClass(registration.status)"
                >
                  {{ registration.status === 'confirmed' ? 'Confirmé' : registration.status === 'declined' ? 'Refusé' : 'En attente' }}
                </v-chip>
                <v-btn
                  v-if="registration.status === 'registered'"
                  class="masterclass-action-btn"
                  size="small"
                  :loading="coachDecisionId === registration.id"
                  @click="updateRegistrationStatus(registration, 'confirmed')"
                >
                  Confirmer
                </v-btn>
                <v-btn
                  v-if="registration.status === 'registered'"
                  class="masterclass-action-btn-outline"
                  size="small"
                  :loading="coachDecisionId === registration.id"
                  @click="updateRegistrationStatus(registration, 'declined')"
                >
                  Refuser
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="masterclass-panel">
          <div class="masterclass-panel-header">
            <div>
              <div class="masterclass-panel-title">Réordonner la mise en avant</div>
              <div class="masterclass-panel-subtitle">
                Glissez vos masterclass mises en avant pour changer l’ordre d’affichage.
              </div>
            </div>
            <v-btn
              class="masterclass-action-btn"
              size="small"
              :disabled="orderedOwnedFeaturedMasterclasses.length < 2 || !hasFeaturedReorderChanges"
              :loading="reorderLoading"
              @click="saveFeaturedOrder"
            >
              Enregistrer l’ordre
            </v-btn>
          </div>

          <div v-if="orderedOwnedFeaturedMasterclasses.length < 2" class="masterclass-empty">
            Ajoutez au moins deux masterclass à la une pour les réordonner.
          </div>

          <div v-else class="masterclass-reorder-list">
            <div
              v-for="(item, index) in orderedOwnedFeaturedMasterclasses"
              :key="`reorder-${item.id}`"
              class="masterclass-reorder-item"
              draggable="true"
              @dragstart="handleFeaturedDragStart(item.id)"
              @dragover.prevent
              @drop="handleFeaturedDrop(item.id)"
            >
              <div class="masterclass-reorder-rank">{{ index + 1 }}</div>
              <div class="masterclass-reorder-main">
                <div class="masterclass-reorder-title">{{ item.title }}</div>
                <div class="masterclass-reorder-subtitle">
                  {{ formatDateTime(item.scheduleAt) }} · {{ getMasterclassStats(item).total }} inscrits
                </div>
              </div>
              <v-icon size="20">mdi-drag</v-icon>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="masterclass-panel">
          <div class="masterclass-panel-header">
            <div>
              <div class="masterclass-panel-title">{{ formTitle }}</div>
              <div class="masterclass-panel-subtitle">{{ formSubtitle }}</div>
            </div>
            <v-btn
              v-if="isEditingMasterclass"
              class="masterclass-action-btn-outline"
              size="small"
              @click="cancelEditMasterclass"
            >
              Annuler l’édition
            </v-btn>
          </div>

          <div class="masterclass-form-cover">
            <div class="masterclass-form-cover-preview" :style="coverStyle({ coverImage: coverPreview || '' })">
              <div class="masterclass-form-cover-overlay">
                <div class="masterclass-form-cover-label">Aperçu couverture</div>
                <div class="masterclass-form-cover-title">
                  {{ newMasterclass.title || 'Titre de la future masterclass' }}
                </div>
                <div class="masterclass-form-cover-subtitle">
                  {{ newMasterclass.subtitle || 'Sous-titre, angle ou promesse de la session.' }}
                </div>
              </div>
            </div>

            <div class="masterclass-form-cover-actions">
              <v-file-input
                label="Téléverser une image"
                accept="image/*"
                variant="outlined"
                hide-details
                @update:modelValue="handleCoverImageSelected"
              />
              <v-text-field
                v-model="newMasterclass.coverImage"
                label="Ou coller une URL d’image"
                variant="outlined"
                hide-details
              />
              <v-btn variant="text" @click="clearCoverImage">Retirer l’image</v-btn>
            </div>
          </div>

          <v-row class="masterclass-form">
            <v-col cols="12" md="7">
              <v-text-field v-model="newMasterclass.title" label="Titre" variant="outlined" />
            </v-col>
            <v-col cols="12" md="5">
              <v-select v-model="newMasterclass.status" :items="statusOptions" label="Statut" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newMasterclass.subtitle" label="Sous-titre / promesse" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="newMasterclass.description" label="Description complète" variant="outlined" />
            </v-col>

            <v-col cols="12" md="3">
              <v-select v-model="newMasterclass.level" :items="levelOptions" label="Niveau" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newMasterclass.format" :items="formatOptions" label="Format" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newMasterclass.language" :items="languageOptions" label="Langue" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="newMasterclass.duration" label="Durée" variant="outlined" />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMasterclass.scheduleAt"
                label="Date et heure"
                type="datetime-local"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMasterclass.registrationDeadline"
                label="Date limite d’inscription"
                type="datetime-local"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field v-model="newMasterclass.capacity" label="Capacité" type="number" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newMasterclass.price" label="Prix" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newMasterclass.tags" label="Tags (séparés par virgule)" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <v-text-field v-model="newMasterclass.targetAudience" label="Public cible" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newMasterclass.prerequisites"
                label="Pré-requis (une ligne = un point)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newMasterclass.agenda"
                label="Programme (une ligne = une étape)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newMasterclass.takeaways"
                label="Ce que les participants retiendront (une ligne = un bénéfice)"
                variant="outlined"
                rows="4"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMasterclass.location"
                label="Lieu affiché"
                variant="outlined"
                :placeholder="newMasterclass.format === 'online' ? 'En ligne' : 'Paris, salle, campus...'"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newMasterclass.city"
                label="Ville"
                variant="outlined"
                :disabled="!needsAddress"
              />
            </v-col>
            <v-col cols="12" v-if="needsAddress">
              <v-text-field v-model="newMasterclass.address" label="Adresse détaillée" variant="outlined" />
            </v-col>
            <v-col cols="12" v-if="needsMeetingLink">
              <v-text-field v-model="newMasterclass.meetingLink" label="Lien de session" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="newMasterclass.speakerBio"
                label="Bio intervenant / coach"
                variant="outlined"
                rows="3"
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-checkbox v-model="newMasterclass.replayAvailable" label="Replay disponible" hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-checkbox v-model="newMasterclass.certificateAvailable" label="Certificat disponible" hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-checkbox v-model="newMasterclass.supportIncluded" label="Supports inclus" hide-details />
            </v-col>
            <v-col cols="12" md="3">
              <v-checkbox v-model="newMasterclass.featured" label="Mettre en avant" hide-details />
            </v-col>
          </v-row>

          <div v-if="formError" class="masterclass-error">{{ formError }}</div>

          <div class="masterclass-form-footer">
            <v-btn
              v-if="isEditingMasterclass"
              class="masterclass-action-btn-outline"
              size="large"
              @click="cancelEditMasterclass"
            >
              Annuler
            </v-btn>
            <v-btn class="masterclass-btn" size="large" :loading="formLoading" @click="handleSubmitMasterclass">
              {{ isEditingMasterclass ? 'Enregistrer les modifications' : 'Planifier la masterclass' }}
            </v-btn>
          </div>
        </div>
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
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.1);
  box-shadow: 0 20px 45px rgba(12, 31, 32, 0.16);
}

.masterclass-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.masterclass-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.masterclass-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.masterclass-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.masterclass-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #133a3b;
}

.masterclass-hero-subtitle {
  margin-top: 6px;
  max-width: 720px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
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
  background: rgba(19, 58, 59, 0.05);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.masterclass-hero-stat {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.masterclass-hero-label {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
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
  border-color: rgba(245, 177, 63, 0.24);
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
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 700;
}

.masterclass-card-pill--ghost {
  background: rgba(8, 23, 23, 0.26);
}

.masterclass-card-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 177, 63, 0.9);
  color: #3e2200;
  font-size: 12px;
  font-weight: 700;
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
  font-size: 14px;
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
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.52)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  display: flex;
}

.masterclass-form-cover-overlay {
  width: 100%;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #fff;
}

.masterclass-form-cover-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}

.masterclass-form-cover-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.masterclass-form-cover-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
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

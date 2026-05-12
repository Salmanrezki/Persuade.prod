<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import logoUrl from '@/assets/logo.png'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { recordViewedCourse } from '@/services/learningActivityService'

const COURSE_IMAGE_MAX_SIZE = 1024 * 1024 * 1.5
const auth = useAuthStore()

const courses = ref([])
const profile = ref(null)
const coachProfiles = ref([])
const loading = ref(false)
const errorMessage = ref('')

const requestError = ref('')
const coachRequestError = ref('')
const coachFormError = ref('')

const requests = ref([])
const coachRequests = ref([])

const dialog = ref(false)
const activeCourse = ref(null)

const actionCourseId = ref('')
const updatingRequestId = ref('')
const cancellingRequestId = ref('')
const coachFormLoading = ref(false)
const deleteLoadingId = ref('')
const editingCourseId = ref('')
const duplicateLoadingId = ref('')
const searchQuery = ref('')
const filterLevel = ref('all')
const filterMode = ref('all')
const filterCategory = ref('all')
const sortOption = ref('popular')
const pageSize = ref(6)
const coursesPage = ref(1)
const featuredOrderIds = ref([])
const draggedFeaturedId = ref('')
const reorderLoading = ref(false)

const newCoachCourse = ref(createEmptyCoachCourse())

const levelOptions = ['Tous niveaux', 'Débutant', 'Intermédiaire', 'Avancé']
const coachingModeOptions = [
  { title: 'Coaching 1:1', value: 'one_to_one' },
  { title: 'Atelier de groupe', value: 'group' },
  { title: 'Hybride', value: 'hybrid' },
  { title: 'Vidéo / ressource', value: 'video' },
]
const languageOptions = ['Français', 'Anglais', 'Bilingue']
const filterLevelOptions = ['all', ...levelOptions]
const filterModeOptions = ['all', ...coachingModeOptions.map((item) => item.value)]
const sortOptions = [
  { title: 'Plus demandés', value: 'popular' },
  { title: 'Plus récents', value: 'recent' },
  { title: 'Titre A-Z', value: 'title_asc' },
]
const pageSizeOptions = [6, 9, 12]

function createEmptyCoachCourse() {
  return {
    title: '',
    subtitle: '',
    description: '',
    level: 'Tous niveaux',
    duration: '',
    category: '',
    language: 'Français',
    coachingMode: 'one_to_one',
    sessionCount: '',
    price: 'Sur demande',
    targetAudience: '',
    prerequisites: '',
    outcomes: '',
    bookingNotes: '',
    coverImage: '',
    videoUrl: '',
    meetingLink: '',
    featured: false,
  }
}

function courseToForm(course) {
  return {
    title: course.title || '',
    subtitle: course.subtitle || '',
    description: course.description || '',
    level: course.level || 'Tous niveaux',
    duration: course.duration || '',
    category: course.category || '',
    language: course.language || 'Français',
    coachingMode: course.coachingMode || 'one_to_one',
    sessionCount: course.sessionCount || '',
    price: course.price || 'Sur demande',
    targetAudience: course.targetAudience || '',
    prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites.join('\n') : '',
    outcomes: Array.isArray(course.outcomes) ? course.outcomes.join('\n') : '',
    bookingNotes: course.bookingNotes || '',
    coverImage: course.coverImage || '',
    videoUrl: course.videoUrl || '',
    meetingLink: course.meetingLink || '',
    featured: !!course.featured,
  }
}

const role = computed(() => profile.value?.role || '—')
const isCoach = computed(() => role.value === 'coach')
const isLearner = computed(() => role.value === 'apprenant')
const isEditingCourse = computed(() => !!editingCourseId.value)
const formTitle = computed(() =>
  isEditingCourse.value ? 'Modifier un cours avec coach' : 'Créer un cours avec coach'
)
const formSubtitle = computed(() =>
  isEditingCourse.value
    ? 'Mettez à jour le visuel, la proposition de valeur et les modalités de réservation.'
    : 'Ajoutez un cours réservable avec visuel, bénéfices et informations de session.'
)

const coachCourses = computed(() => courses.value.filter((course) => course.coachId))
const coachOwnedCourses = computed(() =>
  coachCourses.value.filter((course) => course.coachId === profile.value?.uid)
)
const coachCoursesForDisplay = computed(() => (isCoach.value ? coachOwnedCourses.value : coachCourses.value))
const coachProfilesMap = computed(() =>
  coachProfiles.value.reduce((map, coach) => {
    map[coach.uid] = coach
    return map
  }, {})
)
const featuredCourses = computed(() => coachCoursesForDisplay.value.filter((course) => course.featured))
const categoryOptions = computed(() => [
  'all',
  ...Array.from(new Set(coachCoursesForDisplay.value.map((course) => course.category).filter(Boolean))),
])

const matchesCourseFilters = (course) => {
  const queryValue = searchQuery.value.trim().toLowerCase()
  const matchesQuery =
    !queryValue ||
    [
      course.title,
      course.subtitle,
      course.description,
      course.category,
      course.coachName,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(queryValue))

  const matchesLevel = filterLevel.value === 'all' || course.level === filterLevel.value
  const matchesMode = filterMode.value === 'all' || course.coachingMode === filterMode.value
  const matchesCategory = filterCategory.value === 'all' || course.category === filterCategory.value

  return matchesQuery && matchesLevel && matchesMode && matchesCategory
}

const filteredCoachCourses = computed(() => coachCoursesForDisplay.value.filter(matchesCourseFilters))
const filteredFeaturedCourses = computed(() => featuredCourses.value.filter(matchesCourseFilters))

const requestMap = computed(() => {
  const map = {}
  requests.value.forEach((item) => {
    map[item.courseId] = item
  })
  return map
})

const hasVideo = computed(() => !!activeCourse.value?.videoUrl)
const isVideoFile = computed(() => {
  const url = activeCourse.value?.videoUrl || ''
  return ['.mp4', '.webm', '.ogg'].some((ext) => url.toLowerCase().includes(ext))
})
const coverPreview = computed(() => newCoachCourse.value.coverImage || '')

const openCourse = (course) => {
  activeCourse.value = course
  dialog.value = true
  recordViewedCourse(auth.user?.uid, course)
}

const parseLineList = (value) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

const statusLabel = (status) => {
  if (status === 'accepted') return 'Accepté'
  if (status === 'rejected') return 'Refusé'
  return 'En attente'
}

const statusClass = (status) => {
  if (status === 'accepted') return 'status-chip--success'
  if (status === 'rejected') return 'status-chip--danger'
  return 'status-chip--warning'
}

const coachingModeLabel = (value) => {
  if (value === 'group') return 'Groupe'
  if (value === 'hybrid') return 'Hybride'
  if (value === 'video') return 'Vidéo'
  return '1:1'
}

const filterLevelLabel = (value) => (value === 'all' ? 'Tous niveaux' : value)
const filterModeLabel = (value) => (value === 'all' ? 'Tous formats' : coachingModeLabel(value))
const filterCategoryLabel = (value) => (value === 'all' ? 'Toutes catégories' : value)
const sortLabel = (value) =>
  sortOptions.find((option) => option.value === value)?.title || 'Plus demandés'
const pageSizeLabel = (value) => `${value} / page`

const coverStyle = (course) => {
  if (!course?.coverImage) return {}
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8, 23, 23, 0.1), rgba(8, 23, 23, 0.58)), url('${course.coverImage}')`,
  }
}

const isOwnedCourse = (course) => course?.coachId && course.coachId === profile.value?.uid

const requestStatsMap = computed(() => {
  const map = {}
  coachRequests.value.forEach((request) => {
    if (!request.courseId) return
    if (!map[request.courseId]) {
      map[request.courseId] = {
        total: 0,
        accepted: 0,
        pending: 0,
        rejected: 0,
      }
    }

    map[request.courseId].total += 1

    if (request.status === 'accepted') {
      map[request.courseId].accepted += 1
    } else if (request.status === 'rejected') {
      map[request.courseId].rejected += 1
    } else {
      map[request.courseId].pending += 1
    }
  })

  return map
})

const getCourseStats = (course) =>
  requestStatsMap.value[course.id] || {
    total: 0,
    accepted: 0,
    pending: 0,
    rejected: 0,
  }

const coachDashboardStats = computed(() => {
  const totalRequests = coachRequests.value.length
  const pendingRequests = coachRequests.value.filter((request) => request.status === 'pending').length
  const acceptedRequests = coachRequests.value.filter((request) => request.status === 'accepted').length
  const rejectedRequests = coachRequests.value.filter((request) => request.status === 'rejected').length
  const totalCourses = coachOwnedCourses.value.length
  const featuredCount = coachOwnedCourses.value.filter((course) => course.featured).length
  const acceptanceRate = totalRequests ? Math.round((acceptedRequests / totalRequests) * 100) : 0

  return {
    totalRequests,
    pendingRequests,
    acceptedRequests,
    rejectedRequests,
    totalCourses,
    featuredCount,
    acceptanceRate,
  }
})

const coachDashboardCards = computed(() => [
  {
    label: 'Offres actives',
    value: coachDashboardStats.value.totalCourses,
    hint: `${coachDashboardStats.value.featuredCount} mises en avant`,
    icon: 'mdi-briefcase-outline',
  },
  {
    label: 'Demandes reçues',
    value: coachDashboardStats.value.totalRequests,
    hint: `${coachDashboardStats.value.pendingRequests} en attente`,
    icon: 'mdi-inbox-arrow-down-outline',
  },
  {
    label: 'Taux d’acceptation',
    value: `${coachDashboardStats.value.acceptanceRate}%`,
    hint: `${coachDashboardStats.value.acceptedRequests} acceptées`,
    icon: 'mdi-chart-donut',
  },
])

const coachTopCourses = computed(() =>
  [...coachOwnedCourses.value]
    .sort((left, right) => getCourseStats(right).total - getCourseStats(left).total)
    .slice(0, 3)
)

const coachPendingRequests = computed(() =>
  coachRequests.value.filter((request) => request.status === 'pending').slice(0, 5)
)

const learnerOverviewCards = computed(() => {
  const uniqueCoachIds = new Set(coachCourses.value.map((course) => course.coachId).filter(Boolean))
  return [
    {
      label: 'Accompagnements',
      value: coachCourses.value.length,
      hint: 'cours particuliers ouverts',
      icon: 'mdi-school-outline',
    },
    {
      label: 'Coachs visibles',
      value: uniqueCoachIds.size,
      hint: 'profils disponibles',
      icon: 'mdi-account-tie-outline',
    },
    {
      label: 'Formats',
      value: new Set(coachCourses.value.map((course) => course.coachingMode).filter(Boolean)).size,
      hint: '1:1, groupe, hybride...',
      icon: 'mdi-view-grid-outline',
    },
  ]
})

const learnerCoachSpotlights = computed(() => {
  const grouped = {}

  coachCourses.value.forEach((course) => {
    if (!course.coachId) return

    if (!grouped[course.coachId]) {
      const coachProfile = coachProfilesMap.value[course.coachId] || {}
      grouped[course.coachId] = {
        uid: course.coachId,
        name: course.coachName || coachProfile.firstname || 'Coach',
        profilePhoto: coachProfile.profilePhoto || '',
        headline:
          coachProfile.jobTitle ||
          coachProfile.professionDetail ||
          coachProfile.profession ||
          'Coach Persuade',
        sector: coachProfile.sectorDetail || coachProfile.sector || '',
        seniority: coachProfile.seniority || '',
        availability: coachProfile.availability || '',
        courseCount: 0,
        featuredCount: 0,
        categories: new Set(),
      }
    }

    grouped[course.coachId].courseCount += 1
    if (course.featured) grouped[course.coachId].featuredCount += 1
    if (course.category) grouped[course.coachId].categories.add(course.category)
  })

  return Object.values(grouped)
    .map((coach) => ({
      ...coach,
      categories: Array.from(coach.categories).slice(0, 3),
    }))
    .sort((left, right) => right.courseCount - left.courseCount)
    .slice(0, 4)
})

const coachProfileForCourse = (course) => {
  if (!course?.coachId) return null
  return coachProfilesMap.value[course.coachId] || null
}

const coachNameForCourse = (course) => {
  const coachProfile = coachProfileForCourse(course)
  return course?.coachName || coachProfile?.firstname || 'Coach'
}

const coachPhotoForCourse = (course) => {
  const coachProfile = coachProfileForCourse(course)
  return coachProfile?.profilePhoto || ''
}

const coachHeadlineForCourse = (course) => {
  const coachProfile = coachProfileForCourse(course)
  return (
    coachProfile?.jobTitle ||
    coachProfile?.professionDetail ||
    coachProfile?.profession ||
    'Coach dédié à votre progression'
  )
}

const coachMetaForCourse = (course) => {
  const coachProfile = coachProfileForCourse(course)
  return [
    coachProfile?.sectorDetail || coachProfile?.sector,
    coachProfile?.seniority,
    coachProfile?.availability,
  ].filter(Boolean)
}

const canCancelRequest = (request) => request?.status === 'pending'

const compareCourses = (left, right) => {
  if (sortOption.value === 'title_asc') {
    return (left.title || '').localeCompare(right.title || '', 'fr', { sensitivity: 'base' })
  }

  if (sortOption.value === 'recent') {
    const leftTime = left.createdAt?.toMillis ? left.createdAt.toMillis() : 0
    const rightTime = right.createdAt?.toMillis ? right.createdAt.toMillis() : 0
    return rightTime - leftTime
  }

  return getCourseStats(right).total - getCourseStats(left).total
}

const sortItems = (items) => [...items].sort(compareCourses)

const paginateItems = (items, page) => {
  const start = (page - 1) * pageSize.value
  return items.slice(start, start + pageSize.value)
}

const sortedFeaturedCourses = computed(() => sortItems(filteredFeaturedCourses.value))
const sortedCoachCourses = computed(() => sortItems(filteredCoachCourses.value))
const paginatedCoachCourses = computed(() => paginateItems(sortedCoachCourses.value, coursesPage.value))
const coachPageCount = computed(() => Math.max(1, Math.ceil(sortedCoachCourses.value.length / pageSize.value)))
const ownedFeaturedCourses = computed(() =>
  sortItems(coachOwnedCourses.value.filter((course) => course.featured))
)
const orderedOwnedFeaturedCourses = computed(() => {
  const itemsById = new Map(ownedFeaturedCourses.value.map((course) => [course.id, course]))
  return featuredOrderIds.value.map((id) => itemsById.get(id)).filter(Boolean)
})
const hasFeaturedReorderChanges = computed(() => {
  const currentIds = ownedFeaturedCourses.value.map((course) => course.id)
  return currentIds.join('|') !== featuredOrderIds.value.join('|')
})

const syncFeaturedOrder = () => {
  featuredOrderIds.value = ownedFeaturedCourses.value.map((course) => course.id)
}

const moveFeaturedCourse = (draggedId, targetId) => {
  if (!draggedId || !targetId || draggedId === targetId) return

  const nextIds = [...featuredOrderIds.value]
  const fromIndex = nextIds.indexOf(draggedId)
  const toIndex = nextIds.indexOf(targetId)
  if (fromIndex === -1 || toIndex === -1) return

  const [movedId] = nextIds.splice(fromIndex, 1)
  nextIds.splice(toIndex, 0, movedId)
  featuredOrderIds.value = nextIds
}

const handleFeaturedDragStart = (id) => {
  draggedFeaturedId.value = id
}

const handleFeaturedDrop = (id) => {
  moveFeaturedCourse(draggedFeaturedId.value, id)
  draggedFeaturedId.value = ''
}

const saveFeaturedOrder = async () => {
  if (!featuredOrderIds.value.length) return

  reorderLoading.value = true
  try {
    await api.post('/courses/reorder', { ids: featuredOrderIds.value })
    await loadCourses()
    syncFeaturedOrder()
  } catch (error) {
    coachFormError.value = 'Impossible de réorganiser les cours mis en avant.'
    console.error(error)
  } finally {
    reorderLoading.value = false
  }
}

const loadProfile = async () => {
  profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
}

const loadCourses = async () => {
  const res = await api.get('/courses')
  courses.value = res.data
}

const loadCoachProfiles = async () => {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'coach')))
  coachProfiles.value = snapshot.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .filter((item) => item.uid !== profile.value?.uid)
}

const loadRequests = async () => {
  if (isLearner.value) {
    const snapshot = await getDocs(query(collection(db, 'courseRequests'), where('studentId', '==', profile.value.uid)))
    requests.value = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?._seconds || 0
        const timeB = b.createdAt?.seconds || b.createdAt?._seconds || 0
        return timeB - timeA
      })
  }

  if (isCoach.value) {
    const snapshot = await getDocs(query(collection(db, 'courseRequests'), where('coachId', '==', profile.value.uid)))
    coachRequests.value = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?._seconds || 0
        const timeB = b.createdAt?.seconds || b.createdAt?._seconds || 0
        return timeB - timeA
      })
  }
}

const resetCoachCourseForm = () => {
  editingCourseId.value = ''
  newCoachCourse.value = createEmptyCoachCourse()
  coachFormError.value = ''
}

const handleCoachImageSelected = (file) => {
  if (!file) {
    newCoachCourse.value.coverImage = ''
    return
  }

  if (file.size > COURSE_IMAGE_MAX_SIZE) {
    coachFormError.value = 'L’image dépasse 1.5 Mo. Choisissez un fichier plus léger.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    newCoachCourse.value.coverImage = reader.result
  }
  reader.readAsDataURL(file)
}

const clearCoachImage = () => {
  newCoachCourse.value.coverImage = ''
}

const startEditCourse = (course) => {
  if (!isOwnedCourse(course)) return
  editingCourseId.value = course.id
  newCoachCourse.value = courseToForm(course)
  coachFormError.value = ''
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

const cancelEditCourse = () => {
  resetCoachCourseForm()
}

const handleSubmitCoachCourse = async () => {
  coachFormError.value = ''

  if (!newCoachCourse.value.title || !newCoachCourse.value.description) {
    coachFormError.value = 'Merci de remplir le titre et la description.'
    return
  }

  coachFormLoading.value = true
  try {
    const payload = {
      ...newCoachCourse.value,
      duration: newCoachCourse.value.duration || '—',
      category: newCoachCourse.value.category || 'Coaching',
      prerequisites: newCoachCourse.value.prerequisites
        ? parseLineList(newCoachCourse.value.prerequisites)
        : [],
      outcomes: newCoachCourse.value.outcomes ? parseLineList(newCoachCourse.value.outcomes) : [],
      type: 'coach',
    }

    if (isEditingCourse.value) {
      await api.patch(`/courses/${editingCourseId.value}`, payload)
    } else {
      await api.post('/courses', payload)
    }

    resetCoachCourseForm()
    await loadCourses()
  } catch (error) {
    coachFormError.value = isEditingCourse.value
      ? 'Impossible de mettre à jour le cours.'
      : 'Impossible de créer le cours.'
    console.error(error)
  } finally {
    coachFormLoading.value = false
  }
}

const deleteCourse = async (course) => {
  if (!isOwnedCourse(course)) return
  const confirmed = window.confirm(`Supprimer le cours "${course.title}" ?`)
  if (!confirmed) return

  deleteLoadingId.value = course.id
  try {
    await api.delete(`/courses/${course.id}`)
    if (editingCourseId.value === course.id) {
      resetCoachCourseForm()
    }
    await Promise.all([loadCourses(), loadRequests()])
  } catch (error) {
    coachFormError.value = 'Impossible de supprimer le cours.'
    console.error(error)
  } finally {
    deleteLoadingId.value = ''
  }
}

const duplicateCourse = async (course) => {
  if (!isOwnedCourse(course)) return

  duplicateLoadingId.value = course.id
  try {
    await api.post('/courses', {
      ...course,
      title: `${course.title} (copie)`,
      featured: false,
      type: 'coach',
    })
    await loadCourses()
  } catch (error) {
    coachFormError.value = 'Impossible de dupliquer le cours.'
    console.error(error)
  } finally {
    duplicateLoadingId.value = ''
  }
}

const requestCourse = async (course) => {
  requestError.value = ''
  actionCourseId.value = course.id

  try {
    const existing = requests.value.find((item) => item.courseId === course.id)
    if (existing) {
      requestError.value = 'Une demande existe deja pour ce cours.'
      return
    }

    await addDoc(collection(db, 'courseRequests'), {
      courseId: course.id,
      courseTitle: course.title || 'Cours',
      coachId: course.coachId,
      coachName: course.coachName || 'Coach',
      studentId: profile.value.uid,
      studentName: profile.value.firstname || profile.value.email || 'Apprenant',
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    await loadRequests()
  } catch (error) {
    requestError.value = 'Impossible d’envoyer la demande.'
    console.error(error)
  } finally {
    actionCourseId.value = ''
  }
}

const cancelRequest = async (request) => {
  if (!canCancelRequest(request)) return

  requestError.value = ''
  cancellingRequestId.value = request.id

  try {
    await deleteDoc(doc(db, 'courseRequests', request.id))
    await loadRequests()
  } catch (error) {
    requestError.value = 'Impossible d’annuler la demande.'
    console.error(error)
  } finally {
    cancellingRequestId.value = ''
  }
}

const updateRequest = async (requestId, status) => {
  coachRequestError.value = ''
  updatingRequestId.value = requestId

  try {
    await updateDoc(doc(db, 'courseRequests', requestId), {
      status,
      updatedAt: serverTimestamp(),
    })
    await loadRequests()
  } catch (error) {
    coachRequestError.value = 'Impossible de mettre à jour la demande.'
    console.error(error)
  } finally {
    updatingRequestId.value = ''
  }
}

watch([searchQuery, filterLevel, filterMode, filterCategory, sortOption, pageSize], () => {
  coursesPage.value = 1
})

watch(coachPageCount, (count) => {
  if (coursesPage.value > count) {
    coursesPage.value = count
  }
})

watch(
  () => ownedFeaturedCourses.value.map((course) => course.id).join('|'),
  () => {
    syncFeaturedOrder()
  },
  { immediate: true }
)

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  const [profileResult, coursesResult] = await Promise.allSettled([loadProfile(), loadCourses()])

  if (profileResult.status === 'rejected') {
    console.error(profileResult.reason)
  }

  if (coursesResult.status === 'rejected') {
    errorMessage.value = 'Impossible de charger les cours.'
    console.error(coursesResult.reason)
  }

  if (isLearner.value) {
    try {
      await loadCoachProfiles()
    } catch (error) {
      console.error(error)
    }
  }

  try {
    await loadRequests()
  } catch (error) {
    console.error(error)
  }

  loading.value = false
})
</script>

<template>
  <v-container class="coach-container" fluid>
    <div class="coach-backdrop" aria-hidden="true"></div>

    <v-row class="coach-hero" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="coach-hero-card" elevation="8">
          <div class="coach-hero-content">
            <div class="coach-hero-left">
              <div class="coach-brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="72" height="72" class="coach-logo" />
                <div class="coach-brand-text">Persuade</div>
              </div>
              <div class="coach-hero-title">{{ isCoach ? 'Mes cours particuliers' : 'Cours avec coach' }}</div>
              <div class="coach-hero-subtitle">
                {{ isCoach ? 'Créez vos accompagnements individuels, suivez les demandes et pilotez votre relation client.' : 'Découvrez les accompagnements coach avec détails, bénéfices et modalités.' }}
              </div>
            </div>

            <div class="coach-hero-stats">
              <div class="coach-hero-stat-card">
                <div class="coach-hero-stat">{{ isCoach ? coachDashboardStats.totalCourses : coachCourses.length }}</div>
                <div class="coach-hero-label">{{ isCoach ? 'offres actives' : 'cours disponibles' }}</div>
              </div>
              <div class="coach-hero-stat-card">
                <div class="coach-hero-stat">
                  {{ isCoach ? coachDashboardStats.totalRequests : filteredFeaturedCourses.length }}
                </div>
                <div class="coach-hero-label">{{ isCoach ? 'demandes reçues' : 'mis en avant' }}</div>
              </div>
              <div v-if="isCoach" class="coach-hero-stat-card">
                <div class="coach-hero-stat">{{ coachDashboardStats.pendingRequests }}</div>
                <div class="coach-hero-label">à traiter</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="coach-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-progress-linear v-if="loading" color="#1c7c7d" indeterminate class="mb-6" />

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div v-if="!loading" class="coach-filters">
          <v-text-field
            v-model="searchQuery"
            :label="isCoach ? 'Rechercher un cours particulier' : 'Rechercher un cours coach'"
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
            v-model="filterMode"
            :items="filterModeOptions"
            :item-title="filterModeLabel"
            :item-value="(item) => item"
            label="Format"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-select
            v-model="filterCategory"
            :items="categoryOptions"
            :item-title="filterCategoryLabel"
            :item-value="(item) => item"
            label="Catégorie"
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

        <div v-if="isCoach && !loading" class="coach-dashboard">
          <div class="coach-dashboard-grid">
            <v-card
              v-for="card in coachDashboardCards"
              :key="card.label"
              class="coach-dashboard-card"
              elevation="4"
            >
              <div class="coach-dashboard-card-top">
                <div class="coach-dashboard-icon">
                  <v-icon size="20">{{ card.icon }}</v-icon>
                </div>
                <div class="coach-dashboard-value">{{ card.value }}</div>
              </div>
              <div class="coach-dashboard-label">{{ card.label }}</div>
              <div class="coach-dashboard-hint">{{ card.hint }}</div>
            </v-card>
          </div>

          <div class="coach-dashboard-panels">
            <v-card class="coach-dashboard-panel" elevation="4">
              <div class="coach-panel-title">Pilotage coach</div>
              <div class="coach-panel-subtitle">
                Les offres qui concentrent le plus de demandes et méritent le plus d’attention.
              </div>

              <div v-if="coachTopCourses.length" class="coach-dashboard-list">
                <div v-for="course in coachTopCourses" :key="`top-${course.id}`" class="coach-dashboard-item">
                  <div>
                    <div class="coach-dashboard-item-title">{{ course.title }}</div>
                    <div class="coach-dashboard-item-subtitle">
                      {{ course.category || 'Coaching' }} · {{ coachingModeLabel(course.coachingMode) }}
                    </div>
                  </div>
                  <div class="coach-dashboard-item-stats">
                    <span>{{ getCourseStats(course).total }} demandes</span>
                    <span>{{ getCourseStats(course).pending }} en attente</span>
                  </div>
                </div>
              </div>

              <div v-else class="coach-empty">Aucune offre coach publiée pour le moment.</div>
            </v-card>

            <v-card class="coach-dashboard-panel coach-dashboard-panel--accent" elevation="4">
              <div class="coach-panel-title">Demandes prioritaires</div>
              <div class="coach-panel-subtitle">
                Les demandes en attente sont remontées ici pour accélérer le traitement.
              </div>

              <div v-if="coachPendingRequests.length" class="coach-dashboard-list">
                <div
                  v-for="request in coachPendingRequests"
                  :key="`pending-${request.id}`"
                  class="coach-dashboard-item"
                >
                  <div>
                    <div class="coach-dashboard-item-title">{{ request.courseTitle }}</div>
                    <div class="coach-dashboard-item-subtitle">{{ request.studentName || 'Apprenant' }}</div>
                  </div>
                  <v-chip class="coach-chip status-chip--warning" size="small" variant="flat">
                    En attente
                  </v-chip>
                </div>
              </div>

              <div v-else class="coach-empty">Aucune demande en attente actuellement.</div>
            </v-card>
          </div>
        </div>

        <div v-if="isLearner && !loading" class="learner-dashboard">
          <div class="learner-dashboard-grid">
            <v-card
              v-for="card in learnerOverviewCards"
              :key="card.label"
              class="learner-dashboard-card"
              elevation="4"
            >
              <div class="learner-dashboard-card-top">
                <div class="learner-dashboard-icon">
                  <v-icon size="20">{{ card.icon }}</v-icon>
                </div>
                <div class="learner-dashboard-value">{{ card.value }}</div>
              </div>
              <div class="learner-dashboard-label">{{ card.label }}</div>
              <div class="learner-dashboard-hint">{{ card.hint }}</div>
            </v-card>
          </div>

          <v-card class="learner-illustration-card" elevation="4">
            <div class="learner-illustration-copy">
              <div class="coach-panel-title">Choisir un coach plus facilement</div>
              <div class="coach-panel-subtitle">
                Identifiez le coach, sa spécialité, le format, les bénéfices et les prérequis avant d’envoyer une demande.
              </div>
              <div class="learner-illustration-points">
                <span class="learner-illustration-pill">Profil coach visible</span>
                <span class="learner-illustration-pill">Objectifs détaillés</span>
                <span class="learner-illustration-pill">Annulation simple</span>
              </div>
            </div>

            <div class="learner-illustration-visual" aria-hidden="true">
              <div class="learner-visual-card learner-visual-card--primary">
                <div class="learner-visual-avatar"></div>
                <div class="learner-visual-lines">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div class="learner-visual-card learner-visual-card--secondary">
                <div class="learner-visual-badge"></div>
                <div class="learner-visual-progress"></div>
              </div>
              <div class="learner-visual-orbit learner-visual-orbit--one"></div>
              <div class="learner-visual-orbit learner-visual-orbit--two"></div>
            </div>
          </v-card>

          <v-card class="learner-coaches-card" elevation="4">
            <div class="coach-panel-title">Coachs à découvrir</div>
            <div class="coach-panel-subtitle">
              Les coachs les plus présents sur cette section, avec leur spécialité et leurs formats.
            </div>

            <div v-if="learnerCoachSpotlights.length" class="learner-coaches-grid">
              <div
                v-for="coach in learnerCoachSpotlights"
                :key="coach.uid"
                class="learner-coach-item"
              >
                <v-avatar size="56" class="learner-coach-avatar">
                  <v-img v-if="coach.profilePhoto" :src="coach.profilePhoto" :alt="coach.name" />
                  <v-icon v-else size="24">mdi-account-tie</v-icon>
                </v-avatar>
                <div class="learner-coach-body">
                  <div class="learner-coach-name">{{ coach.name }}</div>
                  <div class="learner-coach-headline">{{ coach.headline }}</div>
                  <div class="learner-coach-meta">
                    <span v-if="coach.sector">{{ coach.sector }}</span>
                    <span v-if="coach.seniority">{{ coach.seniority }}</span>
                    <span v-if="coach.availability">{{ coach.availability }}</span>
                  </div>
                  <div class="learner-coach-tags">
                    <span class="learner-coach-tag">{{ coach.courseCount }} cours</span>
                    <span class="learner-coach-tag" v-if="coach.featuredCount">
                      {{ coach.featuredCount }} mis en avant
                    </span>
                    <span
                      v-for="category in coach.categories"
                      :key="`${coach.uid}-${category}`"
                      class="learner-coach-tag"
                    >
                      {{ category }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="coach-empty">Aucun profil coach détaillé disponible pour le moment.</div>
          </v-card>
        </div>

        <div v-if="!loading && sortedFeaturedCourses.length" class="coach-section">
          <div class="coach-section-title">Sélection coach</div>
          <div class="coach-section-subtitle">Les accompagnements les plus visibles du moment.</div>
        </div>

        <v-row v-if="!loading && sortedFeaturedCourses.length" class="coach-list">
          <v-col cols="12" md="6" v-for="course in sortedFeaturedCourses" :key="`featured-${course.id}`">
            <v-card class="coach-card coach-card--featured" elevation="6">
              <div class="coach-card-cover" :style="coverStyle(course)">
                <div class="coach-card-cover-top">
                  <div class="coach-card-pill">{{ course.level || 'Tous niveaux' }}</div>
                  <div class="coach-card-pill coach-card-pill--ghost">{{ coachingModeLabel(course.coachingMode) }}</div>
                </div>
                <div class="coach-card-cover-bottom">
                  <div class="coach-card-badge">À la une</div>
                  <div class="coach-card-cover-title">{{ course.title }}</div>
                  <div v-if="course.subtitle" class="coach-card-cover-subtitle">{{ course.subtitle }}</div>
                </div>
              </div>

              <div class="coach-card-body">
                <div class="coach-card-inline-chips">
                  <span class="coach-inline-chip">{{ course.category || 'Coaching' }}</span>
                  <span class="coach-inline-chip">{{ course.language || 'Français' }}</span>
                  <span class="coach-inline-chip" v-if="course.sessionCount">{{ course.sessionCount }}</span>
                </div>

                <div class="coach-card-description">{{ course.description }}</div>

                <div v-if="isLearner" class="learner-coach-profile">
                  <v-avatar size="52" class="learner-course-avatar">
                    <v-img
                      v-if="coachPhotoForCourse(course)"
                      :src="coachPhotoForCourse(course)"
                      :alt="coachNameForCourse(course)"
                    />
                    <v-icon v-else size="22">mdi-account-tie</v-icon>
                  </v-avatar>
                  <div class="learner-coach-profile-main">
                    <div class="learner-coach-profile-label">Cours organisé par</div>
                    <div class="learner-coach-profile-name">{{ coachNameForCourse(course) }}</div>
                    <div class="learner-coach-profile-role">{{ coachHeadlineForCourse(course) }}</div>
                    <div v-if="coachMetaForCourse(course).length" class="learner-coach-profile-meta">
                      {{ coachMetaForCourse(course).join(' · ') }}
                    </div>
                  </div>
                </div>

                <div class="coach-card-highlights">
                  <div class="coach-card-highlight">
                    <v-icon size="18">mdi-account-circle</v-icon>
                    <span>{{ coachNameForCourse(course) }}</span>
                  </div>
                  <div class="coach-card-highlight">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ course.price || 'Sur demande' }}</span>
                  </div>
                  <div class="coach-card-highlight">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ course.duration || '—' }}</span>
                  </div>
                  <div class="coach-card-highlight" v-if="course.meetingLink">
                    <v-icon size="18">mdi-link-variant</v-icon>
                    <span>Lien de session prêt</span>
                  </div>
                </div>

                <div v-if="course.targetAudience" class="coach-card-note">
                  <strong>Pour :</strong> {{ course.targetAudience }}
                </div>

                <div v-if="course.outcomes?.length" class="coach-card-block">
                  <div class="coach-card-block-title">Résultats visés</div>
                  <div class="coach-card-list">
                    <div v-for="entry in course.outcomes.slice(0, 3)" :key="entry" class="coach-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isLearner && course.prerequisites?.length" class="coach-card-block">
                  <div class="coach-card-block-title">Pré-requis</div>
                  <div class="coach-card-list">
                    <div v-for="entry in course.prerequisites.slice(0, 2)" :key="entry" class="coach-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isCoach && isOwnedCourse(course)" class="coach-card-stats">
                  <div class="coach-stat-chip">{{ getCourseStats(course).total }} demandes</div>
                  <div class="coach-stat-chip">{{ getCourseStats(course).accepted }} acceptées</div>
                  <div class="coach-stat-chip">{{ getCourseStats(course).pending }} en attente</div>
                </div>

                <div class="coach-card-actions">
                  <v-btn class="coach-action-btn-outline" size="large" @click="openCourse(course)">Voir détails</v-btn>
                  <v-btn
                    v-if="isLearner && !requestMap[course.id]"
                    class="coach-card-btn"
                    size="large"
                    :loading="actionCourseId === course.id"
                    @click="requestCourse(course)"
                  >
                    Demander un cours
                  </v-btn>
                  <v-btn
                    v-if="isLearner && requestMap[course.id]"
                    :class="canCancelRequest(requestMap[course.id]) ? 'coach-action-btn-danger' : 'coach-action-btn-outline'"
                    size="large"
                    :loading="cancellingRequestId === requestMap[course.id].id"
                    :disabled="!canCancelRequest(requestMap[course.id])"
                    @click="cancelRequest(requestMap[course.id])"
                  >
                    {{
                      canCancelRequest(requestMap[course.id])
                        ? 'Annuler la demande'
                        : statusLabel(requestMap[course.id].status)
                    }}
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedCourse(course)" class="coach-owner-actions">
                  <v-btn
                    class="coach-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === course.id"
                    @click="duplicateCourse(course)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="coach-action-btn-outline" size="small" @click="startEditCourse(course)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="coach-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === course.id"
                    @click="deleteCourse(course)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading" class="coach-section">
          <div class="coach-section-title">{{ isCoach ? 'Mes cours particuliers' : 'Cours avec coach' }}</div>
          <div class="coach-section-subtitle">
            {{ isCoach ? 'Vos accompagnements publiés, réservables et suivis côté coach.' : 'Sélectionnez un accompagnement et envoyez une demande.' }}
          </div>
        </div>

        <v-row v-if="!loading" class="coach-list">
          <v-col cols="12" md="4" v-for="course in paginatedCoachCourses" :key="course.id">
            <v-card class="coach-card" elevation="6">
              <div class="coach-card-cover coach-card-cover--compact" :style="coverStyle(course)">
                <div class="coach-card-cover-top">
                  <div class="coach-card-pill">{{ course.level || 'Tous niveaux' }}</div>
                  <div class="coach-card-pill coach-card-pill--ghost">{{ coachingModeLabel(course.coachingMode) }}</div>
                </div>
                <div class="coach-card-cover-bottom">
                  <div class="coach-card-cover-title">{{ course.title }}</div>
                  <div v-if="course.subtitle" class="coach-card-cover-subtitle">{{ course.subtitle }}</div>
                </div>
              </div>

              <div class="coach-card-body">
                <div class="coach-card-description">{{ course.description }}</div>

                <div v-if="isLearner" class="learner-coach-profile learner-coach-profile--compact">
                  <v-avatar size="48" class="learner-course-avatar">
                    <v-img
                      v-if="coachPhotoForCourse(course)"
                      :src="coachPhotoForCourse(course)"
                      :alt="coachNameForCourse(course)"
                    />
                    <v-icon v-else size="20">mdi-account-tie</v-icon>
                  </v-avatar>
                  <div class="learner-coach-profile-main">
                    <div class="learner-coach-profile-label">Coach du cours</div>
                    <div class="learner-coach-profile-name">{{ coachNameForCourse(course) }}</div>
                    <div class="learner-coach-profile-role">{{ coachHeadlineForCourse(course) }}</div>
                  </div>
                </div>

                <div class="coach-card-meta">
                  <div class="coach-card-line">
                    <v-icon size="18">mdi-account-circle</v-icon>
                    <span>{{ coachNameForCourse(course) }}</span>
                  </div>
                  <div class="coach-card-line">
                    <v-icon size="18">mdi-folder-outline</v-icon>
                    <span>{{ course.category || 'Coaching' }}</span>
                  </div>
                  <div class="coach-card-line">
                    <v-icon size="18">mdi-translate</v-icon>
                    <span>{{ course.language || 'Français' }}</span>
                  </div>
                  <div class="coach-card-line">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ course.price || 'Sur demande' }}</span>
                  </div>
                  <div class="coach-card-line" v-if="course.sessionCount">
                    <v-icon size="18">mdi-counter</v-icon>
                    <span>{{ course.sessionCount }}</span>
                  </div>
                  <div class="coach-card-line">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ course.duration || '—' }}</span>
                  </div>
                </div>

                <div v-if="course.outcomes?.length" class="coach-card-block">
                  <div class="coach-card-block-title">Ce que vous obtenez</div>
                  <div class="coach-card-list">
                    <div v-for="entry in course.outcomes.slice(0, 2)" :key="entry" class="coach-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isLearner && course.targetAudience" class="coach-card-note">
                  <strong>Idéal pour :</strong> {{ course.targetAudience }}
                </div>

                <div v-if="isLearner && course.prerequisites?.length" class="coach-card-block">
                  <div class="coach-card-block-title">Pré-requis</div>
                  <div class="coach-card-list">
                    <div v-for="entry in course.prerequisites.slice(0, 2)" :key="entry" class="coach-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div v-if="isCoach && isOwnedCourse(course)" class="coach-card-stats">
                  <div class="coach-stat-chip">{{ getCourseStats(course).total }} demandes</div>
                  <div class="coach-stat-chip">{{ getCourseStats(course).accepted }} acceptées</div>
                  <div class="coach-stat-chip">{{ getCourseStats(course).rejected }} refusées</div>
                </div>

                <div class="coach-card-actions">
                  <v-btn class="coach-action-btn-outline" size="large" @click="openCourse(course)">
                    Voir détails
                  </v-btn>
                  <v-btn
                    v-if="isLearner && !requestMap[course.id]"
                    class="coach-card-btn"
                    size="large"
                    :loading="actionCourseId === course.id"
                    @click="requestCourse(course)"
                  >
                    Demander un cours
                  </v-btn>
                  <v-btn
                    v-if="isLearner && requestMap[course.id]"
                    :class="canCancelRequest(requestMap[course.id]) ? 'coach-action-btn-danger' : 'coach-action-btn-outline'"
                    size="large"
                    :loading="cancellingRequestId === requestMap[course.id].id"
                    :disabled="!canCancelRequest(requestMap[course.id])"
                    @click="cancelRequest(requestMap[course.id])"
                  >
                    {{
                      canCancelRequest(requestMap[course.id])
                        ? 'Annuler la demande'
                        : statusLabel(requestMap[course.id].status)
                    }}
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedCourse(course)" class="coach-owner-actions">
                  <v-btn
                    class="coach-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === course.id"
                    @click="duplicateCourse(course)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="coach-action-btn-outline" size="small" @click="startEditCourse(course)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="coach-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === course.id"
                    @click="deleteCourse(course)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && coachPageCount > 1" class="coach-pagination">
          <div class="coach-pagination-label">
            {{ sortedCoachCourses.length }} résultat(s) · tri {{ sortLabel(sortOption).toLowerCase() }}
          </div>
          <v-pagination
            v-model="coursesPage"
            :length="coachPageCount"
            rounded="circle"
            density="comfortable"
          />
        </div>

        <div v-if="isCoach" class="coach-panel">
          <div class="coach-panel-header">
            <div>
              <div class="coach-panel-title">Réordonner la mise en avant</div>
              <div class="coach-panel-subtitle">
                Glissez vos offres mises en avant pour ajuster leur ordre d’apparition.
              </div>
            </div>
            <v-btn
              class="coach-action-btn"
              size="small"
              :disabled="orderedOwnedFeaturedCourses.length < 2 || !hasFeaturedReorderChanges"
              :loading="reorderLoading"
              @click="saveFeaturedOrder"
            >
              Enregistrer l’ordre
            </v-btn>
          </div>

          <div v-if="orderedOwnedFeaturedCourses.length < 2" class="coach-empty">
            Ajoutez au moins deux cours mis en avant pour les réordonner.
          </div>

          <div v-else class="coach-reorder-list">
            <div
              v-for="(course, index) in orderedOwnedFeaturedCourses"
              :key="`reorder-${course.id}`"
              class="coach-reorder-item"
              draggable="true"
              @dragstart="handleFeaturedDragStart(course.id)"
              @dragover.prevent
              @drop="handleFeaturedDrop(course.id)"
            >
              <div class="coach-reorder-rank">{{ index + 1 }}</div>
              <div class="coach-reorder-main">
                <div class="coach-reorder-title">{{ course.title }}</div>
                <div class="coach-reorder-subtitle">
                  {{ getCourseStats(course).total }} demandes · {{ course.category || 'Coaching' }}
                </div>
              </div>
              <v-icon size="20">mdi-drag</v-icon>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="coach-panel">
          <div class="coach-panel-header">
            <div>
              <div class="coach-panel-title">{{ formTitle }}</div>
              <div class="coach-panel-subtitle">{{ formSubtitle }}</div>
            </div>
            <v-btn
              v-if="isEditingCourse"
              class="coach-action-btn-outline"
              size="small"
              @click="cancelEditCourse"
            >
              Annuler l’édition
            </v-btn>
          </div>

          <div class="coach-form-cover">
            <div class="coach-form-cover-preview" :style="coverStyle({ coverImage: coverPreview || '' })">
              <div class="coach-form-cover-overlay">
                <div class="coach-form-cover-label">Aperçu couverture</div>
                <div class="coach-form-cover-title">{{ newCoachCourse.title || 'Titre du cours particulier' }}</div>
                <div class="coach-form-cover-subtitle">
                  {{ newCoachCourse.subtitle || 'Sous-titre, promesse ou angle du cours.' }}
                </div>
              </div>
            </div>

            <div class="coach-form-cover-actions">
              <v-file-input
                label="Téléverser une image"
                accept="image/*"
                variant="outlined"
                hide-details
                @update:modelValue="handleCoachImageSelected"
              />
              <v-text-field
                v-model="newCoachCourse.coverImage"
                label="Ou coller une URL d’image"
                variant="outlined"
                hide-details
              />
              <v-btn variant="text" @click="clearCoachImage">Retirer l’image</v-btn>
            </div>
          </div>

          <v-row class="coach-form">
            <v-col cols="12" md="7">
              <v-text-field v-model="newCoachCourse.title" label="Titre" variant="outlined" />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field v-model="newCoachCourse.subtitle" label="Sous-titre / promesse" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="newCoachCourse.description" label="Description" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newCoachCourse.level" :items="levelOptions" label="Niveau" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="newCoachCourse.coachingMode"
                :items="coachingModeOptions"
                label="Format"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newCoachCourse.language" :items="languageOptions" label="Langue" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="newCoachCourse.duration" label="Durée" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newCoachCourse.category" label="Catégorie" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newCoachCourse.sessionCount" label="Nombre de sessions" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newCoachCourse.price" label="Prix" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newCoachCourse.targetAudience" label="Public cible" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newCoachCourse.prerequisites"
                label="Pré-requis (une ligne = un point)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newCoachCourse.outcomes"
                label="Résultats / bénéfices (une ligne = un point)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newCoachCourse.bookingNotes"
                label="Notes de réservation / déroulé"
                variant="outlined"
                rows="3"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newCoachCourse.videoUrl"
                label="Lien vidéo ou média de présentation"
                variant="outlined"
                placeholder="https://..."
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newCoachCourse.meetingLink"
                label="Lien de session (optionnel)"
                variant="outlined"
                placeholder="https://..."
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-checkbox v-model="newCoachCourse.featured" label="Mettre en avant" hide-details />
            </v-col>
          </v-row>

          <div v-if="coachFormError" class="coach-error">{{ coachFormError }}</div>

          <div class="coach-form-footer">
            <v-btn
              v-if="isEditingCourse"
              class="coach-action-btn-outline"
              size="large"
              @click="cancelEditCourse"
            >
              Annuler
            </v-btn>
            <v-btn
              class="coach-card-btn"
              size="large"
              :loading="coachFormLoading"
              @click="handleSubmitCoachCourse"
            >
              {{ isEditingCourse ? 'Enregistrer les modifications' : 'Créer le cours' }}
            </v-btn>
          </div>
        </div>

        <div v-if="isLearner" class="coach-panel">
          <div class="coach-panel-title">Mes demandes</div>
          <div class="coach-panel-subtitle">Suivez l’état de vos demandes.</div>

          <div v-if="requestError" class="coach-error">{{ requestError }}</div>

          <div v-if="requests.length === 0" class="coach-empty">
            Aucune demande pour le moment.
          </div>

          <div v-else class="coach-request-list">
            <div class="coach-request-item" v-for="request in requests" :key="request.id">
              <div>
                <div class="coach-request-title">{{ request.courseTitle }}</div>
                <div class="coach-request-subtitle">Coach: {{ request.coachName }}</div>
              </div>
              <div class="coach-request-actions">
                <v-chip class="coach-chip" :class="statusClass(request.status)" size="small" variant="flat">
                  {{ statusLabel(request.status) }}
                </v-chip>
                <v-btn
                  v-if="canCancelRequest(request)"
                  class="coach-action-btn-danger"
                  size="small"
                  :loading="cancellingRequestId === request.id"
                  @click="cancelRequest(request)"
                >
                  Annuler
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="coach-panel">
          <div class="coach-panel-title">Demandes reçues</div>
          <div class="coach-panel-subtitle">Acceptez ou refusez les demandes.</div>

          <div v-if="coachRequestError" class="coach-error">{{ coachRequestError }}</div>

          <div v-if="coachRequests.length === 0" class="coach-empty">
            Aucune demande reçue.
          </div>

          <div v-else class="coach-request-list">
            <div class="coach-request-item" v-for="request in coachRequests" :key="request.id">
              <div>
                <div class="coach-request-title">{{ request.courseTitle }}</div>
                <div class="coach-request-subtitle">Apprenant: {{ request.studentName }}</div>
              </div>
              <div class="coach-request-actions">
                <v-chip class="coach-chip" :class="statusClass(request.status)" size="small" variant="flat">
                  {{ statusLabel(request.status) }}
                </v-chip>
                <v-btn
                  v-if="request.status === 'pending'"
                  class="coach-action-btn"
                  size="small"
                  :loading="updatingRequestId === request.id"
                  @click="updateRequest(request.id, 'accepted')"
                >
                  Accepter
                </v-btn>
                <v-btn
                  v-if="request.status === 'pending'"
                  class="coach-action-btn-outline"
                  size="small"
                  :loading="updatingRequestId === request.id"
                  @click="updateRequest(request.id, 'rejected')"
                >
                  Refuser
                </v-btn>
              </div>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="960">
      <v-card class="course-dialog" elevation="10">
        <div class="course-dialog-cover" :style="coverStyle(activeCourse)">
          <div class="course-dialog-cover-top">
            <div class="coach-card-pill">{{ activeCourse?.level || 'Tous niveaux' }}</div>
            <div class="coach-card-pill coach-card-pill--ghost">{{ coachingModeLabel(activeCourse?.coachingMode) }}</div>
          </div>
          <div class="course-dialog-cover-bottom">
            <div class="course-dialog-title">{{ activeCourse?.title }}</div>
            <div class="course-dialog-subtitle">{{ activeCourse?.subtitle || activeCourse?.description }}</div>
          </div>
          <v-btn icon="mdi-close" variant="text" class="course-dialog-close" @click="dialog = false"></v-btn>
        </div>

        <div class="course-dialog-content">
          <div class="course-dialog-grid">
            <div class="course-dialog-main">
              <div class="course-dialog-text">{{ activeCourse?.description }}</div>

              <div v-if="isLearner" class="course-dialog-coach">
                <div class="course-dialog-coach-header">
                  <v-avatar size="64" class="learner-course-avatar">
                    <v-img
                      v-if="coachPhotoForCourse(activeCourse)"
                      :src="coachPhotoForCourse(activeCourse)"
                      :alt="coachNameForCourse(activeCourse)"
                    />
                    <v-icon v-else size="28">mdi-account-tie</v-icon>
                  </v-avatar>
                  <div>
                    <div class="course-dialog-block-title">Coach organisateur</div>
                    <div class="course-dialog-coach-name">{{ coachNameForCourse(activeCourse) }}</div>
                    <div class="course-dialog-coach-role">{{ coachHeadlineForCourse(activeCourse) }}</div>
                  </div>
                </div>

                <div v-if="coachMetaForCourse(activeCourse).length" class="course-dialog-coach-meta">
                  <span
                    v-for="item in coachMetaForCourse(activeCourse)"
                    :key="`coach-meta-${item}`"
                    class="course-dialog-coach-chip"
                  >
                    {{ item }}
                  </span>
                </div>
              </div>

              <div v-if="activeCourse?.outcomes?.length" class="course-dialog-block">
                <div class="course-dialog-block-title">Objectifs</div>
                <div class="coach-card-list">
                  <div v-for="entry in activeCourse.outcomes" :key="entry" class="coach-card-list-item">
                    {{ entry }}
                  </div>
                </div>
              </div>

              <div v-if="activeCourse?.prerequisites?.length" class="course-dialog-block">
                <div class="course-dialog-block-title">Pré-requis</div>
                <div class="coach-card-list">
                  <div v-for="entry in activeCourse.prerequisites" :key="entry" class="coach-card-list-item">
                    {{ entry }}
                  </div>
                </div>
              </div>

              <div v-if="activeCourse?.bookingNotes" class="course-dialog-note">
                {{ activeCourse.bookingNotes }}
              </div>

              <div v-if="isLearner && activeCourse?.targetAudience" class="course-dialog-note course-dialog-note--accent">
                <strong>Ce cours est particulièrement adapté pour :</strong> {{ activeCourse.targetAudience }}
              </div>
            </div>

            <div class="course-dialog-side">
              <div class="course-dialog-side-card">
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-account-circle</v-icon>
                  <span>{{ coachNameForCourse(activeCourse) }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-folder-outline</v-icon>
                  <span>{{ activeCourse?.category || 'Coaching' }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-cash</v-icon>
                  <span>{{ activeCourse?.price || 'Sur demande' }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-translate</v-icon>
                  <span>{{ activeCourse?.language || 'Français' }}</span>
                </div>
                <div class="course-dialog-side-line" v-if="activeCourse?.duration">
                  <v-icon size="18">mdi-timer-outline</v-icon>
                  <span>{{ activeCourse.duration }}</span>
                </div>
                <div class="course-dialog-side-line" v-if="activeCourse?.sessionCount">
                  <v-icon size="18">mdi-counter</v-icon>
                  <span>{{ activeCourse.sessionCount }}</span>
                </div>
                <div class="course-dialog-side-line" v-if="activeCourse?.meetingLink">
                  <v-icon size="18">mdi-link-variant</v-icon>
                  <span>Session en ligne disponible</span>
                </div>
              </div>
            </div>
          </div>

          <div class="course-dialog-media">
            <template v-if="hasVideo">
              <video v-if="isVideoFile" controls :src="activeCourse.videoUrl" />
              <iframe
                v-else
                :src="activeCourse.videoUrl"
                title="Cours vidéo"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </template>
            <div v-else class="course-dialog-empty">
              Aucun média disponible pour ce cours.
            </div>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.coach-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.coach-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.coach-hero,
.coach-grid {
  position: relative;
  z-index: 1;
}

.coach-hero-card {
  border-radius: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.1);
  box-shadow: 0 20px 45px rgba(12, 31, 32, 0.16);
}

.coach-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.coach-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.coach-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.coach-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.coach-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #133a3b;
}

.coach-hero-subtitle {
  margin-top: 6px;
  max-width: 720px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
}

.coach-hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.coach-hero-stat-card {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.05);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.coach-hero-stat {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.coach-hero-label {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.coach-grid {
  margin-top: 28px;
}

.learner-dashboard {
  display: grid;
  gap: 18px;
  margin: 10px 0 26px;
}

.learner-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.learner-dashboard-card,
.learner-coaches-card {
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(255, 255, 255, 0.95);
}

.learner-dashboard-card {
  padding: 18px;
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.1);
}

.learner-dashboard-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.learner-dashboard-icon,
.learner-course-avatar {
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.learner-dashboard-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
}

.learner-dashboard-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.learner-dashboard-label {
  margin-top: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #133a3b;
}

.learner-dashboard-hint {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.learner-coaches-card {
  padding: 20px;
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.learner-illustration-card {
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(28, 124, 125, 0.12), transparent 45%),
    radial-gradient(100% 100% at 100% 20%, rgba(245, 177, 63, 0.14), transparent 40%),
    rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 18px;
  overflow: hidden;
}

.learner-illustration-copy {
  display: grid;
  align-content: center;
  gap: 12px;
}

.learner-illustration-points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.learner-illustration-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(19, 58, 59, 0.08);
  font-size: 12px;
  font-weight: 700;
  color: #133a3b;
}

.learner-illustration-visual {
  position: relative;
  min-height: 220px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(19, 58, 59, 0.06), rgba(28, 124, 125, 0.12));
}

.learner-visual-card {
  position: absolute;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.1);
}

.learner-visual-card--primary {
  inset: 22px 80px 56px 24px;
  padding: 18px;
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
  align-items: center;
}

.learner-visual-card--secondary {
  right: 20px;
  bottom: 22px;
  width: 130px;
  height: 110px;
  padding: 14px;
  display: grid;
  align-content: center;
  gap: 14px;
}

.learner-visual-avatar {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1c7c7d, #2d9a7b);
}

.learner-visual-lines {
  display: grid;
  gap: 10px;
}

.learner-visual-lines span,
.learner-visual-badge,
.learner-visual-progress {
  display: block;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.1);
}

.learner-visual-lines span:nth-child(1) {
  width: 72%;
  height: 12px;
}

.learner-visual-lines span:nth-child(2) {
  width: 96%;
  height: 10px;
}

.learner-visual-lines span:nth-child(3) {
  width: 64%;
  height: 10px;
}

.learner-visual-badge {
  width: 72px;
  height: 28px;
  background: rgba(245, 177, 63, 0.24);
}

.learner-visual-progress {
  width: 100%;
  height: 14px;
  background: linear-gradient(90deg, #1c7c7d 0%, #1c7c7d 72%, rgba(19, 58, 59, 0.08) 72%);
}

.learner-visual-orbit {
  position: absolute;
  border-radius: 999px;
  border: 1px dashed rgba(19, 58, 59, 0.16);
}

.learner-visual-orbit--one {
  width: 84px;
  height: 84px;
  top: 14px;
  right: 24px;
}

.learner-visual-orbit--two {
  width: 44px;
  height: 44px;
  left: 18px;
  bottom: 18px;
}

.learner-coaches-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.learner-coach-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(19, 58, 59, 0.05);
}

.learner-coach-body,
.learner-coach-tags {
  display: grid;
  gap: 8px;
}

.learner-coach-name,
.learner-coach-profile-name,
.course-dialog-coach-name {
  font-size: 16px;
  font-weight: 700;
  color: #133a3b;
}

.learner-coach-headline,
.learner-coach-profile-role,
.course-dialog-coach-role {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.66);
}

.learner-coach-meta,
.learner-coach-profile-meta {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.learner-coach-tags {
  grid-auto-flow: row;
}

.learner-coach-tag,
.course-dialog-coach-chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(19, 58, 59, 0.08);
  font-size: 12px;
  font-weight: 700;
  color: #133a3b;
}

.coach-dashboard {
  display: grid;
  gap: 18px;
  margin: 10px 0 26px;
}

.coach-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.coach-dashboard-card,
.coach-dashboard-panel {
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(255, 255, 255, 0.95);
}

.coach-dashboard-card {
  padding: 18px;
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.1);
}

.coach-dashboard-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.coach-dashboard-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
}

.coach-dashboard-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.coach-dashboard-label {
  margin-top: 14px;
  font-size: 15px;
  font-weight: 700;
  color: #133a3b;
}

.coach-dashboard-hint {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.coach-dashboard-panels {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.coach-dashboard-panel {
  padding: 20px;
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.coach-dashboard-panel--accent {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(252, 248, 239, 0.95));
}

.coach-dashboard-list {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.coach-dashboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.05);
}

.coach-dashboard-item-title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.coach-dashboard-item-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-dashboard-item-stats {
  display: grid;
  justify-items: end;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(19, 58, 59, 0.7);
}

.coach-section {
  margin: 24px 0 12px;
}

.coach-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #133a3b;
}

.coach-section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 8px 0 20px;
}

.coach-list {
  row-gap: 24px;
}

.coach-card {
  overflow: hidden;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  height: 100%;
  display: grid;
}

.coach-card--featured {
  border-color: rgba(245, 177, 63, 0.22);
}

.coach-card-cover {
  min-height: 210px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.58)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.coach-card-cover--compact {
  min-height: 170px;
}

.coach-card-cover-top,
.coach-card-cover-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.coach-card-pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 700;
}

.coach-card-pill--ghost {
  background: rgba(8, 23, 23, 0.24);
}

.coach-card-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 177, 63, 0.92);
  color: #3e2200;
  font-size: 12px;
  font-weight: 700;
}

.coach-card-cover-title {
  width: 100%;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.coach-card-cover-subtitle {
  width: 100%;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.coach-card-body {
  padding: 20px;
  display: grid;
  gap: 14px;
}

.learner-coach-profile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(244, 249, 248, 0.96), rgba(255, 255, 255, 0.96));
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.learner-coach-profile--compact {
  padding: 12px;
}

.learner-coach-profile-main {
  display: grid;
  gap: 3px;
}

.learner-coach-profile-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.56);
}

.coach-card-inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coach-inline-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 600;
}

.coach-card-description {
  font-size: 14px;
  color: rgba(19, 58, 59, 0.72);
}

.coach-card-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.coach-card-highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
  font-size: 13px;
  color: rgba(19, 58, 59, 0.78);
}

.coach-card-note {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(245, 177, 63, 0.12);
  color: rgba(44, 28, 2, 0.88);
  font-size: 13px;
}

.coach-card-meta,
.coach-card-block,
.coach-card-list {
  display: grid;
  gap: 8px;
}

.coach-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.coach-stat-chip {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 700;
}

.coach-card-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.65);
}

.coach-card-block-title,
.course-dialog-block-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(19, 58, 59, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.coach-card-list-item {
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.72);
}

.coach-card-list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1c7c7d;
}

.coach-card-actions,
.coach-owner-actions,
.coach-request-actions,
.coach-form-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.coach-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0 4px;
  flex-wrap: wrap;
}

.coach-pagination-label {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-card-btn,
.coach-action-btn {
  text-transform: none;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
  font-weight: 600;
}

.coach-action-btn-outline {
  text-transform: none;
  border-color: rgba(28, 124, 125, 0.4);
  color: #1c7c7d;
}

.coach-action-btn-danger {
  text-transform: none;
  border: 1px solid rgba(185, 74, 47, 0.24);
  background: rgba(185, 74, 47, 0.08);
  color: #b94a2f;
}

.coach-panel {
  margin-top: 32px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.coach-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.coach-panel-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
}

.coach-panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-reorder-list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.coach-reorder-item {
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

.coach-reorder-rank {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 700;
}

.coach-reorder-main {
  min-width: 0;
}

.coach-reorder-title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.coach-reorder-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.coach-form-cover {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.coach-form-cover-preview {
  min-height: 220px;
  border-radius: 22px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.58)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  display: flex;
}

.coach-form-cover-overlay {
  width: 100%;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #fff;
}

.coach-form-cover-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}

.coach-form-cover-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.coach-form-cover-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.coach-form-cover-actions,
.coach-form {
  display: grid;
  gap: 10px;
}

.coach-form {
  margin-top: 16px;
}

.coach-error {
  margin: 10px 0;
  font-size: 13px;
  color: #b94a2f;
}

.coach-empty {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-request-list {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.coach-request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.05);
}

.coach-request-title {
  font-size: 14px;
  font-weight: 600;
  color: #133a3b;
}

.coach-request-subtitle {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.coach-chip {
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

.course-dialog {
  overflow: hidden;
  border-radius: 26px;
}

.course-dialog-cover {
  position: relative;
  min-height: 220px;
  padding: 20px;
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.08), rgba(8, 23, 23, 0.58)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-dialog-close {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #fff;
}

.course-dialog-content {
  padding: 20px;
  display: grid;
  gap: 18px;
}

.course-dialog-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  gap: 18px;
}

.course-dialog-main,
.course-dialog-side,
.course-dialog-block {
  display: grid;
  gap: 12px;
}

.course-dialog-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
}

.course-dialog-subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.88);
}

.course-dialog-text {
  font-size: 14px;
  color: rgba(19, 58, 59, 0.75);
}

.course-dialog-note {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
  color: rgba(19, 58, 59, 0.75);
  font-size: 13px;
}

.course-dialog-note--accent {
  background: rgba(245, 177, 63, 0.12);
  color: rgba(44, 28, 2, 0.88);
}

.course-dialog-coach {
  padding: 16px;
  border-radius: 18px;
  background: rgba(19, 58, 59, 0.05);
  display: grid;
  gap: 12px;
}

.course-dialog-coach-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.course-dialog-coach-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-dialog-side-card {
  padding: 14px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.05);
  display: grid;
  gap: 10px;
}

.course-dialog-side-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.72);
}

.course-dialog-media {
  border-radius: 20px;
  overflow: hidden;
  background: rgba(19, 58, 59, 0.06);
  min-height: 280px;
}

.course-dialog-media video,
.course-dialog-media iframe {
  width: 100%;
  height: 420px;
  display: block;
}

.course-dialog-empty {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(19, 58, 59, 0.58);
  font-size: 14px;
}

@media (max-width: 960px) {
  .learner-dashboard-grid,
  .learner-illustration-card,
  .learner-coaches-grid,
  .coach-dashboard-grid,
  .coach-dashboard-panels,
  .coach-filters,
  .coach-card-highlights,
  .coach-form-cover,
  .course-dialog-grid {
    grid-template-columns: 1fr;
  }

  .coach-request-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .coach-dashboard-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .coach-dashboard-item-stats {
    justify-items: start;
  }

  .learner-coach-item,
  .course-dialog-coach-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'
import { getCourses, invalidateContent } from '@/services/contentService'
import { recordViewedCourse } from '@/services/learningActivityService'

const LIBRARY_IMAGE_MAX_SIZE = 1024 * 1024 * 1.5
const auth = useAuthStore()
const route = useRoute()

const courses = ref([])
const profile = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const libraryFormError = ref('')
const libraryFormLoading = ref(false)
const editingLibraryCourseId = ref('')
const deleteLoadingId = ref('')
const duplicateLoadingId = ref('')
const searchQuery = ref('')
const filterLevel = ref('all')
const filterMode = ref('all')
const filterCategory = ref('all')
const sortOption = ref('featured')
const pageSize = ref(6)
const libraryPage = ref(1)
const featuredOrderIds = ref([])
const draggedFeaturedId = ref('')
const reorderLoading = ref(false)

const dialog = ref(false)
const activeCourse = ref(null)
const expandedVideoId = ref('')
const expandedLibraryCourseId = ref('')
const externalVideoDialog = ref(false)
const activeExternalVideo = ref(null)

const newLibraryCourse = ref(createEmptyLibraryCourse())

const levelOptions = ['Tous niveaux', 'Débutant', 'Intermédiaire', 'Avancé']
const languageOptions = ['Français', 'Anglais', 'Bilingue']
const formatOptions = [
  { title: 'Vidéo', value: 'video' },
  { title: 'Hybride', value: 'hybrid' },
  { title: '1:1', value: 'one_to_one' },
  { title: 'Groupe', value: 'group' },
]
const filterLevelOptions = ['all', ...levelOptions]
const filterModeOptions = ['all', ...formatOptions.map((item) => item.value)]
const sortOptions = [
  { title: 'Mis en avant d’abord', value: 'featured' },
  { title: 'Titre A-Z', value: 'title_asc' },
  { title: 'Plus récents', value: 'recent' },
]
const pageSizeOptions = [6, 9, 12]

function createEmptyLibraryCourse() {
  return {
    title: '',
    subtitle: '',
    description: '',
    level: 'Tous niveaux',
    duration: '',
    category: '',
    language: 'Français',
    coachingMode: 'video',
    sessionCount: '1 module',
    price: 'Inclus',
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
    coachingMode: course.coachingMode || 'video',
    sessionCount: course.sessionCount || '1 module',
    price: course.price || 'Inclus',
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
const isEditingLibraryCourse = computed(() => !!editingLibraryCourseId.value)
const formTitle = computed(() =>
  isEditingLibraryCourse.value ? 'Modifier un cours pré-enregistré' : 'Créer un cours pré-enregistré'
)
const formSubtitle = computed(() =>
  isEditingLibraryCourse.value
    ? 'Mettez à jour la couverture, le contenu et les informations pédagogiques.'
    : 'Ajoutez un contenu disponible immédiatement avec un visuel et des objectifs clairs.'
)

const libraryCourses = computed(() => courses.value.filter((course) => course.type === 'library' || !course.coachId))
const categoryOptions = computed(() => [
  'all',
  ...Array.from(new Set(libraryCourses.value.map((course) => course.category).filter(Boolean))),
])

const levelPathDefinitions = [
  {
    id: 'debutant',
    title: 'Parcours débutant',
    subtitle: 'Poser les bases, le vocabulaire et les bons réflexes.',
    tone: 'teal',
    levels: ['Débutant', 'Tous niveaux'],
  },
  {
    id: 'intermediaire',
    title: 'Parcours intermédiaire',
    subtitle: 'Structurer vos échanges et mieux traiter les objections.',
    tone: 'gold',
    levels: ['Intermédiaire'],
  },
  {
    id: 'avance',
    title: 'Parcours avancé',
    subtitle: 'Gérer les cas complexes, la tension et les accords sensibles.',
    tone: 'coral',
    levels: ['Avancé'],
  },
]

const matchesLibraryBaseFilters = (course) => {
  const queryValue = searchQuery.value.trim().toLowerCase()
  const matchesQuery =
    !queryValue ||
    [course.title, course.subtitle, course.description, course.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(queryValue))

  const matchesMode = filterMode.value === 'all' || course.coachingMode === filterMode.value
  const matchesCategory = filterCategory.value === 'all' || course.category === filterCategory.value

  return matchesQuery && matchesMode && matchesCategory
}

const matchesLibraryCourseFilters = (course) => {
  const matchesLevel = filterLevel.value === 'all' || course.level === filterLevel.value
  return matchesLibraryBaseFilters(course) && matchesLevel
}

const baseFilteredLibraryCourses = computed(() => libraryCourses.value.filter(matchesLibraryBaseFilters))
const filteredLibraryCourses = computed(() => libraryCourses.value.filter(matchesLibraryCourseFilters))
const featuredLibraryCourses = computed(() => filteredLibraryCourses.value.filter((course) => course.featured))
const hasVideo = computed(() => !!activeCourse.value?.videoUrl)
const toMillis = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value?.seconds) return value.seconds * 1000
  if (value?._seconds) return value._seconds * 1000
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}
const isVideoFile = computed(() => {
  const url = activeCourse.value?.videoUrl || ''
  return ['.mp4', '.webm', '.ogg'].some((ext) => url.toLowerCase().includes(ext))
})
const embeddedVideoUrl = computed(() => normalizeVideoUrl(activeCourse.value?.videoUrl || ''))
const coverPreview = computed(() => newLibraryCourse.value.coverImage || '')

const externalNegotiationVideos = [
  {
    id: 'yt-WzHPqGWIAKI',
    title: 'Closing : techniques et posture de vente',
    subtitle: 'Nouvelle vidéo francophone ajoutée à la sélection.',
    description:
      'Un contenu supplémentaire en français autour du closing, de la posture commerciale et de la conduite d’échange.',
    source: 'YouTube',
    channel: 'Sélection francophone',
    level: 'Intermédiaire',
    duration: 'À visionner',
    topic: 'Closing',
    cta: 'Regarder sur la plateforme',
    videoUrl: 'https://www.youtube.com/watch?v=WzHPqGWIAKI',
    thumbnailUrl: 'https://i.ytimg.com/vi/WzHPqGWIAKI/hqdefault.jpg',
    notes: [
      'Vidéo ajoutée depuis ton lien',
      'Approche pratique orientée closing',
      'Complète bien la sélection francophone',
    ],
  },
  {
    id: 'yt-ehFdn0PkRaA',
    title: 'Closing et posture de négociation',
    subtitle: 'Vidéo de référence francophone fournie comme inspiration.',
    description:
      'Un contenu orienté closing, persuasion et conduite d’échange pour travailler la posture de négociation.',
    source: 'YouTube',
    channel: 'Sélection francophone',
    level: 'Intermédiaire',
    duration: 'À visionner',
    topic: 'Closing',
    cta: 'Voir sur YouTube',
    videoUrl: 'https://www.youtube.com/watch?v=ehFdn0PkRaA',
    thumbnailUrl: 'https://i.ytimg.com/vi/ehFdn0PkRaA/hqdefault.jpg',
    notes: [
      'Travail de posture et de conviction',
      'Approche concrète orientée closing',
      'Pertinent pour la négociation commerciale',
    ],
  },
  {
    id: 'yt-9M9vP8_1Geg',
    title: 'Négociation commerciale : les clés d’une démarche raisonnée',
    subtitle: 'Webinar francophone orienté stratégie, marge et concessions.',
    description:
      'Une vidéo en français sur la préparation d’une négociation commerciale, les concessions et la défense de la valeur.',
    source: 'YouTube',
    channel: 'Kestio',
    level: 'Avancé',
    duration: '40 min env.',
    topic: 'Négociation commerciale',
    cta: 'Voir la vidéo',
    videoUrl: 'https://www.youtube.com/watch?v=9M9vP8_1Geg',
    thumbnailUrl: 'https://i.ytimg.com/vi/9M9vP8_1Geg/hqdefault.jpg',
    notes: [
      'Préparation d’une négociation',
      'Gestion des concessions',
      'Défense de la valeur commerciale',
    ],
  },
  {
    id: 'yt-N9duDfWSfU4',
    title: 'Négociation : ne cherchez pas le compromis',
    subtitle: 'TEDxGEM · approche francophone de la négociation.',
    description:
      'Une vidéo en français qui remet en question l’idée du compromis automatique et propose une autre lecture de la négociation.',
    source: 'YouTube',
    channel: 'TEDx / Julien Pelabere',
    level: 'Intermédiaire',
    duration: 'TEDx',
    topic: 'Négociation',
    cta: 'Voir la vidéo',
    videoUrl: 'https://www.youtube.com/watch?v=N9duDfWSfU4',
    thumbnailUrl: 'https://i.ytimg.com/vi/N9duDfWSfU4/hqdefault.jpg',
    notes: [
      'Réflexion sur le compromis',
      'Vision moderne de la négociation',
      'Bonne ressource de posture',
    ],
  },
  {
    id: 'yt-rPysw4YEsm8',
    title: 'La Négociation raisonnée en 40 minutes',
    subtitle: 'Approche francophone inspirée de la méthode Harvard.',
    description:
      'Une présentation en français des principes de négociation raisonnée, utile pour structurer des échanges complexes.',
    source: 'YouTube',
    channel: 'Sélection francophone',
    level: 'Avancé',
    duration: '40 min',
    topic: 'Négociation raisonnée',
    cta: 'Voir la vidéo',
    videoUrl: 'https://www.youtube.com/watch?v=rPysw4YEsm8',
    thumbnailUrl: 'https://i.ytimg.com/vi/rPysw4YEsm8/hqdefault.jpg',
    notes: [
      'Méthode Harvard',
      'Approche structurée',
      'Utile en négociation pro',
    ],
  },
]

const toggleExternalVideo = (videoId) => {
  expandedVideoId.value = expandedVideoId.value === videoId ? '' : videoId
}

const openExternalVideo = (video) => {
  activeExternalVideo.value = video
  externalVideoDialog.value = true
}

const closeExternalVideo = () => {
  externalVideoDialog.value = false
  activeExternalVideo.value = null
}

const toggleLibraryCourse = (courseId) => {
  expandedLibraryCourseId.value = expandedLibraryCourseId.value === courseId ? '' : courseId
}

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

const courseModeLabel = (value) => {
  if (value === 'hybrid') return 'Hybride'
  if (value === 'one_to_one') return '1:1'
  if (value === 'group') return 'Groupe'
  return 'Vidéo'
}

const normalizeVideoUrl = (rawUrl) => {
  if (!rawUrl) return ''

  const trimmed = String(rawUrl).trim()
  if (!trimmed) return ''

  if (['.mp4', '.webm', '.ogg'].some((ext) => trimmed.toLowerCase().includes(ext))) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.split('/').filter(Boolean)[0]
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : trimmed
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) return trimmed

      const segments = parsed.pathname.split('/').filter(Boolean)
      const videoId =
        parsed.searchParams.get('v') ||
        (segments[0] === 'shorts' ? segments[1] : '') ||
        (segments[0] === 'watch' ? '' : segments[0])

      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : trimmed
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop()
      return videoId ? `https://player.vimeo.com/video/${videoId}` : trimmed
    }

    if (host === 'loom.com') {
      const videoId = parsed.pathname.split('/').filter(Boolean).pop()
      return videoId ? `https://www.loom.com/embed/${videoId}` : trimmed
    }
  } catch (error) {
    return trimmed
  }

  return trimmed
}

const filterLevelLabel = (value) => (value === 'all' ? 'Tous niveaux' : value)
const filterModeLabel = (value) => (value === 'all' ? 'Tous formats' : courseModeLabel(value))
const filterCategoryLabel = (value) => (value === 'all' ? 'Toutes catégories' : value)
const sortLabel = (value) =>
  sortOptions.find((option) => option.value === value)?.title || 'Mis en avant d’abord'
const pageSizeLabel = (value) => `${value} / page`

const coverStyle = (course) => {
  if (!course?.coverImage) return {}
  return {
    backgroundImage: `linear-gradient(180deg, rgba(8, 23, 23, 0.1), rgba(8, 23, 23, 0.58)), url('${course.coverImage}')`,
  }
}

const isOwnedLibraryCourse = (course) =>
  (course?.type === 'library' || !course?.coachId) && course?.createdBy === profile.value?.uid

const compareCourses = (left, right) => {
  if (sortOption.value === 'title_asc') {
    return (left.title || '').localeCompare(right.title || '', 'fr', { sensitivity: 'base' })
  }

  if (sortOption.value === 'recent') {
    const leftTime = toMillis(left.createdAt)
    const rightTime = toMillis(right.createdAt)
    return rightTime - leftTime
  }

  const featuredDelta = Number(Boolean(right.featured)) - Number(Boolean(left.featured))
  if (featuredDelta !== 0) return featuredDelta

  return (left.title || '').localeCompare(right.title || '', 'fr', { sensitivity: 'base' })
}

const sortItems = (items) => [...items].sort(compareCourses)

const paginateItems = (items, page) => {
  const start = (page - 1) * pageSize.value
  return items.slice(start, start + pageSize.value)
}

const sortedFeaturedLibraryCourses = computed(() => sortItems(featuredLibraryCourses.value))
const sortedLibraryCourses = computed(() => sortItems(filteredLibraryCourses.value))
const learningPaths = computed(() =>
  levelPathDefinitions
    .map((path) => {
      const pathCourses = sortItems(
        baseFilteredLibraryCourses.value.filter((course) => path.levels.includes(course.level || 'Tous niveaux'))
      )

      return {
        ...path,
        total: pathCourses.length,
        courses: pathCourses.slice(0, 3),
      }
    })
    .filter((path) => path.total > 0)
)
const paginatedLibraryCourses = computed(() => paginateItems(sortedLibraryCourses.value, libraryPage.value))
const libraryPageCount = computed(() => Math.max(1, Math.ceil(sortedLibraryCourses.value.length / pageSize.value)))
const ownedFeaturedLibraryCourses = computed(() =>
  sortItems(libraryCourses.value.filter((course) => course.featured && isOwnedLibraryCourse(course)))
)
const orderedOwnedFeaturedCourses = computed(() => {
  const itemsById = new Map(ownedFeaturedLibraryCourses.value.map((course) => [course.id, course]))
  return featuredOrderIds.value.map((id) => itemsById.get(id)).filter(Boolean)
})
const hasFeaturedReorderChanges = computed(() => {
  const currentIds = ownedFeaturedLibraryCourses.value.map((course) => course.id)
  return currentIds.join('|') !== featuredOrderIds.value.join('|')
})

const syncFeaturedOrder = () => {
  featuredOrderIds.value = ownedFeaturedLibraryCourses.value.map((course) => course.id)
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

const activateLevelPath = (path) => {
  const preferredLevel = path.levels.find((level) => level !== 'Tous niveaux') || 'all'
  filterLevel.value = preferredLevel
}

const saveFeaturedOrder = async () => {
  if (!featuredOrderIds.value.length) return

  reorderLoading.value = true
  try {
    await api.post('/courses/reorder', { ids: featuredOrderIds.value })
    invalidateContent('courses')
    await loadCourses()
    syncFeaturedOrder()
  } catch (error) {
    libraryFormError.value = 'Impossible de réorganiser les cours mis en avant.'
    console.error(error)
  } finally {
    reorderLoading.value = false
  }
}

const loadProfile = async () => {
  profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
}

const loadCourses = async () => {
  courses.value = await getCourses()
}

const resetLibraryCourseForm = () => {
  editingLibraryCourseId.value = ''
  newLibraryCourse.value = createEmptyLibraryCourse()
  libraryFormError.value = ''
}

const handleLibraryImageSelected = (file) => {
  if (!file) {
    newLibraryCourse.value.coverImage = ''
    return
  }

  if (file.size > LIBRARY_IMAGE_MAX_SIZE) {
    libraryFormError.value = 'L’image dépasse 1.5 Mo. Choisissez un fichier plus léger.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    newLibraryCourse.value.coverImage = reader.result
  }
  reader.readAsDataURL(file)
}

const clearLibraryImage = () => {
  newLibraryCourse.value.coverImage = ''
}

const startEditLibraryCourse = (course) => {
  if (!isOwnedLibraryCourse(course)) return
  editingLibraryCourseId.value = course.id
  newLibraryCourse.value = courseToForm(course)
  libraryFormError.value = ''
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

const cancelEditLibraryCourse = () => {
  resetLibraryCourseForm()
}

const handleSubmitLibraryCourse = async () => {
  libraryFormError.value = ''

  if (
    !newLibraryCourse.value.title ||
    !newLibraryCourse.value.description ||
    !newLibraryCourse.value.videoUrl
  ) {
    libraryFormError.value = 'Merci de remplir le titre, la description et le média.'
    return
  }

  libraryFormLoading.value = true
  try {
    const payload = {
      ...newLibraryCourse.value,
      duration: newLibraryCourse.value.duration || '—',
      category: newLibraryCourse.value.category || 'Bibliothèque',
      prerequisites: newLibraryCourse.value.prerequisites
        ? parseLineList(newLibraryCourse.value.prerequisites)
        : [],
      outcomes: newLibraryCourse.value.outcomes ? parseLineList(newLibraryCourse.value.outcomes) : [],
      type: 'library',
    }

    if (isEditingLibraryCourse.value) {
      await api.patch(`/courses/${editingLibraryCourseId.value}`, payload)
    } else {
      await api.post('/courses', payload)
    }

    resetLibraryCourseForm()
    invalidateContent('courses')
    await loadCourses()
  } catch (error) {
    libraryFormError.value = isEditingLibraryCourse.value
      ? 'Impossible de mettre à jour le cours.'
      : 'Impossible de créer le cours.'
    console.error(error)
  } finally {
    libraryFormLoading.value = false
  }
}

const deleteLibraryCourse = async (course) => {
  if (!isOwnedLibraryCourse(course)) return
  const confirmed = window.confirm(`Supprimer le cours "${course.title}" ?`)
  if (!confirmed) return

  deleteLoadingId.value = course.id
  try {
    await api.delete(`/courses/${course.id}`)
    if (editingLibraryCourseId.value === course.id) {
      resetLibraryCourseForm()
    }
    invalidateContent('courses')
    await loadCourses()
  } catch (error) {
    libraryFormError.value = 'Impossible de supprimer le cours.'
    console.error(error)
  } finally {
    deleteLoadingId.value = ''
  }
}

const duplicateLibraryCourse = async (course) => {
  if (!isOwnedLibraryCourse(course)) return

  duplicateLoadingId.value = course.id
  try {
    await api.post('/courses', {
      ...course,
      title: `${course.title} (copie)`,
      featured: false,
      type: 'library',
    })
    invalidateContent('courses')
    await loadCourses()
  } catch (error) {
    libraryFormError.value = 'Impossible de dupliquer le cours.'
    console.error(error)
  } finally {
    duplicateLoadingId.value = ''
  }
}

watch([searchQuery, filterLevel, filterMode, filterCategory, sortOption, pageSize], () => {
  libraryPage.value = 1
})

watch(libraryPageCount, (count) => {
  if (libraryPage.value > count) {
    libraryPage.value = count
  }
})

watch(
  () => ownedFeaturedLibraryCourses.value.map((course) => course.id).join('|'),
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

  loading.value = false

  if (route.query.autoplay === 'first' && externalNegotiationVideos.length > 0) {
    openExternalVideo(externalNegotiationVideos[0])
  }
})
</script>

<template>
  <v-container class="courses-container" fluid>
    <div class="courses-backdrop" aria-hidden="true"></div>

    <v-row class="courses-hero" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="courses-hero-card" elevation="8">
          <div class="courses-hero-content">
            <div class="courses-hero-left">
              <div class="courses-hero-title">Cours pré-enregistrés</div>
            </div>

            <div class="courses-hero-stats">
              <div class="courses-hero-stat-card">
                <div class="courses-hero-stat">{{ externalNegotiationVideos.length }}</div>
                <div class="courses-hero-label">vidéos disponibles</div>
              </div>
              <div class="courses-hero-stat-card">
                <div class="courses-hero-stat">{{ externalNegotiationVideos.length }}</div>
                <div class="courses-hero-label">sélection active</div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="courses-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-progress-linear v-if="loading" color="#1c7c7d" indeterminate class="mb-6" />

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div v-if="!loading" class="courses-section">
          <div class="courses-section-title">Vidéos closing & négociation</div>
          <div class="courses-section-subtitle">
            Une sélection de vidéos en français pour travailler le closing, les objections et la négociation.
          </div>
        </div>

        <v-row v-if="!loading" class="courses-list courses-list--videos">
          <v-col cols="12" md="6" v-for="video in externalNegotiationVideos" :key="video.id">
            <v-card class="course-video-card" elevation="4">
              <v-img
                :src="video.thumbnailUrl"
                :alt="video.title"
                class="course-video-card__poster"
                aspect-ratio="16/9"
                cover
              />

              <div class="course-video-card__body">
                <div class="course-video-card__top">
                  <div>
                    <div class="course-video-card__title">{{ video.title }}</div>
                    <div class="course-video-card__subtitle">{{ video.subtitle }}</div>
                  </div>
                  <div class="course-video-card__chips">
                    <span class="course-video-card__chip">{{ video.topic }}</span>
                    <span class="course-video-card__chip">{{ video.level }}</span>
                  </div>
                </div>

                <div class="course-video-card__actions">
                  <v-btn class="course-action-btn-outline" size="small" @click="toggleExternalVideo(video.id)">
                    {{ expandedVideoId === video.id ? 'Fermer détails' : 'Voir détails' }}
                  </v-btn>
                  <v-btn class="course-card-btn" size="small" @click="openExternalVideo(video)">
                    Regarder ici
                  </v-btn>
                </div>

                <v-expand-transition>
                  <div v-if="expandedVideoId === video.id" class="course-video-card__details">
                    <div class="course-video-card__description">{{ video.description }}</div>
                    <div class="course-video-card__meta">
                      <span>{{ video.channel }}</span>
                      <span>{{ video.duration }}</span>
                      <span>{{ video.source }}</span>
                    </div>
                    <div class="course-video-card__list">
                      <div v-for="note in video.notes" :key="note" class="course-video-card__list-item">
                        {{ note }}
                      </div>
                    </div>
                  </div>
                </v-expand-transition>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-dialog v-model="externalVideoDialog" max-width="980">
      <v-card class="course-dialog" elevation="10">
        <div class="course-dialog-cover course-dialog-cover--plain">
          <div class="course-dialog-cover-top">
            <div class="course-card-pill">{{ activeExternalVideo?.level || 'Tous niveaux' }}</div>
            <div class="course-card-pill course-card-pill--ghost">{{ activeExternalVideo?.topic || 'Vidéo' }}</div>
          </div>
          <div class="course-dialog-cover-bottom">
            <div class="course-dialog-title">{{ activeExternalVideo?.title }}</div>
            <div class="course-dialog-subtitle">{{ activeExternalVideo?.subtitle || activeExternalVideo?.description }}</div>
          </div>
          <v-btn icon="mdi-close" variant="text" class="course-dialog-close" @click="closeExternalVideo"></v-btn>
        </div>

        <div class="course-dialog-content">
          <div class="course-dialog-media">
            <iframe
              v-if="activeExternalVideo?.videoUrl"
              :src="normalizeVideoUrl(activeExternalVideo.videoUrl)"
              :title="activeExternalVideo?.title || 'Vidéo'"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.courses-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.courses-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.courses-hero,
.courses-grid {
  position: relative;
  z-index: 1;
}

.courses-hero-card {
  border-radius: 28px;
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 241, 233, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 56px rgba(21, 18, 14, 0.1);
}

.courses-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.courses-hero-title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: #1c1a16;
}

.courses-hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.courses-hero-stat-card {
  min-width: 120px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(28, 26, 22, 0.08);
}

.courses-hero-stat {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  color: #1c1a16;
}

.courses-hero-label {
  font-size: 12px;
  color: #625b53;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.courses-grid {
  margin-top: 28px;
}

.courses-section {
  margin: 24px 0 12px;
}

.courses-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #133a3b;
}

.courses-section-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.courses-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 8px 0 20px;
}

.courses-list {
  row-gap: 24px;
}

.courses-list--videos {
  margin-bottom: 10px;
}

.courses-paths {
  row-gap: 20px;
  margin-bottom: 12px;
}

.courses-path-card {
  height: 100%;
  padding: 20px;
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: #fff;
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.1);
  display: grid;
  gap: 16px;
}

.courses-path-card--teal {
  background: linear-gradient(180deg, rgba(227, 245, 243, 0.92), rgba(255, 255, 255, 0.98));
}

.courses-path-card--gold {
  background: linear-gradient(180deg, rgba(255, 244, 220, 0.92), rgba(255, 255, 255, 0.98));
}

.courses-path-card--coral {
  background: linear-gradient(180deg, rgba(255, 235, 227, 0.92), rgba(255, 255, 255, 0.98));
}

.courses-path-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.courses-path-card__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #133a3b;
}

.courses-path-card__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.68);
}

.courses-path-card__count {
  min-width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.courses-path-card__list {
  display: grid;
  gap: 10px;
}

.courses-path-card__item {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.88);
  color: #133a3b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.courses-path-card__item:hover {
  transform: translateY(-1px);
  background: #fff;
}

.courses-path-card__item-main {
  display: grid;
  gap: 4px;
}

.courses-path-card__item-title {
  font-size: 14px;
  font-weight: 700;
}

.courses-path-card__item-meta {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.66);
}

.course-card {
  overflow: hidden;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  height: 100%;
  display: grid;
}

.course-card-poster {
  border-bottom: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(19, 58, 59, 0.05);
}

.course-card--featured {
  border-color: rgba(245, 177, 63, 0.22);
}

.course-card-cover {
  min-height: 210px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(8, 23, 23, 0.1), rgba(8, 23, 23, 0.58)),
    linear-gradient(130deg, #1c7c7d, #133a3b 55%, #f2b03f);
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}

.course-card-cover--compact {
  min-height: 170px;
}

.course-card-cover-top,
.course-card-cover-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.course-card-pill {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  font-size: 12px;
  font-weight: 700;
}

.course-card-pill--ghost {
  background: rgba(8, 23, 23, 0.24);
}

.course-card-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 177, 63, 0.92);
  color: #3e2200;
  font-size: 12px;
  font-weight: 700;
}

.course-card-cover-title {
  width: 100%;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.course-card-cover-subtitle {
  width: 100%;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.course-card-body {
  padding: 20px;
  display: grid;
  gap: 14px;
}

.course-card-head {
  display: grid;
  gap: 8px;
}

.course-card-head--compact {
  gap: 8px;
}

.course-card-head-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.course-card-title {
  color: #133a3b;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
}

.course-card-subtitle {
  color: rgba(19, 58, 59, 0.72);
  font-size: 14px;
  line-height: 1.45;
}

.course-card-inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-inline-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 600;
}

.course-card-description {
  font-size: 14px;
  color: rgba(19, 58, 59, 0.72);
  line-height: 1.6;
}

.course-card-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.course-card-highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
  font-size: 13px;
  color: rgba(19, 58, 59, 0.78);
}

.course-card-meta,
.course-card-block,
.course-card-list {
  display: grid;
  gap: 8px;
}

.course-card-details {
  display: grid;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid rgba(19, 58, 59, 0.08);
}

.course-card-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(19, 58, 59, 0.04);
  font-size: 13px;
  color: rgba(19, 58, 59, 0.65);
}

.course-video-card {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 244, 238, 0.96));
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.08);
}

.course-video-card__poster {
  border-bottom: 1px solid rgba(19, 58, 59, 0.08);
}

.course-video-card__body {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.course-video-card__top {
  display: grid;
  gap: 10px;
}

.course-video-card__title {
  color: #133a3b;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.course-video-card__subtitle {
  margin-top: 4px;
  color: rgba(19, 58, 59, 0.7);
  font-size: 13px;
  line-height: 1.45;
}

.course-video-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-video-card__chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.06);
  color: #133a3b;
  font-size: 12px;
  font-weight: 600;
}

.course-video-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.course-video-card__details {
  display: grid;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid rgba(19, 58, 59, 0.08);
}

.course-video-card__description {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(19, 58, 59, 0.72);
}

.course-video-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.course-video-card__meta span {
  display: inline-flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.05);
  color: rgba(19, 58, 59, 0.72);
  font-size: 12px;
}

.course-video-card__list {
  display: grid;
  gap: 8px;
}

.course-video-card__list-item {
  position: relative;
  padding-left: 16px;
  color: rgba(19, 58, 59, 0.72);
  font-size: 13px;
}

.course-video-card__list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1c7c7d;
}

.course-card-block-title,
.course-dialog-block-title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(19, 58, 59, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.course-card-list-item {
  position: relative;
  padding-left: 16px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.72);
}

.course-card-list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #1c7c7d;
}

.course-card-actions,
.course-owner-actions,
.courses-form-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.courses-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 12px 0 4px;
  flex-wrap: wrap;
}

.courses-pagination-label {
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.course-card-btn {
  text-transform: none;
  font-weight: 600;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

.course-action-btn-outline {
  text-transform: none;
  border-color: rgba(28, 124, 125, 0.4);
  color: #1c7c7d;
}

.course-action-btn-danger {
  text-transform: none;
  border: 1px solid rgba(185, 74, 47, 0.24);
  background: rgba(185, 74, 47, 0.08);
  color: #b94a2f;
}

.courses-panel {
  margin-top: 32px;
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.courses-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.courses-panel-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
}

.courses-panel-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.courses-reorder-list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.courses-reorder-item {
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

.courses-reorder-rank {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(28, 124, 125, 0.12);
  color: #1c7c7d;
  font-weight: 700;
}

.courses-reorder-main {
  min-width: 0;
}

.courses-reorder-title {
  font-size: 14px;
  font-weight: 700;
  color: #133a3b;
}

.courses-reorder-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.62);
}

.courses-form-cover {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 18px;
}

.courses-form-cover-preview {
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

.courses-form-cover-overlay {
  width: 100%;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  color: #fff;
}

.courses-form-cover-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.8);
}

.courses-form-cover-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.courses-form-cover-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.88);
}

.courses-form-cover-actions,
.courses-form {
  display: grid;
  gap: 10px;
}

.courses-form {
  margin-top: 16px;
}

.courses-error {
  margin: 10px 0;
  font-size: 13px;
  color: #b94a2f;
}

.courses-empty {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
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

.course-dialog-cover--plain {
  min-height: 150px;
  background: #f8fbfb;
  border-bottom: 1px solid rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.course-dialog-close {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #133a3b;
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
  .courses-filters,
  .course-card-highlights,
  .courses-form-cover,
  .course-dialog-grid {
    grid-template-columns: 1fr;
  }
}
</style>

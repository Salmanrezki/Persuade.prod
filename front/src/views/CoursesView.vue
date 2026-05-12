<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import logoUrl from '@/assets/logo.png'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'
import { getCourses, invalidateContent } from '@/services/contentService'

const LIBRARY_IMAGE_MAX_SIZE = 1024 * 1024 * 1.5
const auth = useAuthStore()

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

const openCourse = (course) => {
  activeCourse.value = course
  dialog.value = true
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
              <div class="courses-brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="72" height="72" class="courses-logo" />
                <div class="courses-brand-text">Persuade</div>
              </div>
              <div class="courses-hero-title">Cours pré-enregistrés</div>
              <div class="courses-hero-subtitle">
                Explorez une bibliothèque vidéo dédiée à la négociation, avec méthodes, cas concrets et visionnage intégré.
              </div>
            </div>

            <div class="courses-hero-stats">
              <div class="courses-hero-stat-card">
                <div class="courses-hero-stat">{{ libraryCourses.length }}</div>
                <div class="courses-hero-label">cours disponibles</div>
              </div>
              <div class="courses-hero-stat-card">
                <div class="courses-hero-stat">{{ featuredLibraryCourses.length }}</div>
                <div class="courses-hero-label">mis en avant</div>
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

        <div v-if="!loading" class="courses-filters">
          <v-text-field
            v-model="searchQuery"
            label="Rechercher un cours"
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

        <div v-if="!loading && sortedFeaturedLibraryCourses.length" class="courses-section">
          <div class="courses-section-title">Sélection vidéo</div>
          <div class="courses-section-subtitle">Les contenus les plus mis en avant du moment.</div>
        </div>

        <v-row v-if="!loading && sortedFeaturedLibraryCourses.length" class="courses-list">
          <v-col cols="12" md="6" v-for="course in sortedFeaturedLibraryCourses" :key="`featured-${course.id}`">
            <v-card class="course-card course-card--featured" elevation="6">
              <div class="course-card-cover" :style="coverStyle(course)">
                <div class="course-card-cover-top">
                  <div class="course-card-pill">{{ course.level || 'Tous niveaux' }}</div>
                  <div class="course-card-pill course-card-pill--ghost">{{ courseModeLabel(course.coachingMode) }}</div>
                </div>
                <div class="course-card-cover-bottom">
                  <div class="course-card-badge">À la une</div>
                  <div class="course-card-cover-title">{{ course.title }}</div>
                  <div v-if="course.subtitle" class="course-card-cover-subtitle">{{ course.subtitle }}</div>
                </div>
              </div>

              <div class="course-card-body">
                <div class="course-card-inline-chips">
                  <span class="course-inline-chip">{{ course.category || 'Bibliothèque' }}</span>
                  <span class="course-inline-chip">{{ course.language || 'Français' }}</span>
                  <span class="course-inline-chip" v-if="course.sessionCount">{{ course.sessionCount }}</span>
                </div>

                <div class="course-card-description">{{ course.description }}</div>

                <div class="course-card-highlights">
                  <div class="course-card-highlight">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ course.duration || '—' }}</span>
                  </div>
                  <div class="course-card-highlight">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ course.price || 'Inclus' }}</span>
                  </div>
                  <div class="course-card-highlight">
                    <v-icon size="18">mdi-account-check-outline</v-icon>
                    <span>{{ course.targetAudience || 'Tout public' }}</span>
                  </div>
                  <div class="course-card-highlight">
                    <v-icon size="18">mdi-play-circle-outline</v-icon>
                    <span>Accès immédiat</span>
                  </div>
                </div>

                <div v-if="course.outcomes?.length" class="course-card-block">
                  <div class="course-card-block-title">Vous allez apprendre</div>
                  <div class="course-card-list">
                    <div v-for="entry in course.outcomes.slice(0, 3)" :key="entry" class="course-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div class="course-card-actions">
                  <v-btn class="course-card-btn" size="large" @click="openCourse(course)">
                    Accéder
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedLibraryCourse(course)" class="course-owner-actions">
                  <v-btn
                    class="course-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === course.id"
                    @click="duplicateLibraryCourse(course)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="course-action-btn-outline" size="small" @click="startEditLibraryCourse(course)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="course-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === course.id"
                    @click="deleteLibraryCourse(course)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && learningPaths.length" class="courses-section">
          <div class="courses-section-title">Parcours par niveau</div>
          <div class="courses-section-subtitle">
            Une lecture plus simple pour progresser du bon cours au bon moment.
          </div>
        </div>

        <v-row v-if="!loading && learningPaths.length" class="courses-paths">
          <v-col cols="12" md="4" v-for="path in learningPaths" :key="path.id">
            <v-card class="courses-path-card" :class="`courses-path-card--${path.tone}`" elevation="4">
              <div class="courses-path-card__header">
                <div>
                  <div class="courses-path-card__title">{{ path.title }}</div>
                  <div class="courses-path-card__subtitle">{{ path.subtitle }}</div>
                </div>
                <div class="courses-path-card__count">{{ path.total }}</div>
              </div>

              <div class="courses-path-card__list">
                <button
                  v-for="course in path.courses"
                  :key="`${path.id}-${course.id}`"
                  type="button"
                  class="courses-path-card__item"
                  @click="openCourse(course)"
                >
                  <div class="courses-path-card__item-main">
                    <span class="courses-path-card__item-title">{{ course.title }}</span>
                    <span class="courses-path-card__item-meta">
                      {{ course.level || 'Tous niveaux' }} · {{ course.duration || '—' }}
                    </span>
                  </div>
                  <v-icon size="18">mdi-play-circle-outline</v-icon>
                </button>
              </div>

              <v-btn class="course-action-btn-outline" size="small" @click="activateLevelPath(path)">
                Voir ce niveau
              </v-btn>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading" class="courses-section">
          <div class="courses-section-title">Cours pré-enregistrés</div>
          <div class="courses-section-subtitle">Des contenus de négociation disponibles immédiatement, directement sur la plateforme.</div>
        </div>

        <v-row v-if="!loading" class="courses-list">
          <v-col cols="12" md="4" v-for="course in paginatedLibraryCourses" :key="course.id">
            <v-card class="course-card" elevation="6">
              <div class="course-card-cover course-card-cover--compact" :style="coverStyle(course)">
                <div class="course-card-cover-top">
                  <div class="course-card-pill">{{ course.level || 'Tous niveaux' }}</div>
                  <div class="course-card-pill course-card-pill--ghost">{{ courseModeLabel(course.coachingMode) }}</div>
                </div>
                <div class="course-card-cover-bottom">
                  <div class="course-card-cover-title">{{ course.title }}</div>
                  <div v-if="course.subtitle" class="course-card-cover-subtitle">{{ course.subtitle }}</div>
                </div>
              </div>

              <div class="course-card-body">
                <div class="course-card-description">{{ course.description }}</div>

                <div class="course-card-meta">
                  <div class="course-card-line">
                    <v-icon size="18">mdi-folder-outline</v-icon>
                    <span>{{ course.category || 'Général' }}</span>
                  </div>
                  <div class="course-card-line">
                    <v-icon size="18">mdi-timer-outline</v-icon>
                    <span>{{ course.duration || '—' }}</span>
                  </div>
                  <div class="course-card-line">
                    <v-icon size="18">mdi-translate</v-icon>
                    <span>{{ course.language || 'Français' }}</span>
                  </div>
                  <div class="course-card-line">
                    <v-icon size="18">mdi-cash</v-icon>
                    <span>{{ course.price || 'Inclus' }}</span>
                  </div>
                </div>

                <div v-if="course.prerequisites?.length" class="course-card-block">
                  <div class="course-card-block-title">Pré-requis</div>
                  <div class="course-card-list">
                    <div v-for="entry in course.prerequisites.slice(0, 2)" :key="entry" class="course-card-list-item">
                      {{ entry }}
                    </div>
                  </div>
                </div>

                <div class="course-card-actions">
                  <v-btn class="course-card-btn" size="large" @click="openCourse(course)">
                    Accéder
                  </v-btn>
                </div>

                <div v-if="isCoach && isOwnedLibraryCourse(course)" class="course-owner-actions">
                  <v-btn
                    class="course-action-btn-outline"
                    size="small"
                    :loading="duplicateLoadingId === course.id"
                    @click="duplicateLibraryCourse(course)"
                  >
                    Dupliquer
                  </v-btn>
                  <v-btn class="course-action-btn-outline" size="small" @click="startEditLibraryCourse(course)">
                    Modifier
                  </v-btn>
                  <v-btn
                    class="course-action-btn-danger"
                    size="small"
                    :loading="deleteLoadingId === course.id"
                    @click="deleteLibraryCourse(course)"
                  >
                    Supprimer
                  </v-btn>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div v-if="!loading && libraryPageCount > 1" class="courses-pagination">
          <div class="courses-pagination-label">
            {{ sortedLibraryCourses.length }} résultat(s) · tri {{ sortLabel(sortOption).toLowerCase() }}
          </div>
          <v-pagination
            v-model="libraryPage"
            :length="libraryPageCount"
            rounded="circle"
            density="comfortable"
          />
        </div>

        <div v-if="isCoach" class="courses-panel">
          <div class="courses-panel-header">
            <div>
              <div class="courses-panel-title">Réordonner la mise en avant</div>
              <div class="courses-panel-subtitle">
                Glissez vos cours à la une pour choisir leur ordre d’affichage.
              </div>
            </div>
            <v-btn
              class="course-card-btn"
              size="small"
              :disabled="orderedOwnedFeaturedCourses.length < 2 || !hasFeaturedReorderChanges"
              :loading="reorderLoading"
              @click="saveFeaturedOrder"
            >
              Enregistrer l’ordre
            </v-btn>
          </div>

          <div v-if="orderedOwnedFeaturedCourses.length < 2" class="courses-empty">
            Ajoutez au moins deux cours mis en avant pour les réordonner.
          </div>

          <div v-else class="courses-reorder-list">
            <div
              v-for="(course, index) in orderedOwnedFeaturedCourses"
              :key="`reorder-${course.id}`"
              class="courses-reorder-item"
              draggable="true"
              @dragstart="handleFeaturedDragStart(course.id)"
              @dragover.prevent
              @drop="handleFeaturedDrop(course.id)"
            >
              <div class="courses-reorder-rank">{{ index + 1 }}</div>
              <div class="courses-reorder-main">
                <div class="courses-reorder-title">{{ course.title }}</div>
                <div class="courses-reorder-subtitle">
                  {{ course.category || 'Bibliothèque' }} · {{ course.duration || '—' }}
                </div>
              </div>
              <v-icon size="20">mdi-drag</v-icon>
            </div>
          </div>
        </div>

        <div v-if="isCoach" class="courses-panel">
          <div class="courses-panel-header">
            <div>
              <div class="courses-panel-title">{{ formTitle }}</div>
              <div class="courses-panel-subtitle">{{ formSubtitle }}</div>
            </div>
            <v-btn
              v-if="isEditingLibraryCourse"
              class="course-action-btn-outline"
              size="small"
              @click="cancelEditLibraryCourse"
            >
              Annuler l’édition
            </v-btn>
          </div>

          <div class="courses-form-cover">
            <div class="courses-form-cover-preview" :style="coverStyle({ coverImage: coverPreview || '' })">
              <div class="courses-form-cover-overlay">
                <div class="courses-form-cover-label">Aperçu couverture</div>
                <div class="courses-form-cover-title">{{ newLibraryCourse.title || 'Titre du cours' }}</div>
                <div class="courses-form-cover-subtitle">
                  {{ newLibraryCourse.subtitle || 'Sous-titre, promesse ou angle du contenu.' }}
                </div>
              </div>
            </div>

            <div class="courses-form-cover-actions">
              <v-file-input
                label="Téléverser une image"
                accept="image/*"
                variant="outlined"
                hide-details
                @update:modelValue="handleLibraryImageSelected"
              />
              <v-text-field
                v-model="newLibraryCourse.coverImage"
                label="Ou coller une URL d’image"
                variant="outlined"
                hide-details
              />
              <v-btn variant="text" @click="clearLibraryImage">Retirer l’image</v-btn>
            </div>
          </div>

          <v-row class="courses-form">
            <v-col cols="12" md="7">
              <v-text-field v-model="newLibraryCourse.title" label="Titre" variant="outlined" />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field v-model="newLibraryCourse.subtitle" label="Sous-titre / promesse" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="newLibraryCourse.description" label="Description" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newLibraryCourse.level" :items="levelOptions" label="Niveau" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="newLibraryCourse.coachingMode"
                :items="formatOptions"
                label="Format"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="newLibraryCourse.language" :items="languageOptions" label="Langue" variant="outlined" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="newLibraryCourse.duration" label="Durée" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newLibraryCourse.category" label="Catégorie" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newLibraryCourse.sessionCount" label="Format / volume" variant="outlined" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="newLibraryCourse.price" label="Prix" variant="outlined" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="newLibraryCourse.targetAudience" label="Public cible" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newLibraryCourse.prerequisites"
                label="Pré-requis (une ligne = un point)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea
                v-model="newLibraryCourse.outcomes"
                label="Résultats pédagogiques (une ligne = un point)"
                variant="outlined"
                rows="4"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newLibraryCourse.bookingNotes"
                label="Notes pédagogiques / contexte"
                variant="outlined"
                rows="3"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newLibraryCourse.videoUrl"
                label="Lien vidéo ou média"
                variant="outlined"
                placeholder="https://..."
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newLibraryCourse.meetingLink"
                label="Lien complémentaire (optionnel)"
                variant="outlined"
                placeholder="https://..."
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-checkbox v-model="newLibraryCourse.featured" label="Mettre en avant" hide-details />
            </v-col>
          </v-row>

          <div v-if="libraryFormError" class="courses-error">{{ libraryFormError }}</div>

          <div class="courses-form-footer">
            <v-btn
              v-if="isEditingLibraryCourse"
              class="course-action-btn-outline"
              size="large"
              @click="cancelEditLibraryCourse"
            >
              Annuler
            </v-btn>
            <v-btn
              class="course-card-btn"
              size="large"
              :loading="libraryFormLoading"
              @click="handleSubmitLibraryCourse"
            >
              {{ isEditingLibraryCourse ? 'Enregistrer les modifications' : 'Créer le cours pré-enregistré' }}
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="960">
      <v-card class="course-dialog" elevation="10">
        <div class="course-dialog-cover" :style="coverStyle(activeCourse)">
          <div class="course-dialog-cover-top">
            <div class="course-card-pill">{{ activeCourse?.level || 'Tous niveaux' }}</div>
            <div class="course-card-pill course-card-pill--ghost">{{ courseModeLabel(activeCourse?.coachingMode) }}</div>
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

              <div v-if="activeCourse?.outcomes?.length" class="course-dialog-block">
                <div class="course-dialog-block-title">Objectifs</div>
                <div class="course-card-list">
                  <div v-for="entry in activeCourse.outcomes" :key="entry" class="course-card-list-item">
                    {{ entry }}
                  </div>
                </div>
              </div>

              <div v-if="activeCourse?.prerequisites?.length" class="course-dialog-block">
                <div class="course-dialog-block-title">Pré-requis</div>
                <div class="course-card-list">
                  <div v-for="entry in activeCourse.prerequisites" :key="entry" class="course-card-list-item">
                    {{ entry }}
                  </div>
                </div>
              </div>

              <div v-if="activeCourse?.bookingNotes" class="course-dialog-note">
                {{ activeCourse.bookingNotes }}
              </div>
            </div>

            <div class="course-dialog-side">
              <div class="course-dialog-side-card">
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-folder-outline</v-icon>
                  <span>{{ activeCourse?.category || 'Bibliothèque' }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-translate</v-icon>
                  <span>{{ activeCourse?.language || 'Français' }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-cash</v-icon>
                  <span>{{ activeCourse?.price || 'Inclus' }}</span>
                </div>
                <div class="course-dialog-side-line">
                  <v-icon size="18">mdi-timer-outline</v-icon>
                  <span>{{ activeCourse?.duration || '—' }}</span>
                </div>
                <div class="course-dialog-side-line" v-if="activeCourse?.sessionCount">
                  <v-icon size="18">mdi-counter</v-icon>
                  <span>{{ activeCourse.sessionCount }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="course-dialog-media">
            <template v-if="hasVideo">
              <video v-if="isVideoFile" controls :src="activeCourse.videoUrl" />
              <iframe
                v-else
                :src="embeddedVideoUrl"
                title="Cours vidéo"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerpolicy="strict-origin-when-cross-origin"
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
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.1);
  box-shadow: 0 20px 45px rgba(12, 31, 32, 0.16);
}

.courses-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.courses-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.courses-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.courses-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.courses-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #133a3b;
}

.courses-hero-subtitle {
  margin-top: 6px;
  max-width: 720px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
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
  background: rgba(19, 58, 59, 0.05);
  border: 1px solid rgba(19, 58, 59, 0.08);
}

.courses-hero-stat {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.courses-hero-label {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
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

.course-card-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.65);
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

import { computed, ref } from 'vue'
import { getCourses } from '@/services/contentService'
import { ROUTE_PATHS } from '@/router/paths'
import { curatedMasterclasses } from '@/data/curatedMasterclasses'

const items = ref([])
const loading = ref(false)
const error = ref('')

let inflightPromise = null
let lastFetchedAt = 0

const CACHE_TTL_MS = 60 * 1000

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

const formatShortDate = (value) => {
  const millis = toMillis(value)
  if (!millis) return 'Mise a jour recente'

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(millis))
}

const buildMasterclassItems = (entries) =>
  entries
    .filter((item) => item?.title || item?.subtitle || item?.sortDate)
    .map((item) => ({
      id: `masterclass-${item.id}`,
      type: 'masterclass',
      title: item.title,
      subtitle: item.subtitle || 'Session a venir',
      meta: item.displayDate || (item.sortDate ? `Le ${formatShortDate(item.sortDate)}` : 'Programmation en cours'),
      route: ROUTE_PATHS.masterclass,
      label: 'Masterclass',
      cta: 'Voir la session',
      image: '',
      icon: 'mdi-presentation-play',
      tone: 'gold',
      sortValue: item.sortDate ? toMillis(item.sortDate) : Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => left.sortValue - right.sortValue)

const buildCourseItems = (entries, options) =>
  entries
    .filter(options.filter)
    .filter((item) => item?.title || item?.subtitle || item?.category)
    .map((item) => ({
      id: `${options.prefix}-${item.id}`,
      type: options.prefix,
      title: item.title,
      subtitle: item.subtitle || item.category || '',
      meta: `Ajoute le ${formatShortDate(item.createdAt || item.updatedAt)}`,
      route: options.route,
      label: options.label,
      cta: options.cta,
      image: options.showImage ? item.coverImage || '' : '',
      icon: options.icon,
      tone: options.tone,
      sortValue: toMillis(item.createdAt || item.updatedAt),
    }))
    .sort((left, right) => right.sortValue - left.sortValue)

const interleaveItems = (groups, maxItems = 6) => {
  const result = []
  let index = 0

  while (result.length < maxItems) {
    let pushedInCycle = false

    groups.forEach((group) => {
      const entry = group[index]
      if (!entry || result.length >= maxItems) return
      result.push(entry)
      pushedInCycle = true
    })

    if (!pushedInCycle) break
    index += 1
  }

  return result
}

const fetchNewsFeed = async ({ force = false } = {}) => {
  const isCacheFresh = Date.now() - lastFetchedAt < CACHE_TTL_MS
  if (!force && items.value.length && isCacheFresh) return items.value
  if (inflightPromise) return inflightPromise

  inflightPromise = (async () => {
    loading.value = true
    error.value = ''

    try {
      const [coursesRes] = await Promise.allSettled([getCourses()])

      const courseEntries =
        coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value) ? coursesRes.value : []
      const masterclassItems = buildMasterclassItems(curatedMasterclasses).slice(0, 2)
      const libraryItems = buildCourseItems(courseEntries, {
        prefix: 'library-course',
        route: ROUTE_PATHS.courses,
        label: 'Cours pre-enregistre',
        cta: 'Voir le cours',
        icon: 'mdi-play-circle-outline',
        tone: 'teal',
        showImage: false,
        filter: (item) => item?.type === 'library' || !item?.coachId,
      }).slice(0, 4)
      const coachItems = buildCourseItems(courseEntries, {
        prefix: 'coach-course',
        route: ROUTE_PATHS.coachCourses,
        label: 'Cours avec coach',
        cta: 'Voir le parcours',
        icon: 'mdi-account-tie-outline',
        tone: 'coral',
        showImage: true,
        filter: (item) => !!item?.coachId,
      }).slice(0, 3)

      const nextItems = interleaveItems([masterclassItems, libraryItems, coachItems], 6)
      items.value = nextItems
      lastFetchedAt = Date.now()
      return items.value
    } catch (fetchError) {
      error.value = 'Impossible de charger les actualites.'
      items.value = []
      return items.value
    } finally {
      loading.value = false
      inflightPromise = null
    }
  })()

  return inflightPromise
}

export const useNewsFeed = () => ({
  items: computed(() => items.value),
  loading: computed(() => loading.value),
  error: computed(() => error.value),
  refresh: fetchNewsFeed,
})

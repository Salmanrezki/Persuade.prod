<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import api from '@/services/api'
import { collection, getDocs, query, where } from 'firebase/firestore'
import navDashboardUrl from '@/assets/nav-dashboard.svg'
import navLibraryUrl from '@/assets/nav-library.svg'
import navCoachUrl from '@/assets/nav-coach.svg'
import navMasterclassUrl from '@/assets/nav-masterclass.svg'
import navExercisesUrl from '@/assets/nav-exercises.svg'
import navChatUrl from '@/assets/nav-chat.svg'
import { db } from '@/services/firebase'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()

const mobileDrawer = ref(false)
const sectionSeenMap = ref({})
const sectionLatestMap = ref({})
const sectionNotificationReady = ref(false)
const tourSpotlightTarget = ref('')
const tourSpotlightTone = ref('teal')
const tourSpotlightActive = ref(false)

let notificationsInterval = null
let tourSpotlightListener = null

const SECTION_STORAGE_PREFIX = 'persuade.section-seen'
const SECTION_KEYS = {
  courses: ROUTE_PATHS.courses,
  coachCourses: ROUTE_PATHS.coachCourses,
  masterclass: ROUTE_PATHS.masterclass,
  practicalExercises: ROUTE_PATHS.practicalExercises,
  chat: ROUTE_PATHS.chat,
}
const isCoach = computed(() => auth.profile?.role === 'coach')
const workspaceLabel = computed(() => (isCoach.value ? 'Espace coach' : 'Espace personnel'))

const getStorageKey = (uid) => `${SECTION_STORAGE_PREFIX}.${uid}`

const navItems = computed(() => [
  {
    title: 'Dashboard',
    subtitle: 'Vue generale',
    path: ROUTE_PATHS.home,
    icon: 'mdi-view-grid-outline',
    image: navDashboardUrl,
    tone: 'teal',
  },
  {
    title: 'Chat',
    subtitle: 'Messages et suivi',
    path: ROUTE_PATHS.chat,
    icon: 'mdi-message-processing-outline',
    image: navChatUrl,
    badge: auth.chatUnreadCount || 0,
    showNotification: shouldShowNotification('chat'),
    tone: 'coral',
  },
  {
    title: 'Cours particuliers',
    subtitle: isCoach.value ? 'Offres et suivi client' : 'Sessions guidees',
    path: ROUTE_PATHS.coachCourses,
    icon: 'mdi-account-tie-outline',
    image: navCoachUrl,
    showNotification: shouldShowNotification('coachCourses'),
    tone: 'teal',
  },
  {
    title: isCoach.value ? 'Mes masterclass' : 'Masterclass',
    subtitle: isCoach.value ? 'Créer et mettre en avant' : 'Formats experts',
    path: ROUTE_PATHS.masterclass,
    icon: 'mdi-presentation-play',
    image: navMasterclassUrl,
    showNotification: shouldShowNotification('masterclass'),
    tone: 'coral',
  },
  {
    title: 'Cours pré-enregistrés',
    subtitle: 'A votre rythme',
    path: ROUTE_PATHS.courses,
    icon: 'mdi-play-circle-outline',
    image: navLibraryUrl,
    showNotification: shouldShowNotification('courses'),
    tone: 'gold',
  },
  {
    title: 'Exercices pratiques',
    subtitle: 'Bientôt disponible',
    path: ROUTE_PATHS.practicalExercises,
    icon: 'mdi-dumbbell',
    image: navExercisesUrl,
    showNotification: shouldShowNotification('practicalExercises'),
    statusLabel: 'Bientôt',
    statusVariant: 'soon',
    tone: 'teal',
  },
])

const displayName = computed(() => {
  if (auth.profile?.firstname) return auth.profile.firstname
  if (auth.user?.displayName) return auth.user.displayName
  if (auth.user?.email) return auth.user.email.split('@')[0]
  return 'Utilisateur'
})

const activeNavItem = computed(() => navItems.value.find((item) => item.path === route.path) || navItems.value[0])
const accountRoleLabel = computed(() => (isCoach.value ? 'Coach' : 'Apprenant'))

const profilePhoto = computed(() => auth.profile?.profilePhoto || '')
const userInitials = computed(() => {
  const source =
    auth.profile?.firstname || auth.user?.displayName || auth.user?.email?.split('@')[0] || 'U'

  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'
})

const isActive = (path) => route.path === path
const isTourTarget = (target) => tourSpotlightActive.value && tourSpotlightTarget.value === target
const hasUnreadBadge = (item) => Number(item.badge || 0) > 0
const navStatusLabel = (item) => {
  if (hasUnreadBadge(item)) return String(item.badge)
  if (item.statusLabel) return item.statusLabel
  if (item.showNotification) return 'Nouveau'
  return ''
}
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

const loadChatConversations = async () => {
  if (!auth.user?.uid) return []

  const snapshot = await getDocs(
    query(collection(db, 'conversations'), where('participants', 'array-contains', auth.user.uid))
  )

  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

const readSeenState = () => {
  const uid = auth.user?.uid
  if (!uid || typeof window === 'undefined') return { initialized: false, sections: {} }

  try {
    const raw = window.localStorage.getItem(getStorageKey(uid))
    if (!raw) return { initialized: false, sections: {} }

    const parsed = JSON.parse(raw)
    return {
      initialized: !!parsed?.initialized,
      sections: parsed?.sections && typeof parsed.sections === 'object' ? parsed.sections : {},
    }
  } catch (error) {
    return { initialized: false, sections: {} }
  }
}

const writeSeenState = (payload) => {
  const uid = auth.user?.uid
  if (!uid || typeof window === 'undefined') return

  window.localStorage.setItem(getStorageKey(uid), JSON.stringify(payload))
}

const markSectionAsSeen = (sectionKey) => {
  if (!sectionKey || !auth.user) return

  const latest = Number(sectionLatestMap.value[sectionKey] || 0)
  const nextSections = {
    ...sectionSeenMap.value,
    [sectionKey]: latest,
  }

  sectionSeenMap.value = nextSections
  writeSeenState({
    initialized: true,
    sections: nextSections,
  })
}

const markCurrentRouteAsSeen = () => {
  const sectionKey = Object.entries(SECTION_KEYS).find(([, path]) => path === route.path)?.[0]
  if (!sectionKey) return
  markSectionAsSeen(sectionKey)
}

const shouldShowNotification = (sectionKey) => {
  if (!sectionNotificationReady.value) return false

  const latest = Number(sectionLatestMap.value[sectionKey] || 0)
  const seen = Number(sectionSeenMap.value[sectionKey] || 0)

  return latest > 0 && latest > seen
}

const canPollNotifications = computed(
  () => !!auth.user && auth.profileLoaded && auth.hasOnboarded && route.path !== ROUTE_PATHS.onboarding
)

const refreshSectionNotifications = async () => {
  if (!canPollNotifications.value) return

  try {
    const [coursesRes, masterclassesRes, conversationsRes] = await Promise.allSettled([
      api.get('/courses'),
      api.get('/masterclasses'),
      loadChatConversations(),
    ])

    const courseItems =
      coursesRes.status === 'fulfilled' && Array.isArray(coursesRes.value.data) ? coursesRes.value.data : []
    const masterclassItems =
      masterclassesRes.status === 'fulfilled' && Array.isArray(masterclassesRes.value.data)
        ? masterclassesRes.value.data
        : []
    const conversationItems =
      conversationsRes.status === 'fulfilled' && Array.isArray(conversationsRes.value)
        ? conversationsRes.value
        : []

    const latestBySection = {
      courses: courseItems
        .filter((item) => item?.type === 'library' || !item?.coachId)
        .reduce((latest, item) => Math.max(latest, toMillis(item?.createdAt || item?.updatedAt)), 0),
      coachCourses: courseItems
        .filter((item) => item?.coachId)
        .reduce((latest, item) => Math.max(latest, toMillis(item?.createdAt || item?.updatedAt)), 0),
      masterclass: masterclassItems.reduce(
        (latest, item) => Math.max(latest, toMillis(item?.createdAt || item?.updatedAt || item?.scheduleAt)),
        0
      ),
      practicalExercises: 0,
      chat: conversationItems.reduce(
        (latest, item) => Math.max(latest, toMillis(item?.updatedAt || item?.createdAt)),
        0
      ),
    }

    sectionLatestMap.value = latestBySection

    const storedState = readSeenState()
    if (!storedState.initialized) {
      sectionSeenMap.value = { ...latestBySection }
      writeSeenState({
        initialized: true,
        sections: { ...latestBySection },
      })
    } else {
      sectionSeenMap.value = storedState.sections
    }

    sectionNotificationReady.value = true
    markCurrentRouteAsSeen()
  } catch (error) {
    sectionNotificationReady.value = true
  }
}

const startNotificationsPolling = () => {
  stopNotificationsPolling()
  refreshSectionNotifications()
  notificationsInterval = window.setInterval(refreshSectionNotifications, 60000)
}

const stopNotificationsPolling = () => {
  if (!notificationsInterval) return
  window.clearInterval(notificationsInterval)
  notificationsInterval = null
}

const openMobileDrawer = () => {
  mobileDrawer.value = true
}

const closeMobileDrawer = () => {
  mobileDrawer.value = false
}

const goTo = async (path) => {
  closeMobileDrawer()

  if (route.path !== path) {
    await router.push(path)
  }
}

const logout = async () => {
  closeMobileDrawer()
  stopNotificationsPolling()
  await auth.logout()
  router.push(ROUTE_PATHS.login)
}

const handleTourSpotlight = (event) => {
  const detail = event?.detail || {}
  tourSpotlightActive.value = !!detail.active
  tourSpotlightTarget.value = detail.target || ''
  tourSpotlightTone.value = detail.tone || 'teal'
}

watch(
  () => [auth.user?.uid, auth.profileLoaded, auth.hasOnboarded, route.path],
  ([uid]) => {
    sectionSeenMap.value = {}
    sectionLatestMap.value = {}
    sectionNotificationReady.value = false

    if (!uid || !canPollNotifications.value) {
      stopNotificationsPolling()
      return
    }

    startNotificationsPolling()
  },
  { immediate: true }
)

watch(
  () => route.path,
  () => {
    if (!auth.user) return
    markCurrentRouteAsSeen()
  }
)

onMounted(() => {
  if (typeof window === 'undefined') return
  tourSpotlightListener = (event) => handleTourSpotlight(event)
  window.addEventListener('persuade-tour-spotlight', tourSpotlightListener)
})

onBeforeUnmount(() => {
  stopNotificationsPolling()
  if (typeof window !== 'undefined' && tourSpotlightListener) {
    window.removeEventListener('persuade-tour-spotlight', tourSpotlightListener)
  }
})
</script>

<template>
  <template v-if="auth.user">
    <button
      v-if="mobile && !mobileDrawer"
      type="button"
      class="app-mobile-drawer-trigger"
      aria-label="Ouvrir la navigation"
      @click.stop="openMobileDrawer"
    >
      <span class="app-mobile-drawer-trigger__icon">
        <v-icon size="22">mdi-menu</v-icon>
      </span>
      <span class="app-mobile-drawer-trigger__copy">
        <span class="app-mobile-drawer-trigger__label">Menu</span>
        <span class="app-mobile-drawer-trigger__hint">Ouvrir la navigation</span>
      </span>
    </button>

    <v-app-bar
      v-if="mobile"
      flat
      height="88"
      class="app-mobile-bar"
    >
      <div class="app-mobile-bar__inner">
        <v-btn variant="text" class="app-mobile-brand" @click="goTo(ROUTE_PATHS.home)">
          <div class="app-mobile-brand__copy">
            <div class="app-mobile-brand__eyebrow">{{ workspaceLabel }}</div>
            <div class="app-mobile-brand__title">Persuade</div>
          </div>
        </v-btn>

        <div class="app-mobile-bar__spacer" aria-hidden="true"></div>
      </div>
    </v-app-bar>

    <v-navigation-drawer
      v-if="mobile"
      :model-value="mobileDrawer"
      @update:model-value="mobileDrawer = $event"
      location="left"
      temporary
      width="300"
      class="app-sidebar app-sidebar--mobile"
    >
      <div class="app-sidebar-shell app-sidebar-shell--mobile">
        <v-sheet class="app-sidebar-panel app-sidebar-panel--mobile" rounded="xl">
          <div class="app-sidebar-top app-sidebar-top--mobile">
            <v-btn variant="text" class="app-sidebar-brand" @click="goTo(ROUTE_PATHS.home)">
              <div>
                <div class="app-sidebar-kicker">{{ workspaceLabel }}</div>
                <div class="app-sidebar-title">Persuade</div>
              </div>
            </v-btn>

            <v-btn
              icon="mdi-close"
              variant="text"
              class="app-sidebar-toggle"
              @click="closeMobileDrawer"
            />
          </div>

          <div class="app-sidebar-account">
            <div class="app-profile-card__avatar-wrap">
              <v-avatar size="52" class="app-profile-card__avatar">
                <v-img v-if="profilePhoto" :src="profilePhoto" alt="Photo de profil" />
                <span v-else class="app-profile-card__initials">{{ userInitials }}</span>
              </v-avatar>
              <span class="app-profile-card__status"></span>
            </div>

            <div class="app-sidebar-account__copy">
              <div class="app-sidebar-account__name">{{ displayName }}</div>
              <div class="app-sidebar-account__meta">
                <v-chip size="small" rounded="pill" class="app-sidebar-account__chip">
                  {{ accountRoleLabel }}
                </v-chip>
                <span class="app-sidebar-account__route">{{ activeNavItem?.title }}</span>
              </div>
            </div>
          </div>
        </v-sheet>

        <div class="app-sidebar-nav-wrap">
          <div class="app-sidebar-nav-stack">
            <div class="app-sidebar-section-label">Explorer</div>

            <v-list nav class="app-sidebar-nav" bg-color="transparent">
              <v-list-item
                v-for="item in navItems"
                :key="item.path"
                rounded="xl"
                class="app-sidebar-item"
                :class="[
                  `app-sidebar-item--${item.tone}`,
                  { 'app-sidebar-item--active': isActive(item.path) },
                  isTourTarget(item.path) ? `app-tour-spotlight app-tour-spotlight--${tourSpotlightTone}` : '',
                ]"
                @click="goTo(item.path)"
              >
                <template #prepend>
                  <div class="app-sidebar-item__icon-wrap">
                    <v-img
                      v-if="item.image"
                      :src="item.image"
                      :alt="`Illustration ${item.title}`"
                      contain
                      class="app-sidebar-item__icon-illustration"
                    />
                    <v-icon v-else size="20">{{ item.icon }}</v-icon>
                  </div>
                </template>

                <v-list-item-title class="app-sidebar-item__title">
                  <span class="app-sidebar-item__title-text">{{ item.title }}</span>
                </v-list-item-title>

                <v-list-item-subtitle class="app-sidebar-item__subtitle">
                  {{ item.subtitle }}
                </v-list-item-subtitle>

                <template v-if="navStatusLabel(item)" #append>
                  <span
                    class="app-sidebar-item__status-pill"
                    :class="{
                      'app-sidebar-item__status-pill--badge': hasUnreadBadge(item),
                      'app-sidebar-item__status-pill--soon': item.statusVariant === 'soon',
                    }"
                  >
                    {{ navStatusLabel(item) }}
                  </span>
                </template>
              </v-list-item>
            </v-list>

          </div>
        </div>

        <div class="app-sidebar-bottom">
          <v-btn
            block
            class="app-profile-card__logout"
            prepend-icon="mdi-logout"
            @click="logout"
          >
            Déconnexion
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>

    <v-navigation-drawer
      v-else
      :model-value="true"
      permanent
      location="left"
      width="332"
      class="app-sidebar"
    >
      <div class="app-sidebar-shell">
        <v-sheet class="app-sidebar-panel" rounded="xl">
          <div class="app-sidebar-top">
            <v-btn
              variant="text"
              class="app-sidebar-brand"
              @click="goTo(ROUTE_PATHS.home)"
            >
              <div>
                <div class="app-sidebar-kicker">{{ workspaceLabel }}</div>
                <div class="app-sidebar-title">Persuade</div>
              </div>
            </v-btn>
          </div>

          <div class="app-sidebar-account">
            <div class="app-profile-card__avatar-wrap">
              <v-avatar size="52" class="app-profile-card__avatar">
                <v-img v-if="profilePhoto" :src="profilePhoto" alt="Photo de profil" />
                <span v-else class="app-profile-card__initials">{{ userInitials }}</span>
              </v-avatar>
              <span class="app-profile-card__status"></span>
            </div>

            <div class="app-sidebar-account__copy">
              <div class="app-sidebar-account__name">{{ displayName }}</div>
              <div class="app-sidebar-account__meta">
                <v-chip size="small" rounded="pill" class="app-sidebar-account__chip">
                  {{ accountRoleLabel }}
                </v-chip>
                <span class="app-sidebar-account__route">{{ activeNavItem?.title }}</span>
              </div>
            </div>
          </div>
        </v-sheet>

        <div class="app-sidebar-nav-wrap">
          <div class="app-sidebar-nav-stack">
            <div class="app-sidebar-section-label">Explorer</div>

            <v-list nav class="app-sidebar-nav" bg-color="transparent">
              <v-list-item
                v-for="item in navItems"
                :key="item.path"
                rounded="xl"
                class="app-sidebar-item"
                :class="[
                  `app-sidebar-item--${item.tone}`,
                  { 'app-sidebar-item--active': isActive(item.path) },
                  isTourTarget(item.path) ? `app-tour-spotlight app-tour-spotlight--${tourSpotlightTone}` : '',
                ]"
                @click="goTo(item.path)"
              >
                <template #prepend>
                  <div class="app-sidebar-item__icon-wrap">
                    <v-img
                      v-if="item.image"
                      :src="item.image"
                      :alt="`Illustration ${item.title}`"
                      contain
                      class="app-sidebar-item__icon-illustration"
                    />
                    <v-icon v-else size="20">{{ item.icon }}</v-icon>
                  </div>
                </template>

                <div class="app-sidebar-item__body">
                  <v-list-item-title class="app-sidebar-item__title">
                    <span class="app-sidebar-item__title-text">{{ item.title }}</span>
                  </v-list-item-title>

                  <v-list-item-subtitle class="app-sidebar-item__subtitle">
                    {{ item.subtitle }}
                  </v-list-item-subtitle>
                </div>

                <template v-if="navStatusLabel(item)" #append>
                  <span
                    class="app-sidebar-item__status-pill"
                    :class="{
                      'app-sidebar-item__status-pill--badge': hasUnreadBadge(item),
                      'app-sidebar-item__status-pill--soon': item.statusVariant === 'soon',
                    }"
                  >
                    {{ navStatusLabel(item) }}
                  </span>
                </template>
              </v-list-item>
            </v-list>

          </div>
        </div>

        <div class="app-sidebar-bottom">
          <v-btn
            block
            class="app-profile-card__logout"
            prepend-icon="mdi-logout"
            @click="logout"
          >
            Déconnexion
          </v-btn>
        </div>
      </div>
    </v-navigation-drawer>
  </template>
</template>

<style scoped>
.app-mobile-drawer-trigger {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 1300;
  min-width: 146px;
  min-height: 58px;
  padding: 10px 14px 10px 10px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.42), transparent 34%),
    linear-gradient(135deg, rgba(246, 214, 133, 0.96), rgba(190, 228, 220, 0.96)),
    rgba(255, 250, 244, 0.96);
  color: #2a241d;
  box-shadow: 0 18px 34px rgba(73, 53, 31, 0.14);
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.app-mobile-drawer-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 36px rgba(73, 53, 31, 0.18);
}

.app-mobile-drawer-trigger__icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.64);
  border: 1px solid rgba(42, 36, 29, 0.08);
  flex-shrink: 0;
}

.app-mobile-drawer-trigger__copy {
  display: grid;
  text-align: left;
  line-height: 1.1;
}

.app-mobile-drawer-trigger__label {
  font-size: 14px;
  font-weight: 800;
  color: #2a241d;
}

.app-mobile-drawer-trigger__hint {
  margin-top: 3px;
  font-size: 11px;
  color: rgba(42, 36, 29, 0.62);
}

.app-mobile-bar {
  background:
    radial-gradient(circle at left top, rgba(246, 214, 133, 0.18), transparent 38%),
    radial-gradient(circle at right top, rgba(190, 228, 220, 0.18), transparent 34%),
    rgba(255, 250, 244, 0.88);
  border-bottom: 1px solid rgba(42, 36, 29, 0.08);
  color: #2a241d;
  backdrop-filter: blur(22px);
  z-index: 1200;
}

.app-mobile-bar__inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px;
}

.app-mobile-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 10px 14px 10px 10px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.52);
  color: inherit;
  text-align: left;
  justify-content: flex-start;
}

.app-mobile-brand__copy {
  min-width: 0;
}

.app-mobile-brand__eyebrow,
.app-sidebar-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b55d3f;
}

.app-mobile-brand__title,
.app-sidebar-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #2a241d;
}

.app-mobile-bar__spacer {
  width: 146px;
  height: 58px;
  flex-shrink: 0;
}

.app-sidebar {
  background:
    radial-gradient(circle at top left, rgba(246, 214, 133, 0.22), transparent 28%),
    radial-gradient(circle at bottom right, rgba(190, 228, 220, 0.22), transparent 26%),
    linear-gradient(180deg, rgba(255, 251, 246, 0.98), rgba(245, 238, 228, 0.96)),
    #f8f1e8;
  color: #2a241d;
  border-right: 1px solid rgba(42, 36, 29, 0.08);
}

.app-sidebar--mobile {
  border-right: none;
  z-index: 1301 !important;
}

.app-sidebar-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 18px 18px;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.app-sidebar-shell--mobile {
  padding: 18px 14px 16px;
}

.app-sidebar-panel,
.app-sidebar-nav-stack,
.app-sidebar-item {
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 252, 247, 0.82);
  box-shadow: 0 18px 44px rgba(60, 43, 24, 0.08);
  backdrop-filter: blur(16px);
}

.app-sidebar-panel {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.app-sidebar-panel--mobile {
  padding: 14px;
}

.app-sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.app-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  color: inherit;
  text-align: left;
  justify-content: flex-start;
  padding: 0;
}

.app-sidebar-toggle {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.64);
  color: #2a241d;
  border: 1px solid rgba(42, 36, 29, 0.08);
}

.app-sidebar-account {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.58);
  color: #2a241d;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.app-sidebar-item:hover {
  transform: translateX(2px);
}

.app-sidebar-item--active {
  border-color: rgba(181, 93, 63, 0.22);
  box-shadow: 0 14px 28px rgba(73, 53, 31, 0.1);
}

.app-profile-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.app-profile-card__avatar {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), transparent 55%),
    linear-gradient(135deg, #2e4b40, #d98b61);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.app-profile-card__initials {
  font-size: 15px;
}

.app-profile-card__status {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #42d392;
  border: 2px solid #fff7ef;
}

.app-sidebar-account__copy,
.app-sidebar-item__body {
  min-width: 0;
  flex: 1;
}

.app-sidebar-account__name,
.app-sidebar-item__title {
  font-size: 14px;
  font-weight: 700;
  color: #2a241d;
}

.app-sidebar-item__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(42, 36, 29, 0.58);
}

.app-sidebar-account__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.app-sidebar-account__chip {
  background: rgba(181, 93, 63, 0.1);
  color: #9f4e33;
  font-weight: 700;
}

.app-sidebar-account__route {
  font-size: 12px;
  color: rgba(42, 36, 29, 0.58);
}

.app-sidebar-nav-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.app-sidebar-nav-wrap::-webkit-scrollbar {
  width: 6px;
}

.app-sidebar-nav-wrap::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(42, 36, 29, 0.18);
}

.app-sidebar-nav-stack {
  display: grid;
  gap: 14px;
  align-content: start;
  padding: 14px;
  border-radius: 28px;
}

.app-sidebar-section-label {
  padding: 0 12px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(42, 36, 29, 0.44);
  border-bottom: 1px solid rgba(42, 36, 29, 0.08);
}

.app-sidebar-nav {
  display: grid;
  gap: 8px;
  padding: 0;
}

.app-sidebar-item {
  --nav-accent: rgba(67, 196, 175, 0.2);
  --nav-accent-strong: #2e8b78;
  min-height: 72px;
  padding: 10px 12px;
  border-radius: 22px;
  color: rgba(42, 36, 29, 0.76);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.app-sidebar-item--gold {
  --nav-accent: rgba(245, 191, 71, 0.22);
  --nav-accent-strong: #c78c21;
}

.app-sidebar-item--coral {
  --nav-accent: rgba(217, 139, 97, 0.22);
  --nav-accent-strong: #b55d3f;
}

.app-sidebar-item--active {
  background:
    linear-gradient(135deg, var(--nav-accent), rgba(255, 255, 255, 0.62)),
    rgba(255, 255, 255, 0.82);
}

.app-sidebar-item__icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(42, 36, 29, 0.08);
  color: var(--nav-accent-strong);
  flex-shrink: 0;
}

.app-sidebar-item__icon-illustration {
  width: 28px;
  height: 28px;
}

.app-sidebar-item__title-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-item__status-pill {
  height: 26px;
  min-width: 26px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(42, 36, 29, 0.08);
  color: #2a241d;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.app-sidebar-item__status-pill--badge {
  background: rgba(217, 139, 97, 0.16);
  border-color: rgba(181, 93, 63, 0.18);
  color: #8f4228;
}

.app-sidebar-item__status-pill--soon {
  background: rgba(66, 184, 131, 0.12);
  border-color: rgba(39, 122, 89, 0.18);
  color: #276a50;
}

.app-sidebar-item :deep(.v-list-item__prepend) {
  margin-inline-end: 12px;
  align-self: center;
}

.app-sidebar-item :deep(.v-list-item__append) {
  margin-inline-start: 12px;
}

.app-sidebar-item :deep(.v-list-item__content) {
  opacity: 1;
  min-width: 0;
}

.app-sidebar-bottom {
  display: grid;
  gap: 10px;
}

.app-profile-card__logout {
  text-transform: none;
  font-weight: 700;
  border-radius: 20px;
  min-height: 52px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(250, 244, 236, 0.96)),
    rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(42, 36, 29, 0.08);
  color: #2a241d;
  box-shadow: 0 12px 22px rgba(73, 53, 31, 0.08);
}

.app-tour-spotlight {
  position: relative;
  isolation: isolate;
}

.app-tour-spotlight::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  border: 2px solid rgba(46, 75, 64, 0.34);
  box-shadow: 0 0 0 10px rgba(46, 75, 64, 0.08);
  pointer-events: none;
  animation: app-tour-pulse 1.8s ease-in-out infinite;
}

.app-tour-spotlight--gold::after {
  border-color: rgba(245, 191, 71, 0.48);
  box-shadow: 0 0 0 10px rgba(245, 191, 71, 0.12);
}

.app-tour-spotlight--coral::after {
  border-color: rgba(181, 93, 63, 0.42);
  box-shadow: 0 0 0 10px rgba(181, 93, 63, 0.1);
}

@keyframes app-tour-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }
  50% {
    transform: scale(1.01);
    opacity: 1;
  }
}

@media (max-width: 959px) {
  .app-sidebar-item {
    min-height: 68px;
  }
}

@media (max-width: 520px) {
  .app-mobile-drawer-trigger {
    min-width: 132px;
    right: 14px;
    top: 14px;
    min-height: 54px;
    padding: 9px 12px 9px 9px;
  }

  .app-mobile-drawer-trigger__hint {
    font-size: 10px;
  }

  .app-mobile-bar__spacer {
    width: 132px;
    height: 54px;
  }

  .app-mobile-brand__title,
  .app-sidebar-title {
    font-size: 17px;
  }
}
</style>

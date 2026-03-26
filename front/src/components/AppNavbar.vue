<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import api from '@/services/api'
import { collection, getDocs, query, where } from 'firebase/firestore'
import AppNewsCarousel from '@/components/AppNewsCarousel.vue'
import logoUrl from '@/assets/logo.png'
import navDashboardUrl from '@/assets/nav-dashboard.svg'
import navLibraryUrl from '@/assets/nav-library.svg'
import navCoachUrl from '@/assets/nav-coach.svg'
import navMasterclassUrl from '@/assets/nav-masterclass.svg'
import navExercisesUrl from '@/assets/nav-exercises.svg'
import navChatUrl from '@/assets/nav-chat.svg'
import navPreferencesUrl from '@/assets/nav-preferences.svg'
import { db } from '@/services/firebase'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()

const mobileDrawer = ref(false)
const sectionSeenMap = ref({})
const sectionLatestMap = ref({})
const sectionNotificationReady = ref(false)

let notificationsInterval = null

const SECTION_STORAGE_PREFIX = 'persuade.section-seen'
const SECTION_KEYS = {
  courses: ROUTE_PATHS.courses,
  coachCourses: ROUTE_PATHS.coachCourses,
  masterclass: ROUTE_PATHS.masterclass,
  practicalExercises: ROUTE_PATHS.practicalExercises,
  chat: ROUTE_PATHS.chat,
}

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
    title: 'Cours pré-enregistrés',
    subtitle: 'A votre rythme',
    path: ROUTE_PATHS.courses,
    icon: 'mdi-play-circle-outline',
    image: navLibraryUrl,
    showNotification: shouldShowNotification('courses'),
    tone: 'gold',
  },
  {
    title: 'Cours avec coach',
    subtitle: 'Sessions guidees',
    path: ROUTE_PATHS.coachCourses,
    icon: 'mdi-account-tie-outline',
    image: navCoachUrl,
    showNotification: shouldShowNotification('coachCourses'),
    tone: 'teal',
  },
  {
    title: 'Masterclass',
    subtitle: 'Formats experts',
    path: ROUTE_PATHS.masterclass,
    icon: 'mdi-presentation-play',
    image: navMasterclassUrl,
    showNotification: shouldShowNotification('masterclass'),
    tone: 'coral',
  },
  {
    title: 'Exercices pratiques',
    subtitle: 'Mise en pratique',
    path: ROUTE_PATHS.practicalExercises,
    icon: 'mdi-dumbbell',
    image: navExercisesUrl,
    showNotification: shouldShowNotification('practicalExercises'),
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
])

const displayName = computed(() => {
  if (auth.profile?.firstname) return auth.profile.firstname
  if (auth.user?.displayName) return auth.user.displayName
  if (auth.user?.email) return auth.user.email.split('@')[0]
  return 'Utilisateur'
})

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
const hasUnreadBadge = (item) => Number(item.badge || 0) > 0
const navStatusLabel = (item) => {
  if (hasUnreadBadge(item)) return String(item.badge)
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

onBeforeUnmount(() => {
  stopNotificationsPolling()
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
        <button type="button" class="app-mobile-brand" @click="goTo(ROUTE_PATHS.home)">
          <div class="app-mobile-brand__mark">
            <v-img
              :src="logoUrl"
              alt="Logo Persuade"
              width="42"
              height="42"
              class="app-sidebar-logo"
            />
          </div>
          <div class="app-mobile-brand__copy">
            <div class="app-mobile-brand__title">Persuade</div>
          </div>
        </button>

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
        <div class="app-sidebar-hero app-sidebar-hero--mobile">
          <div class="app-sidebar-top app-sidebar-top--mobile">
            <button type="button" class="app-sidebar-brand" @click="goTo(ROUTE_PATHS.home)">
              <div class="app-sidebar-logo-wrap">
                <v-img
                  :src="logoUrl"
                  alt="Logo Persuade"
                  width="42"
                  height="42"
                  class="app-sidebar-logo"
                />
              </div>
              <div>
                <div class="app-sidebar-title">Persuade</div>
              </div>
            </button>

            <v-btn
              icon="mdi-close"
              variant="text"
              class="app-sidebar-toggle"
              @click="closeMobileDrawer"
            />
          </div>

          <button
            type="button"
            class="app-sidebar-hero__action"
            :class="{ 'app-sidebar-hero__action--active': isActive(ROUTE_PATHS.profile) }"
            @click="goTo(ROUTE_PATHS.profile)"
          >
            <div class="app-profile-card__avatar-wrap">
              <v-avatar size="52" class="app-profile-card__avatar">
                <v-img v-if="profilePhoto" :src="profilePhoto" alt="Photo de profil" />
                <span v-else class="app-profile-card__initials">{{ userInitials }}</span>
              </v-avatar>
              <span class="app-profile-card__status"></span>
            </div>

            <div class="app-sidebar-hero__action-copy">
              <div class="app-sidebar-hero__action-title">Mon profil</div>
              <div class="app-sidebar-hero__action-subtitle">Voir et gérer mes informations</div>
            </div>

            <v-icon size="18" class="app-sidebar-hero__action-arrow">mdi-chevron-right</v-icon>
          </button>
        </div>

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
                    :class="{ 'app-sidebar-item__status-pill--badge': hasUnreadBadge(item) }"
                  >
                    {{ navStatusLabel(item) }}
                  </span>
                </template>
              </v-list-item>
            </v-list>

            <AppNewsCarousel class="app-sidebar-featured" variant="sidebar" />
          </div>
        </div>

        <div class="app-sidebar-bottom">
          <button
            type="button"
            class="app-sidebar-utility-card app-sidebar-utility-card--mobile app-sidebar-utility-card--preferences"
            :class="{ 'app-sidebar-utility-card--active': isActive(ROUTE_PATHS.preferences) }"
            @click="goTo(ROUTE_PATHS.preferences)"
          >
            <span class="app-sidebar-utility-card__icon">
              <v-img
                :src="navPreferencesUrl"
                alt="Illustration Préférences"
                contain
                class="app-sidebar-utility-card__illustration"
              />
            </span>

            <span class="app-sidebar-utility-card__content">
              <span class="app-sidebar-utility-card__title">Préférences</span>
              <span class="app-sidebar-utility-card__subtitle">Rythme et format</span>
            </span>

            <v-icon size="18" class="app-sidebar-utility-card__arrow">mdi-chevron-right</v-icon>
          </button>

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
        <div class="app-sidebar-hero">
          <div class="app-sidebar-top">
            <button
              type="button"
              class="app-sidebar-brand"
              @click="goTo(ROUTE_PATHS.home)"
            >
              <div class="app-sidebar-logo-wrap">
                <v-img
                  :src="logoUrl"
                  alt="Logo Persuade"
                  width="42"
                  height="42"
                  class="app-sidebar-logo"
                />
              </div>

              <div>
                <div class="app-sidebar-title">Persuade</div>
              </div>
            </button>
          </div>

          <button
            type="button"
            class="app-sidebar-hero__action"
            :class="{ 'app-sidebar-hero__action--active': isActive(ROUTE_PATHS.profile) }"
            @click="goTo(ROUTE_PATHS.profile)"
          >
            <div class="app-profile-card__avatar-wrap">
              <v-avatar size="52" class="app-profile-card__avatar">
                <v-img v-if="profilePhoto" :src="profilePhoto" alt="Photo de profil" />
                <span v-else class="app-profile-card__initials">{{ userInitials }}</span>
              </v-avatar>
              <span class="app-profile-card__status"></span>
            </div>

            <div class="app-sidebar-hero__action-copy">
              <div class="app-sidebar-hero__action-title">Mon profil</div>
              <div class="app-sidebar-hero__action-subtitle">Voir et gérer mes informations</div>
            </div>

            <v-icon size="18" class="app-sidebar-hero__action-arrow">mdi-chevron-right</v-icon>
          </button>
        </div>

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
                    :class="{ 'app-sidebar-item__status-pill--badge': hasUnreadBadge(item) }"
                  >
                    {{ navStatusLabel(item) }}
                  </span>
                </template>
              </v-list-item>
            </v-list>

            <AppNewsCarousel
              class="app-sidebar-featured"
              variant="sidebar"
            />
          </div>
        </div>

        <div class="app-sidebar-bottom">
          <button
            type="button"
            class="app-sidebar-utility-card app-sidebar-utility-card--preferences"
            :class="{ 'app-sidebar-utility-card--active': isActive(ROUTE_PATHS.preferences) }"
            @click="goTo(ROUTE_PATHS.preferences)"
          >
            <span class="app-sidebar-utility-card__icon">
              <v-img
                :src="navPreferencesUrl"
                alt="Illustration Préférences"
                contain
                class="app-sidebar-utility-card__illustration"
              />
            </span>

            <span class="app-sidebar-utility-card__content">
              <span class="app-sidebar-utility-card__title">Préférences</span>
              <span class="app-sidebar-utility-card__subtitle">Rythme et format</span>
            </span>

            <v-icon size="18" class="app-sidebar-utility-card__arrow">mdi-chevron-right</v-icon>
          </button>

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
  border: 0;
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(245, 191, 71, 0.96), rgba(28, 124, 125, 0.94)),
    rgba(19, 58, 59, 0.96);
  color: #fff8f0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 34px rgba(8, 24, 28, 0.24);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-radius 0.24s ease,
    background-color 0.24s ease;
}

.app-mobile-drawer-trigger:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 22px 36px rgba(8, 24, 28, 0.28);
}

.app-mobile-drawer-trigger__icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.18);
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
  letter-spacing: 0.01em;
  color: #fffaf3;
}

.app-mobile-drawer-trigger__hint {
  margin-top: 3px;
  font-size: 11px;
  color: rgba(255, 248, 240, 0.82);
}

.app-mobile-bar {
  background:
    radial-gradient(circle at left top, rgba(67, 196, 175, 0.14), transparent 38%),
    linear-gradient(135deg, rgba(8, 24, 28, 0.98), rgba(17, 50, 54, 0.96));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #f8f4ee;
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
}

.app-mobile-brand__mark {
  width: 50px;
  height: 50px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(245, 191, 71, 0.26), rgba(28, 124, 125, 0.34)),
    rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
}

.app-mobile-brand__copy {
  min-width: 0;
}

.app-mobile-brand__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #101314;
}

.app-mobile-bar__spacer {
  width: 146px;
  height: 58px;
  flex-shrink: 0;
}

.app-sidebar {
  background:
    radial-gradient(circle at top left, rgba(65, 191, 171, 0.14), transparent 28%),
    radial-gradient(circle at bottom right, rgba(245, 191, 71, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(8, 24, 28, 0.99), rgba(14, 40, 44, 0.98)),
    #102e2f;
  color: #f5efe6;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
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
  transform-origin: left center;
}

.app-sidebar-shell--mobile {
  padding: 18px 14px 16px;
}

.app-sidebar-nav-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.app-sidebar-nav-stack {
  display: grid;
  gap: 14px;
  align-content: start;
}

.app-sidebar-nav-wrap::-webkit-scrollbar {
  width: 6px;
}

.app-sidebar-nav-wrap::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.app-sidebar-bottom {
  display: grid;
  gap: 14px;
  flex-shrink: 0;
}

.app-sidebar-featured {
  margin-top: 4px;
}

.app-sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.app-sidebar-top--mobile {
  margin-bottom: 0;
}

.app-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.app-sidebar-hero {
  padding: 16px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.02);
}

.app-sidebar-hero--mobile {
  padding: 14px;
}

.app-sidebar-hero__action {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 16px;
  padding: 16px 0 0;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  text-align: left;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.app-sidebar-hero__action--active {
  color: #ffffff;
}

.app-sidebar-hero__action:hover {
  transform: translateX(2px);
}

.app-sidebar-hero__action-copy {
  min-width: 0;
  flex: 1;
}

.app-sidebar-hero__action-title {
  font-size: 15px;
  font-weight: 700;
  color: #fffaf4;
}

.app-sidebar-hero__action-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(245, 239, 230, 0.62);
}

.app-sidebar-hero__action-arrow {
  color: rgba(245, 239, 230, 0.72);
}

.app-sidebar-hero__action--active .app-sidebar-hero__action-arrow {
  color: #f5bf47;
}

.app-sidebar-logo-wrap {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(245, 191, 71, 0.22), rgba(28, 124, 125, 0.4)),
    rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: none;
  flex-shrink: 0;
}

.app-sidebar-logo-wrap--compact {
  width: 52px;
  height: 52px;
  border-radius: 18px;
}

.app-sidebar-logo {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  padding: 4px;
}

.app-sidebar-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff9f2;
}

.app-sidebar-title--compact {
  font-size: 16px;
}

.app-sidebar-toggle {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  color: #f5efe6;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    transform 0.24s ease,
    background-color 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
}

.app-sidebar-toggle:hover,
.app-sidebar-compact-toggle:hover {
  transform: translateY(-1px) scale(1.03);
}

.app-sidebar-toggle--close {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 20px rgba(8, 24, 28, 0.12);
}

.app-sidebar-toggle--close :deep(.v-icon) {
  transition: transform 0.24s ease;
}

.app-sidebar-toggle--close:hover :deep(.v-icon) {
  transform: translateX(-2px);
}

.app-sidebar-section-label {
  margin-top: 4px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(245, 239, 230, 0.46);
}

.app-sidebar-nav {
  display: grid;
  gap: 8px;
  padding: 0;
}

.app-sidebar-brand--compact {
  gap: 10px;
}

.app-sidebar-compact-brand-copy {
  min-width: 0;
}

.app-sidebar-compact-brand-label {
  margin-top: 3px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(245, 239, 230, 0.52);
}

.app-sidebar-compact-shell {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  padding: 16px 12px 14px;
}

.app-sidebar-compact-top {
  display: grid;
  gap: 14px;
}

.app-sidebar-compact-brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.app-sidebar-compact-toggle {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f5efe6;
  flex-shrink: 0;
  transition:
    transform 0.24s ease,
    background-color 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
}

.app-sidebar-compact-toggle--open {
  background:
    linear-gradient(135deg, rgba(67, 196, 175, 0.18), rgba(255, 255, 255, 0.06)),
    rgba(255, 255, 255, 0.04);
  border-color: rgba(67, 196, 175, 0.24);
  box-shadow: 0 12px 20px rgba(8, 24, 28, 0.12);
}

.app-sidebar-compact-toggle--open :deep(.v-icon) {
  transition: transform 0.24s ease;
}

.app-sidebar-compact-toggle--open:hover :deep(.v-icon) {
  transform: translateX(2px);
}

.app-sidebar-compact-current {
  padding: 12px;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(155deg, rgba(67, 196, 175, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.04);
}

.app-sidebar-compact-current--gold {
  background:
    linear-gradient(155deg, rgba(245, 191, 71, 0.16), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.04);
}

.app-sidebar-compact-current--coral {
  background:
    linear-gradient(155deg, rgba(240, 90, 40, 0.14), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.04);
}

.app-sidebar-compact-current__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(245, 239, 230, 0.48);
}

.app-sidebar-compact-current__title {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff8f0;
}

.app-sidebar-compact-nav-wrap {
  min-height: 0;
}

.app-sidebar-compact-nav {
  display: grid;
  gap: 10px;
  min-height: 100%;
  padding: 12px 8px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.03);
}

.app-sidebar-compact-item {
  --compact-accent: rgba(67, 196, 175, 0.18);
  --compact-accent-strong: #43c4af;
  position: relative;
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: transparent;
  color: rgba(245, 239, 230, 0.82);
  text-align: left;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease,
    color 0.2s ease;
}

.app-sidebar-compact-item--gold {
  --compact-accent: rgba(245, 191, 71, 0.18);
  --compact-accent-strong: #f5bf47;
}

.app-sidebar-compact-item--coral {
  --compact-accent: rgba(240, 90, 40, 0.18);
  --compact-accent-strong: #f05a28;
}

.app-sidebar-compact-item:hover {
  transform: translateX(2px);
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  color: #fff9f2;
}

.app-sidebar-compact-item--active {
  background:
    linear-gradient(145deg, var(--compact-accent), rgba(255, 255, 255, 0.05)),
    rgba(255, 255, 255, 0.06);
  border-color: var(--compact-accent);
  color: #fffaf2;
}

.app-sidebar-compact-item__icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--compact-accent-strong);
  flex-shrink: 0;
}

.app-sidebar-compact-item--active .app-sidebar-compact-item__icon-wrap {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.16);
}

.app-sidebar-compact-item__body {
  min-width: 0;
  flex: 1;
}

.app-sidebar-compact-item__title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-compact-item__subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: rgba(245, 239, 230, 0.52);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-compact-item--active .app-sidebar-compact-item__subtitle {
  color: rgba(255, 249, 242, 0.72);
}

.app-sidebar-compact-item__badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f05a28;
  color: #fff9f1;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  border: 2px solid #102e2f;
  flex-shrink: 0;
}

.app-sidebar-compact-item__badge--dot {
  min-width: 12px;
  width: 12px;
  height: 12px;
  padding: 0;
  background: var(--compact-accent-strong);
}

.app-sidebar-compact-bottom {
  display: grid;
  gap: 12px;
}

.app-sidebar-compact-action {
  width: 100%;
  min-height: 50px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.02);
  color: #fffaf2;
  text-align: left;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.app-sidebar-compact-action--active {
  border-color: rgba(245, 191, 71, 0.34);
  background:
    linear-gradient(135deg, rgba(245, 191, 71, 0.18), rgba(255, 255, 255, 0.05)),
    rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.app-sidebar-compact-action:hover {
  transform: translateX(2px);
}

.app-sidebar-compact-action__icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  color: #43c4af;
  flex-shrink: 0;
}

.app-sidebar-compact-action__label {
  font-size: 13px;
  font-weight: 700;
  color: inherit;
}

.app-profile-card__logout--compact {
  margin-top: 0;
}

.app-sidebar-item {
  --nav-accent: rgba(67, 196, 175, 0.22);
  --nav-accent-strong: #43c4af;
  position: relative;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 22px;
  color: rgba(245, 239, 230, 0.74);
  background: rgba(255, 255, 255, 0.02);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.app-sidebar-item--gold {
  --nav-accent: rgba(245, 191, 71, 0.22);
  --nav-accent-strong: #f5bf47;
}

.app-sidebar-item--coral {
  --nav-accent: rgba(240, 90, 40, 0.2);
  --nav-accent-strong: #f05a28;
}

.app-sidebar-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  transform: translateX(3px);
}

.app-sidebar-item--active {
  background:
    linear-gradient(135deg, var(--nav-accent), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.06);
  border-color: var(--nav-accent);
  color: #fffaf3;
  box-shadow: none;
}

.app-sidebar-item__icon-wrap {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.06);
  color: var(--nav-accent-strong);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.app-sidebar-item__icon-illustration {
  width: 28px;
  height: 28px;
  opacity: 0.98;
  filter: saturate(1.02);
}

.app-sidebar-item--active .app-sidebar-item__icon-wrap {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
}

.app-sidebar-item__body {
  min-width: 0;
}

.app-sidebar-item__title {
  display: block;
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.app-sidebar-item__title-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-item__subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(245, 239, 230, 0.54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-item--active .app-sidebar-item__subtitle {
  color: rgba(255, 249, 242, 0.72);
}

.app-sidebar-item__status-pill {
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff9f2;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app-sidebar-item__status-pill--badge {
  min-width: 26px;
  padding: 0 8px;
  background: rgba(240, 90, 40, 0.18);
  border-color: rgba(240, 90, 40, 0.24);
  color: #ffd8cc;
}

.app-sidebar-item__notice-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--nav-accent-strong);
  border: 2px solid #102e2f;
  box-shadow: none;
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

.app-sidebar-utility-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.02);
  color: #fffaf3;
  text-align: left;
  box-shadow: none;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.app-sidebar-utility-card--active {
  border-color: rgba(245, 191, 71, 0.32);
}

.app-sidebar-utility-card--mobile {
  margin-top: 4px;
}

.app-sidebar-utility-card--preferences {
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.app-sidebar-utility-card:hover {
  transform: translateX(2px);
}

.app-sidebar-utility-card--preferences:hover {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 10px 20px rgba(8, 24, 28, 0.12);
}

.app-profile-card__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.app-profile-card__avatar {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), transparent 55%),
    linear-gradient(135deg, #1c7c7d, #f5bf47);
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
  border: 2px solid #163a3b;
}

.app-sidebar-utility-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  color: #43c4af;
  flex-shrink: 0;
}

.app-sidebar-utility-card__illustration {
  width: 28px;
  height: 28px;
  opacity: 0.98;
}

.app-sidebar-utility-card--preferences .app-sidebar-utility-card__icon {
  background: rgba(255, 255, 255, 0.08);
  color: #43c4af;
}

.app-sidebar-utility-card__content {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
  text-align: left;
}

.app-sidebar-utility-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #fffaf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-utility-card__subtitle {
  font-size: 11px;
  color: rgba(245, 239, 230, 0.54);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sidebar-utility-card--preferences .app-sidebar-utility-card__title {
  color: #fffaf3;
}

.app-sidebar-utility-card--preferences .app-sidebar-utility-card__subtitle {
  color: rgba(245, 239, 230, 0.54);
}

.app-sidebar-utility-card__arrow {
  color: rgba(245, 239, 230, 0.72);
  flex-shrink: 0;
  opacity: 0.88;
}

.app-profile-card__logout {
  margin-top: 2px;
  text-transform: none;
  font-weight: 700;
  border-radius: 20px;
  min-height: 52px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff7ef;
}

@media (max-width: 959px) {
  .app-sidebar-item {
    min-height: 68px;
  }

  .app-sidebar-utility-card {
    border-radius: 22px;
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

  .app-mobile-brand__title {
    font-size: 18px;
  }
}
</style>

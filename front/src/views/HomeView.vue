<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import AppNewsCarousel from '@/components/AppNewsCarousel.vue'
import logoUrl from '@/assets/logo.png'
import api from '@/services/api'
import { db } from '@/services/firebase'
import { getUserProfile } from '@/services/userService'
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

const displayName = computed(() => {
  if (profile.value?.firstname) return profile.value.firstname
  if (auth.user?.displayName) return auth.user.displayName
  if (auth.user?.email) return auth.user.email.split('@')[0]
  return 'Utilisateur'
})

const email = computed(() => profile.value?.email || auth.user?.email || '—')
const birthdate = computed(() => profile.value?.birthdate || '—')
const role = computed(() => profile.value?.role || '—')
const roleLabel = computed(() => {
  if (role.value === 'coach') return 'Coach'
  if (role.value === 'apprenant') return 'Apprenant'
  return role.value
})
const profilePhoto = computed(() => profile.value?.profilePhoto || auth.profile?.profilePhoto || '')
const isCoach = computed(() => role.value === 'coach')
const heroSubtitle = computed(() =>
  isCoach.value ? 'Suivez vos apprenants et vos sessions en temps réel.' : 'Suivez votre progression et vos objectifs.'
)
const uid = computed(() => auth.user?.uid || '—')
const uidShort = computed(() => (uid.value && uid.value !== '—' ? `${uid.value.slice(0, 6)}…${uid.value.slice(-4)}` : '—'))

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

const heroTimeline = computed(() => {
  if (isCoach.value) {
    return [
      {
        label: 'Dernier cours',
        state: latestOwnedCourse.value?.title || 'Aucun cours créé',
      },
      {
        label: 'Prochaine session',
        state: nextOwnedMasterclass.value ? `${nextOwnedMasterclass.value.title} · ${formatFutureDate(nextOwnedMasterclass.value.scheduleAt)}` : 'Aucune masterclass planifiée',
      },
      {
        label: 'Dernière demande',
        state: latestDemand.value ? formatRelativeDate(latestDemand.value.updatedAt || latestDemand.value.createdAt) : 'Aucune demande récente',
      },
    ]
  }

  return [
    {
      label: 'Dernier cours',
      state: latestLibraryCourse.value?.title || 'Aucun cours récent',
    },
    {
      label: 'Prochaine masterclass',
      state: nextRegisteredMasterclass.value
        ? `${nextRegisteredMasterclass.value.masterclassTitle} · ${formatFutureDate(nextRegisteredMasterclass.value.scheduleAt)}`
        : 'Aucune inscription planifiée',
    },
    {
      label: 'Dernier message',
      state: latestConversation.value ? formatRelativeDate(latestConversation.value.updatedAt || latestConversation.value.createdAt) : 'Aucun échange récent',
    },
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

  const [coursesRes, masterclassesRes, conversationsSnapshot] = await Promise.all([
    api.get('/courses'),
    api.get('/masterclasses'),
    getDocs(query(collection(db, 'conversations'), where('participants', 'array-contains', auth.user.uid))),
  ])

  courses.value = Array.isArray(coursesRes.data) ? coursesRes.data : []
  masterclasses.value = Array.isArray(masterclassesRes.data) ? masterclassesRes.data : []
  conversations.value = conversationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))

  if (role.value === 'coach') {
    const [requestsSnapshot, registrationsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'courseRequests'), where('coachId', '==', auth.user.uid))),
      getDocs(query(collection(db, 'masterclassRegistrations'), where('coachId', '==', auth.user.uid))),
    ])

    courseRequests.value = requestsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    masterclassRegistrations.value = registrationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    return
  }

  const [requestsSnapshot, registrationsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'courseRequests'), where('studentId', '==', auth.user.uid))),
    getDocs(query(collection(db, 'masterclassRegistrations'), where('studentId', '==', auth.user.uid))),
  ])

  courseRequests.value = requestsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  masterclassRegistrations.value = registrationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

onMounted(async () => {
  loadingProfile.value = true
  profileError.value = ''

  try {
    profile.value = auth.profile || (await getUserProfile(auth.user?.uid))
    await loadDashboardData()
  } catch (error) {
    profileError.value = 'Impossible de charger le profil.'
    console.error(error)
  } finally {
    loadingProfile.value = false
  }
})
</script>

<template>
  <v-container class="home-container" fluid>
    <div class="home-backdrop" aria-hidden="true"></div>

    <v-row class="home-hero" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="home-hero-card" elevation="8">
          <div class="home-hero-content">
            <div class="home-hero-left">
              <div class="home-brand">
                <v-img
                  :src="logoUrl"
                  alt="Logo Persuade"
                  width="72"
                  height="72"
                  class="home-logo"
                />
                <div class="home-brand-text">Persuade</div>
              </div>
              <div class="home-hero-title">Bonjour, {{ displayName }}</div>
              <div class="home-hero-subtitle">{{ heroSubtitle }}</div>

              <div class="home-hero-meta">
                <div class="home-meta-item">
                  <span class="home-meta-label">Email</span>
                  <span class="home-meta-value">{{ email }}</span>
                </div>
                <div class="home-meta-item">
                  <span class="home-meta-label">Identifiant</span>
                  <span class="home-meta-value">{{ uidShort }}</span>
                </div>
                <div class="home-meta-item">
                  <span class="home-meta-label">Rôle</span>
                  <span class="home-meta-value">{{ roleLabel }}</span>
                </div>
              </div>

              <div class="home-hero-timeline">
                <div class="home-hero-timeline__label">Séquence active</div>
                <div class="home-hero-timeline__items">
                  <div class="home-hero-timeline__item" v-for="step in heroTimeline" :key="step.label">
                    <span class="home-hero-timeline__dot"></span>
                    <div>
                      <div class="home-hero-timeline__title">{{ step.label }}</div>
                      <div class="home-hero-timeline__state">{{ step.state }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="home-hero-panel">
              <div class="home-hero-profile">
                <v-avatar size="72" class="home-avatar">
                  <v-img v-if="profilePhoto" :src="profilePhoto" alt="Photo de profil" />
                  <v-icon v-else size="38">mdi-account-circle</v-icon>
                </v-avatar>
                <div class="home-profile-info">
                  <div class="home-profile-name">{{ displayName }}</div>
                  <div class="home-profile-tag">{{ roleLabel !== '—' ? roleLabel : 'Profil actif' }}</div>
                  <div class="home-profile-actions">
                    <v-btn class="home-info-btn" size="small" variant="text" :to="ROUTE_PATHS.profile">
                      Mes informations
                    </v-btn>
                    <v-btn class="home-info-btn home-info-btn--accent" size="small" variant="text" :to="ROUTE_PATHS.preferences">
                      Préférences
                    </v-btn>
                  </div>
                </div>
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
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="home-grid" align="center" justify="center">
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
              <div class="home-card-title">Profil</div>
              <div class="home-card-subtitle">Informations de votre compte</div>
            </div>
            <v-btn class="home-btn-outline" variant="outlined" size="small" :to="ROUTE_PATHS.profile">
              Modifier
            </v-btn>
          </div>

          <div class="home-profile-grid">
            <div class="home-profile-row">
              <span class="home-profile-label">Nom</span>
              <span class="home-profile-value">{{ displayName }}</span>
            </div>
            <div class="home-profile-row">
              <span class="home-profile-label">Email</span>
              <span class="home-profile-value">{{ email }}</span>
            </div>
            <div class="home-profile-row">
              <span class="home-profile-label">Date de naissance</span>
              <span class="home-profile-value">{{ birthdate }}</span>
            </div>
            <div class="home-profile-row">
              <span class="home-profile-label">Rôle</span>
              <span class="home-profile-value">{{ roleLabel }}</span>
            </div>
            <div class="home-profile-row">
              <span class="home-profile-label">Statut</span>
              <span class="home-profile-value">
                <v-chip class="home-chip" size="small" variant="flat">Actif</v-chip>
              </span>
            </div>
          </div>

          <div v-if="profileError" class="home-error">
            {{ profileError }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="home-grid home-grid--full" align="center" justify="center">
      <v-col cols="12" md="10">
        <AppNewsCarousel variant="dashboard" />
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

.home-hero,
.home-grid {
  position: relative;
  z-index: 1;
}

.home-hero-card {
  border-radius: 34px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.15), transparent 28%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(255, 250, 242, 0.94));
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 26px 54px rgba(12, 31, 32, 0.14);
}

.home-hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 24px;
  align-items: stretch;
}

.home-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.home-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.home-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.home-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #133a3b;
  line-height: 1.05;
}

.home-hero-subtitle {
  margin-top: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  max-width: 620px;
  color: rgba(19, 58, 59, 0.7);
  line-height: 1.6;
}

.home-hero-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.home-meta-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(19, 58, 59, 0.05);
  border: 1px solid rgba(19, 58, 59, 0.06);
}

.home-meta-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(19, 58, 59, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.home-meta-value {
  display: block;
  margin-top: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #133a3b;
}

.home-hero-timeline {
  margin-top: 20px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(19, 58, 59, 0.04);
  border: 1px solid rgba(19, 58, 59, 0.06);
}

.home-hero-timeline__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.5);
}

.home-hero-timeline__items {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.home-hero-timeline__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.home-hero-timeline__dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #1c7c7d, #f5bf47);
  flex-shrink: 0;
}

.home-hero-timeline__title {
  font-size: 13px;
  font-weight: 700;
  color: #133a3b;
}

.home-hero-timeline__state {
  margin-top: 3px;
  font-size: 12px;
  color: rgba(19, 58, 59, 0.58);
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

.home-hero-profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.home-avatar {
  background: linear-gradient(140deg, #1c7c7d, #2d9a7b);
  color: #fff;
  box-shadow: none;
}

.home-profile-info {
  text-align: left;
}

.home-profile-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #fffaf2;
}

.home-profile-tag {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(245, 239, 230, 0.62);
}

.home-info-btn {
  margin-top: 6px;
  text-transform: none;
  font-weight: 600;
  color: #f5bf47;
}

.home-profile-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: wrap;
}

.home-info-btn--accent {
  color: #43c4af;
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

.home-grid--full {
  margin-top: 34px;
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

.home-profile-grid {
  display: grid;
  gap: 12px;
}

.home-profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.05);
}

.home-profile-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(19, 58, 59, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.home-profile-value {
  font-size: 14px;
  color: #133a3b;
}

.home-btn-outline {
  border-color: rgba(28, 124, 125, 0.4);
  color: #1c7c7d;
  text-transform: none;
  font-weight: 600;
}

.home-error {
  margin-top: 14px;
  font-size: 12px;
  color: #b94a2f;
}

@media (max-width: 960px) {
  .home-hero-content {
    grid-template-columns: 1fr;
  }

  .home-hero-profile {
    width: 100%;
    justify-content: flex-start;
  }

  .home-profile-info {
    text-align: left;
  }

  .home-profile-actions {
    justify-content: flex-start;
  }

  .home-hero-signal-grid,
  .home-hero-timeline__items {
    grid-template-columns: 1fr;
  }
}
</style>

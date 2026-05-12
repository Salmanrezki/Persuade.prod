<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.png'
import { db } from '@/services/firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getUserPresenceLabel, getUserPresenceState } from '@/services/presenceService'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile } from '@/services/userService'

const profile = ref(null)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const contacts = ref([])
const conversations = ref([])
const messages = ref([])

const loading = ref(false)
const errorMessage = ref('')
const messageText = ref('')
const attachment = ref(null)
const selectedConversationId = ref('')
const selectedContactId = ref('')
const sending = ref(false)
const refreshing = ref(false)
const searchQuery = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const lastSeenMap = ref({})
const lastMessageMap = ref({})
const notificationEnabled = ref(false)
const lastNotifiedMap = ref({})
const isWindowFocused = ref(true)

let conversationsUnsub = null
let contactsUnsub = null
let messagesUnsub = null
let focusListener = null
let blurListener = null

const role = computed(() => profile.value?.role || '—')
const isCoach = computed(() => role.value === 'coach')
const contactRole = computed(() => (isCoach.value ? 'apprenant' : 'coach'))

const contactsMap = computed(() => {
  const map = {}
  contacts.value.forEach((item) => {
    map[item.uid] = item
  })
  return map
})

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contacts.value
  const queryValue = searchQuery.value.toLowerCase()
  return contacts.value.filter((item) => {
    const name = item.firstname || ''
    const email = item.email || ''
    return name.toLowerCase().includes(queryValue) || email.toLowerCase().includes(queryValue)
  })
})

const selectedConversation = computed(() =>
  displayedConversations.value.find((item) => item.id === selectedConversationId.value)
)

const selectedOtherUser = computed(() => {
  if (selectedConversation.value?.otherUser) return selectedConversation.value.otherUser
  if (selectedContactId.value) {
    return contacts.value.find((item) => item.uid === selectedContactId.value) || null
  }
  return null
})

const displayedConversations = computed(() => enrichConversations(conversations.value))

const toMillis = (value) => {
  if (!value) return 0
  if (value.toMillis) return value.toMillis()
  if (value.seconds) return value.seconds * 1000
  if (value._seconds) return value._seconds * 1000
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }
  return 0
}

const formatTimestamp = (value) => {
  const millis = toMillis(value)
  if (!millis) return ''
  return new Date(millis).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (value) => {
  const millis = toMillis(value)
  if (!millis) return ''
  return new Date(millis).toLocaleDateString('fr-FR')
}

const requestNotifications = async () => {
  if (!('Notification' in window)) {
    snackbarText.value = 'Notifications non supportées par ce navigateur.'
    snackbar.value = true
    return
  }

  const permission = await Notification.requestPermission()
  notificationEnabled.value = permission === 'granted'
  snackbarText.value = notificationEnabled.value ? 'Notifications activées.' : 'Notifications refusées.'
  snackbar.value = true
}

const notifyUser = (title, body) => {
  if (!notificationEnabled.value || !('Notification' in window)) return
  try {
    new Notification(title, { body })
  } catch (error) {
    // ignore notification errors
  }
}

const conversationIdFor = (uidA, uidB) => [uidA, uidB].sort().join('__')

const getConversationRef = (conversationId) => doc(db, 'conversations', conversationId)

const getOtherUserId = (conversation) => conversation?.participants?.find((id) => id !== profile.value?.uid) || ''

const loadProfile = async () => {
  if (!authStore.user?.uid) {
    profile.value = null
    return
  }

  profile.value = authStore.profile || (await getUserProfile(authStore.user.uid))
}

const loadContacts = async () => {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', contactRole.value)))
  contacts.value = snapshot.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .filter((item) => item.uid !== profile.value?.uid)
    .sort((a, b) => {
      const nameA = (a.firstname || a.email || '').toLowerCase()
      const nameB = (b.firstname || b.email || '').toLowerCase()
      return nameA.localeCompare(nameB, 'fr')
    })
}

const loadConversations = async () => {
  if (!profile.value?.uid) {
    conversations.value = []
    return
  }

  const snapshot = await getDocs(
    query(collection(db, 'conversations'), where('participants', 'array-contains', profile.value.uid))
  )

  const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  const otherIds = Array.from(new Set(items.map((item) => getOtherUserId(item)).filter(Boolean)))
  const usersMap = {}

  await Promise.all(
    otherIds.map(async (uid) => {
      const user = await getUserProfile(uid)
      if (user) {
        usersMap[uid] = user
      }
    })
  )

  items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
  conversations.value = items.map((item) => ({
    ...item,
    otherUser: usersMap[getOtherUserId(item)] || item.otherUser || null,
  }))
}

const loadMessages = async (conversationId) => {
  if (!conversationId) return

  const snapshot = await getDocs(
    query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'))
  )
  messages.value = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

const enrichConversations = (items) =>
  items.map((conv) => {
    const otherId = conv.participants?.find((id) => id !== profile.value?.uid)
    const otherUser = contactsMap.value[otherId] || conv.otherUser || { uid: otherId }
    return { ...conv, otherUser }
  })

const presenceLabel = (user) => getUserPresenceLabel(user)

const presenceClass = (user) => `chat-presence--${getUserPresenceState(user)}`

const selectConversation = async (conversation) => {
  selectedConversationId.value = conversation.id
  selectedContactId.value = ''
  await loadMessages(conversation.id)
}

const startConversation = async (contact) => {
  selectedContactId.value = contact.uid
  const conversationId = conversationIdFor(profile.value.uid, contact.uid)
  const ref = getConversationRef(conversationId)
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) {
    await setDoc(ref, {
      participants: [profile.value.uid, contact.uid].sort(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: '',
      lastSenderId: null,
    })
  }

  await loadConversations()
  selectedConversationId.value = conversationId
  await loadMessages(conversationId)
}

const sendMessage = async () => {
  if (!selectedConversationId.value) return
  if (!messageText.value.trim() && !attachment.value) return
  sending.value = true

  try {
    const normalizedText = messageText.value.trim()
    const messageData = {
      text: normalizedText,
      attachment: attachment.value || null,
      senderId: profile.value.uid,
      createdAt: serverTimestamp(),
    }

    await addDoc(collection(db, 'conversations', selectedConversationId.value, 'messages'), messageData)
    await updateDoc(getConversationRef(selectedConversationId.value), {
      lastMessage: normalizedText
        ? normalizedText.slice(0, 200)
        : attachment.value?.name
        ? `Pièce jointe: ${attachment.value.name}`.slice(0, 200)
        : 'Pièce jointe',
      lastSenderId: profile.value.uid,
      updatedAt: serverTimestamp(),
    })

    messageText.value = ''
    attachment.value = null
    await Promise.all([loadMessages(selectedConversationId.value), loadConversations()])
  } catch (error) {
    console.error(error)
  } finally {
    sending.value = false
  }
}

const refreshAll = async () => {
  refreshing.value = true
  try {
    await Promise.all([loadConversations(), loadContacts()])
    if (selectedConversationId.value) {
      await loadMessages(selectedConversationId.value)
    }
  } catch (error) {
    console.error(error)
  } finally {
    refreshing.value = false
  }
}

const handleFileSelected = async (file) => {
  if (!file) {
    attachment.value = null
    return
  }

  const maxSize = 1024 * 1024 * 1.5
  if (file.size > maxSize) {
    snackbarText.value = 'Fichier trop volumineux (1.5 Mo max).'
    snackbar.value = true
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    attachment.value = {
      name: file.name,
      mime: file.type,
      dataUrl: reader.result,
    }
  }
  reader.readAsDataURL(file)
}

const clearAttachment = () => {
  attachment.value = null
}

const maybeStartConversationFromRoute = async () => {
  const contactId = typeof route.query.contact === 'string' ? route.query.contact : ''
  if (!contactId || !profile.value?.uid) return

  if (selectedContactId.value === contactId || conversations.value.some((item) => item.id === conversationIdFor(profile.value.uid, contactId))) {
    selectedConversationId.value = conversationIdFor(profile.value.uid, contactId)
    router.replace({ query: { ...route.query, contact: undefined } })
    return
  }

  const contact = contacts.value.find((item) => item.uid === contactId)
  if (!contact) return

  await startConversation(contact)
  router.replace({ query: { ...route.query, contact: undefined } })
}

const updateUnread = (conversationsList) => {
  let unreadCount = 0
  conversationsList.forEach((conv) => {
    if (!conv.id) return
    const lastSeen = lastSeenMap.value[conv.id] || 0
    const updated = toMillis(conv.updatedAt)
    const unread = updated > lastSeen && conv.lastSenderId !== profile.value?.uid
    lastMessageMap.value = {
      ...lastMessageMap.value,
      [conv.id]: unread,
    }
    if (unread) unreadCount += 1
  })
  authStore.setChatUnreadCount(unreadCount)
}

const markSeen = (conversationId) => {
  lastSeenMap.value = {
    ...lastSeenMap.value,
    [conversationId]: Date.now(),
  }
  lastMessageMap.value = {
    ...lastMessageMap.value,
    [conversationId]: false,
  }
  const currentCount = Object.values(lastMessageMap.value).filter(Boolean).length
  authStore.setChatUnreadCount(currentCount)
}

const setupConversationListener = () => {
  if (!profile.value?.uid) return
  if (conversationsUnsub) conversationsUnsub()

  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', profile.value.uid))

  conversationsUnsub = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      items.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
      const enriched = enrichConversations(items)
      conversations.value = enriched
      updateUnread(enriched)

      const newest = enriched[0]
      if (!newest) return
      const updated = toMillis(newest.updatedAt)
      const alreadyNotified = lastNotifiedMap.value[newest.id]
      const isFromOther = newest.lastSenderId && newest.lastSenderId !== profile.value?.uid
      const isUnread = lastMessageMap.value[newest.id]

      if (isFromOther && isUnread && updated && updated !== alreadyNotified) {
        lastNotifiedMap.value = { ...lastNotifiedMap.value, [newest.id]: updated }
        snackbarText.value = `Nouveau message de ${newest.otherUser?.firstname || newest.otherUser?.email || 'Utilisateur'}`
        snackbar.value = true
        if (!isWindowFocused.value) {
          notifyUser('Nouveau message', snackbarText.value)
        }
      }
    },
    () => {
      refreshAll()
    }
  )
}

const setupContactsListener = () => {
  if (!profile.value?.uid) return
  if (contactsUnsub) contactsUnsub()

  const q = query(collection(db, 'users'), where('role', '==', contactRole.value))

  contactsUnsub = onSnapshot(
    q,
    (snapshot) => {
      contacts.value = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((item) => item.uid !== profile.value?.uid)
        .sort((a, b) => {
          const nameA = (a.firstname || a.email || '').toLowerCase()
          const nameB = (b.firstname || b.email || '').toLowerCase()
          return nameA.localeCompare(nameB, 'fr')
        })
    },
    () => {
      loadContacts()
    }
  )
}

const setupMessagesListener = (conversationId) => {
  if (!conversationId) return
  if (messagesUnsub) messagesUnsub()

  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'))

  messagesUnsub = onSnapshot(
    q,
    (snapshot) => {
      messages.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      markSeen(conversationId)
    },
    () => {
      loadMessages(conversationId)
    }
  )
}

watch(selectedConversationId, async (value) => {
  if (value) {
    await loadMessages(value)
    markSeen(value)
    setupMessagesListener(value)
  }
})

watch(contactRole, (value, previousValue) => {
  if (!profile.value?.uid || value === previousValue) return
  setupContactsListener()
})

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await loadProfile()
    if (!profile.value?.uid) {
      throw new Error('Missing user profile')
    }
    await Promise.all([loadContacts(), loadConversations()])
    await maybeStartConversationFromRoute()
    updateUnread(conversations.value)
    setupContactsListener()
    setupConversationListener()
  } catch (error) {
    errorMessage.value = 'Impossible de charger le chat.'
    console.error(error)
  } finally {
    loading.value = false
  }

  focusListener = () => {
    isWindowFocused.value = true
  }
  blurListener = () => {
    isWindowFocused.value = false
  }

  window.addEventListener('focus', focusListener)
  window.addEventListener('blur', blurListener)
})

watch(
  () => route.query.contact,
  async () => {
    await maybeStartConversationFromRoute()
  }
)

onBeforeUnmount(() => {
  if (conversationsUnsub) conversationsUnsub()
  if (contactsUnsub) contactsUnsub()
  if (messagesUnsub) messagesUnsub()
  if (focusListener) window.removeEventListener('focus', focusListener)
  if (blurListener) window.removeEventListener('blur', blurListener)
})
</script>

<template>
  <v-container class="chat-container" fluid>
    <div class="chat-backdrop" aria-hidden="true"></div>

    <v-row class="chat-hero" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-card class="chat-hero-card" elevation="8">
          <div class="chat-hero-content">
            <div class="chat-hero-left">
              <div class="chat-brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="72" height="72" class="chat-logo" />
                <div class="chat-brand-text">Persuade</div>
              </div>
              <div class="chat-hero-title">Chat</div>
              <div class="chat-hero-subtitle">
                {{ isCoach ? 'Discutez avec vos apprenants.' : 'Contactez les coachs disponibles.' }}
              </div>
            </div>

            <div class="chat-hero-info">
              <div class="chat-hero-stat">{{ displayedConversations.length }}</div>
              <div class="chat-hero-label">conversations</div>
              <v-btn class="chat-notify" variant="text" @click="requestNotifications">
                Activer notifications
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="chat-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-progress-linear v-if="loading" color="#1c7c7d" indeterminate class="mb-6" />

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div class="chat-shell">
          <aside class="chat-sidebar">
            <div class="chat-sidebar-header">
              <div>
                <div class="chat-sidebar-title">Conversations</div>
                <div class="chat-sidebar-subtitle">Vos échanges récents.</div>
              </div>
              <v-btn class="chat-refresh" variant="text" :loading="refreshing" @click="refreshAll">
                Actualiser
              </v-btn>
            </div>

            <div class="chat-conversation-list" v-if="displayedConversations.length">
              <button
                v-for="conv in displayedConversations"
                :key="conv.id"
                class="chat-conversation"
                :class="{ active: conv.id === selectedConversationId }"
                @click="selectConversation(conv)"
              >
                <div class="chat-avatar">
                  <img
                    v-if="conv.otherUser?.profilePhoto"
                    :src="conv.otherUser.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="22">mdi-account</v-icon>
                </div>
                <div class="chat-conversation-info">
                  <div class="chat-conversation-head">
                    <div class="chat-conversation-name">
                      {{ conv.otherUser?.firstname || conv.otherUser?.email || 'Utilisateur' }}
                    </div>
                    <div class="chat-presence" :class="presenceClass(conv.otherUser)">
                      <span class="chat-presence-dot"></span>
                      {{ presenceLabel(conv.otherUser) }}
                    </div>
                  </div>
                  <div class="chat-conversation-preview">{{ conv.lastMessage || 'Démarrer la conversation' }}</div>
                </div>
                <div class="chat-conversation-time">
                  {{ formatDate(conv.updatedAt) }}
                  <span v-if="lastMessageMap[conv.id]" class="chat-unread-dot"></span>
                </div>
              </button>
            </div>

            <div v-else class="chat-empty">Aucune conversation pour le moment.</div>

            <div class="chat-contact-header">
              <div class="chat-sidebar-title">Contacts {{ contactRole === 'coach' ? 'coachs' : 'apprenants' }}</div>
              <v-text-field
                v-model="searchQuery"
                density="compact"
                placeholder="Rechercher"
                variant="outlined"
                hide-details
              />
            </div>

            <div class="chat-contact-list">
              <button
                v-for="contact in filteredContacts"
                :key="contact.uid"
                class="chat-contact"
                @click="startConversation(contact)"
              >
                <div class="chat-avatar light">
                  <img
                    v-if="contact.profilePhoto"
                    :src="contact.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="22">mdi-account-circle</v-icon>
                </div>
                <div class="chat-contact-info">
                  <div class="chat-contact-name">{{ contact.firstname || contact.email }}</div>
                  <div class="chat-contact-meta">
                    {{ contact.role }}
                    <span class="chat-contact-separator">•</span>
                    <span class="chat-presence" :class="presenceClass(contact)">
                      <span class="chat-presence-dot"></span>
                      {{ presenceLabel(contact) }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </aside>

          <section class="chat-main">
            <div class="chat-main-header" v-if="selectedOtherUser">
              <div class="chat-main-user">
                <div class="chat-avatar">
                  <img
                    v-if="selectedOtherUser?.profilePhoto"
                    :src="selectedOtherUser.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="22">mdi-account</v-icon>
                </div>
                <div>
                  <div class="chat-main-name">
                    {{ selectedOtherUser.firstname || selectedOtherUser.email || 'Utilisateur' }}
                  </div>
                  <div class="chat-main-meta">
                    {{ selectedOtherUser.role || '' }}
                    <span v-if="selectedOtherUser.role" class="chat-contact-separator">•</span>
                    <span class="chat-presence" :class="presenceClass(selectedOtherUser)">
                      <span class="chat-presence-dot"></span>
                      {{ presenceLabel(selectedOtherUser) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="chat-placeholder" v-else>
              Sélectionnez une conversation ou un contact pour commencer.
            </div>

            <div v-if="selectedConversationId" class="chat-messages">
              <div
                v-for="message in messages"
                :key="message.id"
                class="chat-message"
                :class="{ mine: message.senderId === profile?.uid }"
              >
                <div class="chat-message-avatar" v-if="message.senderId !== profile?.uid">
                  <img
                    v-if="selectedOtherUser?.profilePhoto"
                    :src="selectedOtherUser.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="16">mdi-account</v-icon>
                </div>
                <div class="chat-message-avatar mine" v-else>
                  <img
                    v-if="profile?.profilePhoto"
                    :src="profile.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="16">mdi-account</v-icon>
                </div>
                <div class="chat-message-bubble">
                  <div v-if="message.text">{{ message.text }}</div>
                  <div v-if="message.attachment" class="chat-attachment">
                    <img
                      v-if="message.attachment.dataUrl && message.attachment.mime?.startsWith('image')"
                      :src="message.attachment.dataUrl"
                      alt="Pièce jointe"
                    />
                    <a
                      v-else-if="message.attachment.dataUrl"
                      :href="message.attachment.dataUrl"
                      :download="message.attachment.name || 'fichier'"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ message.attachment.name || 'Télécharger le fichier' }}
                    </a>
                    <a
                      v-else-if="message.attachment.url"
                      :href="message.attachment.url"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ message.attachment.name || 'Ouvrir la pièce jointe' }}
                    </a>
                  </div>
                </div>
                <div class="chat-message-time">
                  {{ formatTimestamp(message.createdAt) }}
                </div>
              </div>
            </div>

            <div v-if="selectedConversationId" class="chat-input">
              <div class="chat-input-stack">
                <v-textarea
                  v-model="messageText"
                  auto-grow
                  rows="1"
                  density="comfortable"
                  placeholder="Écrire un message..."
                  variant="outlined"
                  hide-details
                />
                <div v-if="attachment" class="chat-attachment-preview">
                  <div class="chat-attachment-name">
                    {{ attachment.name || 'Pièce jointe' }}
                  </div>
                  <v-btn size="small" variant="text" @click="clearAttachment">Retirer</v-btn>
                </div>
              </div>
              <div class="chat-input-actions">
                <v-file-input
                  accept="image/*,.pdf"
                  density="compact"
                  variant="outlined"
                  hide-details
                  prepend-icon=""
                  label="Pièce jointe"
                  @update:modelValue="handleFileSelected"
                />
                <v-btn class="chat-send" :loading="sending" @click="sendMessage">Envoyer</v-btn>
              </div>
            </div>
          </section>
        </div>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" timeout="3000" color="primary">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.chat-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.chat-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.chat-hero,
.chat-grid {
  position: relative;
  z-index: 1;
}

.chat-hero-card {
  border-radius: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.1);
  box-shadow: 0 20px 45px rgba(12, 31, 32, 0.16);
}

.chat-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.chat-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.chat-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.chat-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.chat-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #133a3b;
}

.chat-hero-subtitle {
  margin-top: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
}

.chat-hero-info {
  text-align: right;
  display: grid;
  justify-items: end;
  gap: 6px;
}

.chat-hero-stat {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.chat-hero-label {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chat-notify {
  text-transform: none;
  font-weight: 600;
}

.chat-grid {
  margin-top: 28px;
}

.chat-shell {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 24px;
}

.chat-sidebar {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 640px;
  overflow: hidden;
}

.chat-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chat-sidebar-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #133a3b;
}

.chat-sidebar-subtitle {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.chat-refresh {
  text-transform: none;
  font-weight: 600;
}

.chat-conversation-list {
  display: grid;
  gap: 12px;
  overflow: auto;
  padding-right: 4px;
}

.chat-conversation {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid transparent;
  background: rgba(19, 58, 59, 0.04);
  text-align: left;
  cursor: pointer;
}

.chat-conversation.active {
  border-color: rgba(28, 124, 125, 0.4);
  background: rgba(28, 124, 125, 0.12);
}

.chat-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(28, 124, 125, 0.15);
  color: #1c7c7d;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.chat-avatar.light {
  background: rgba(245, 177, 63, 0.2);
  color: #a96014;
}

.chat-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.chat-conversation-info {
  display: grid;
  gap: 4px;
}

.chat-conversation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-conversation-name {
  font-size: 13px;
  font-weight: 600;
  color: #133a3b;
}

.chat-conversation-preview {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.chat-conversation-time {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.45);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chat-unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #f3b13f;
  display: inline-block;
}

.chat-empty {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.chat-contact-header {
  display: grid;
  gap: 8px;
}

.chat-contact-list {
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
}

.chat-contact {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  background: rgba(19, 58, 59, 0.04);
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
}

.chat-contact:hover {
  border-color: rgba(245, 177, 63, 0.4);
}

.chat-contact-name {
  font-size: 13px;
  font-weight: 600;
  color: #133a3b;
}

.chat-contact-meta {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.6);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-main {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
  padding: 18px;
  min-height: 520px;
  display: flex;
  flex-direction: column;
}

.chat-main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(19, 58, 59, 0.08);
}

.chat-main-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-main-name {
  font-size: 16px;
  font-weight: 600;
  color: #133a3b;
}

.chat-main-meta {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-contact-separator {
  color: rgba(19, 58, 59, 0.35);
}

.chat-presence {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.chat-presence-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  display: inline-block;
}

.chat-presence--online {
  color: #1f8f57;
}

.chat-presence--away {
  color: #ba7b11;
}

.chat-presence--offline {
  color: rgba(19, 58, 59, 0.48);
}

.chat-placeholder {
  margin-top: 24px;
  font-size: 13px;
  color: rgba(19, 58, 59, 0.6);
}

.chat-messages {
  flex: 1;
  display: grid;
  gap: 10px;
  padding: 18px 4px 18px 0;
  overflow: auto;
}

.chat-message {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 4px;
}

.chat-message.mine {
  align-items: flex-end;
  flex-direction: row-reverse;
}

.chat-message-bubble {
  background: rgba(19, 58, 59, 0.08);
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  color: #133a3b;
  max-width: 70%;
}

.chat-message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: rgba(28, 124, 125, 0.18);
  color: #1c7c7d;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-top: 2px;
}

.chat-message-avatar.mine {
  background: rgba(19, 58, 59, 0.18);
}

.chat-message.mine .chat-message-bubble {
  background: rgba(28, 124, 125, 0.16);
}

.chat-attachment img {
  max-width: 220px;
  border-radius: 12px;
  display: block;
}

.chat-message-time {
  font-size: 11px;
  color: rgba(19, 58, 59, 0.5);
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  padding-top: 12px;
  border-top: 1px solid rgba(19, 58, 59, 0.08);
}

.chat-input-stack {
  display: grid;
  gap: 8px;
}

.chat-input-actions {
  display: grid;
  gap: 8px;
}

.chat-attachment-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(19, 58, 59, 0.06);
}

.chat-attachment-name {
  font-size: 12px;
  font-weight: 600;
  color: #133a3b;
}

.chat-send {
  text-transform: none;
  font-weight: 600;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

@media (max-width: 960px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .chat-sidebar {
    max-height: none;
  }
}
</style>

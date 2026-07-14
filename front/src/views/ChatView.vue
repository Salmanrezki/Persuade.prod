<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { isCoachProfile } from '@/utils/profile'

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

const role = computed(() => (isCoachProfile(profile.value) ? 'coach' : profile.value?.role || '—'))
const isCoach = computed(() => isCoachProfile(profile.value))
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
const unreadConversationCount = computed(() =>
  displayedConversations.value.filter((conv) => lastMessageMap.value[conv.id]).length
)
const currentMessageCount = computed(() => messages.value.length)
const selectedConversationEmpty = computed(() => selectedConversationId.value && messages.value.length === 0)

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

const getOtherUserId = (conversation) => conversation?.participants?.find((id) => id !== profile.value?.uid) || ''

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
    errorMessage.value = 'Impossible d’envoyer le message.'
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

  if (
    selectedContactId.value === contactId ||
    conversations.value.some((item) => item.id === conversationIdFor(profile.value.uid, contactId))
  ) {
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
        <v-card class="chat-hero-card" elevation="0">
          <div class="chat-hero-content">
            <div class="chat-hero-copy">
              <div class="chat-hero-title">Chat</div>
            </div>

            <div class="chat-hero-stats">
              <v-sheet class="chat-hero-stat-card" rounded="xl">
                <div class="chat-hero-stat">{{ displayedConversations.length }}</div>
                <div class="chat-hero-label">conversations</div>
              </v-sheet>
              <v-sheet class="chat-hero-stat-card" rounded="xl">
                <div class="chat-hero-stat">{{ unreadConversationCount }}</div>
                <div class="chat-hero-label">non lues</div>
              </v-sheet>
              <v-btn class="chat-notify" variant="flat" @click="requestNotifications">
                Activer les notifications
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="chat-grid" align="center" justify="center">
      <v-col cols="12" md="10">
        <v-progress-linear v-if="loading" color="#2e4b40" indeterminate class="mb-6" />

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">
          {{ errorMessage }}
        </v-alert>

        <div class="chat-shell">
          <v-sheet class="chat-sidebar" rounded="xl">
            <v-sheet class="chat-sidebar-section chat-sidebar-section--highlight" rounded="xl">
              <div class="chat-sidebar-header">
                <div>
                  <div class="chat-sidebar-title">Conversations</div>
                  <div class="chat-sidebar-subtitle">Vos échanges récents et leur état.</div>
                </div>
                <v-btn class="chat-refresh" variant="text" :loading="refreshing" @click="refreshAll">
                  Actualiser
                </v-btn>
              </div>

              <div class="chat-sidebar-summary">
                <v-chip class="chat-chip" size="small" variant="flat">
                  {{ displayedConversations.length }} au total
                </v-chip>
                <v-chip class="chat-chip chat-chip--accent" size="small" variant="flat">
                  {{ unreadConversationCount }} non lue(s)
                </v-chip>
              </div>

              <v-list v-if="displayedConversations.length" class="chat-conversation-list" bg-color="transparent">
                <v-list-item
                  v-for="conv in displayedConversations"
                  :key="conv.id"
                  class="chat-conversation"
                  :class="{ active: conv.id === selectedConversationId }"
                  rounded="xl"
                  @click="selectConversation(conv)"
                >
                  <template #prepend>
                    <v-avatar size="42" class="chat-avatar">
                      <img
                        v-if="conv.otherUser?.profilePhoto"
                        :src="conv.otherUser.profilePhoto"
                        alt="Photo"
                        class="chat-avatar-img"
                      />
                      <v-icon v-else size="22">mdi-account</v-icon>
                    </v-avatar>
                  </template>

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

                  <template #append>
                    <div class="chat-conversation-time">
                      {{ formatDate(conv.updatedAt) }}
                      <span v-if="lastMessageMap[conv.id]" class="chat-unread-dot"></span>
                    </div>
                  </template>
                </v-list-item>
              </v-list>

              <v-sheet v-else class="chat-empty" rounded="xl">
                Aucune conversation pour le moment.
              </v-sheet>
            </v-sheet>

            <v-sheet class="chat-sidebar-section" rounded="xl">
              <div class="chat-contact-header">
                <div>
                  <div class="chat-sidebar-title">Contacts {{ contactRole === 'coach' ? 'coachs' : 'apprenants' }}</div>
                  <div class="chat-sidebar-subtitle">Démarrez rapidement un nouvel échange.</div>
                </div>
                <v-text-field
                  v-model="searchQuery"
                  density="compact"
                  placeholder="Rechercher un contact"
                  variant="outlined"
                  hide-details
                  prepend-inner-icon="mdi-magnify"
                />
              </div>

              <v-list class="chat-contact-list" bg-color="transparent">
                <v-list-item
                  v-for="contact in filteredContacts"
                  :key="contact.uid"
                  class="chat-contact"
                  rounded="xl"
                  @click="startConversation(contact)"
                >
                  <template #prepend>
                    <v-avatar size="42" class="chat-avatar light">
                      <img
                        v-if="contact.profilePhoto"
                        :src="contact.profilePhoto"
                        alt="Photo"
                        class="chat-avatar-img"
                      />
                      <v-icon v-else size="22">mdi-account-circle</v-icon>
                    </v-avatar>
                  </template>

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

                  <template #append>
                    <v-icon size="18" class="chat-contact-arrow">mdi-arrow-up-left</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-sheet>
          </v-sheet>

          <v-sheet class="chat-main" rounded="xl">
            <div v-if="selectedOtherUser" class="chat-main-header">
              <div class="chat-main-user">
                <v-avatar size="52" class="chat-avatar">
                  <img
                    v-if="selectedOtherUser?.profilePhoto"
                    :src="selectedOtherUser.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="22">mdi-account</v-icon>
                </v-avatar>
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

              <div class="chat-main-header__stats">
                <v-chip class="chat-chip" size="small" variant="flat">
                  {{ currentMessageCount }} message(s)
                </v-chip>
                <v-chip class="chat-chip" size="small" variant="flat">
                  {{ selectedConversation?.lastMessage ? 'Conversation active' : 'Nouveau fil' }}
                </v-chip>
              </div>
            </div>

            <v-sheet v-else class="chat-placeholder" rounded="xl">
              <v-icon size="28" class="mb-3">mdi-message-outline</v-icon>
              <div class="chat-placeholder__title">Sélectionnez une conversation</div>
              <div class="chat-placeholder__text">
                Choisissez un échange existant ou démarrez une discussion depuis la liste des contacts.
              </div>
            </v-sheet>

            <div v-if="selectedConversationId" class="chat-messages">
              <div
                v-for="message in messages"
                :key="message.id"
                class="chat-message"
                :class="{ mine: message.senderId === profile?.uid }"
              >
                <v-avatar size="30" class="chat-message-avatar" v-if="message.senderId !== profile?.uid">
                  <img
                    v-if="selectedOtherUser?.profilePhoto"
                    :src="selectedOtherUser.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="16">mdi-account</v-icon>
                </v-avatar>
                <v-avatar size="30" class="chat-message-avatar mine" v-else>
                  <img
                    v-if="profile?.profilePhoto"
                    :src="profile.profilePhoto"
                    alt="Photo"
                    class="chat-avatar-img"
                  />
                  <v-icon v-else size="16">mdi-account</v-icon>
                </v-avatar>
                <div class="chat-message-stack">
                  <v-sheet class="chat-message-bubble" :class="{ 'chat-message-bubble--mine': message.senderId === profile?.uid }" rounded="xl">
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
                  </v-sheet>
                  <div class="chat-message-time">
                    {{ formatTimestamp(message.createdAt) }}
                  </div>
                </div>
              </div>

              <v-sheet v-if="selectedConversationEmpty" class="chat-empty chat-empty--messages" rounded="xl">
                Aucun message pour le moment. Envoyez le premier.
              </v-sheet>
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
                <v-sheet v-if="attachment" class="chat-attachment-preview" rounded="xl">
                  <div class="chat-attachment-name">
                    {{ attachment.name || 'Pièce jointe' }}
                  </div>
                  <v-btn size="small" variant="text" @click="clearAttachment">Retirer</v-btn>
                </v-sheet>
              </div>
              <div class="chat-input-actions">
                <v-file-input
                  accept="image/*,.pdf"
                  density="compact"
                  variant="outlined"
                  hide-details
                  prepend-icon=""
                  prepend-inner-icon="mdi-paperclip"
                  label="Pièce jointe"
                  @update:modelValue="handleFileSelected"
                />
                <v-btn class="chat-send" :loading="sending" @click="sendMessage">Envoyer</v-btn>
              </div>
            </div>
          </v-sheet>
        </div>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" timeout="3000" color="primary">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.chat-container {
  --chat-bg: #ffffff;
  --chat-surface: rgba(255, 250, 243, 0.92);
  --chat-surface-strong: #fff9f1;
  --chat-line: rgba(28, 26, 22, 0.1);
  --chat-ink: #1c1a16;
  --chat-muted: #625b53;
  --chat-accent: #b55d3f;
  --chat-accent-soft: rgba(181, 93, 63, 0.12);
  --chat-forest: #2e4b40;
  --chat-forest-soft: rgba(46, 75, 64, 0.1);
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: var(--chat-bg);
  overflow: hidden;
  font-family: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.chat-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background:
    radial-gradient(120% 120% at 10% 15%, rgba(46, 75, 64, 0.08), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(181, 93, 63, 0.08), transparent 55%);
  filter: blur(18px);
  z-index: 0;
  pointer-events: none;
}

.chat-hero,
.chat-grid {
  position: relative;
  z-index: 1;
}

.chat-hero-card {
  border-radius: 28px;
  padding: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 241, 233, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 24px 56px rgba(21, 18, 14, 0.1);
}

.chat-hero-content {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.chat-hero-copy {
  max-width: 42rem;
}

.chat-hero-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--chat-accent);
}

.chat-hero-title {
  margin-top: 8px;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--chat-ink);
}

.chat-hero-subtitle {
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--chat-muted);
}

.chat-hero-stats {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chat-hero-stat-card {
  min-width: 136px;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid var(--chat-line);
}

.chat-hero-stat {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  color: var(--chat-ink);
}

.chat-hero-label {
  font-size: 12px;
  color: var(--chat-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chat-notify {
  text-transform: none;
  font-weight: 700;
  min-height: 100%;
  background: var(--chat-forest);
  color: #fff8f2;
  border-radius: 18px;
}

.chat-grid {
  margin-top: 28px;
}

.chat-shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 24px;
}

.chat-sidebar {
  background: transparent;
  border-radius: 24px;
  border: none;
  box-shadow: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.chat-sidebar-section {
  padding: 16px;
  border-radius: 24px;
  background: var(--chat-surface);
  border: 1px solid var(--chat-line);
  box-shadow: 0 18px 44px rgba(44, 29, 16, 0.08);
}

.chat-sidebar-section--highlight {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 241, 233, 0.92));
}

.chat-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chat-sidebar-title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--chat-ink);
}

.chat-sidebar-subtitle {
  font-size: 12px;
  color: var(--chat-muted);
}

.chat-refresh {
  text-transform: none;
  font-weight: 700;
}

.chat-sidebar-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 14px 0 12px;
}

.chat-chip {
  background: var(--chat-forest-soft);
  color: var(--chat-forest);
  font-weight: 700;
}

.chat-chip--accent {
  background: var(--chat-accent-soft);
  color: var(--chat-accent);
}

.chat-conversation-list {
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 4px;
  max-height: 320px;
}

.chat-conversation {
  margin-bottom: 0 !important;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid transparent;
  background: rgba(46, 75, 64, 0.04);
}

.chat-conversation.active {
  border-color: rgba(181, 93, 63, 0.2);
  background: rgba(181, 93, 63, 0.09);
}

.chat-avatar {
  border-radius: 12px;
  background: rgba(46, 75, 64, 0.12);
  color: var(--chat-forest);
  overflow: hidden;
}

.chat-avatar.light {
  background: rgba(181, 93, 63, 0.12);
  color: var(--chat-accent);
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
  color: var(--chat-ink);
}

.chat-conversation-preview {
  font-size: 12px;
  color: var(--chat-muted);
}

.chat-conversation-time {
  font-size: 11px;
  color: rgba(28, 26, 22, 0.45);
  display: inline-flex;
  flex-direction: column;
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
  padding: 14px 16px;
  background: rgba(46, 75, 64, 0.04);
  font-size: 12px;
  color: var(--chat-muted);
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
  max-height: 260px;
}

.chat-contact {
  margin-bottom: 0 !important;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(46, 75, 64, 0.04);
  border: 1px solid transparent;
}

.chat-contact:hover {
  border-color: rgba(181, 93, 63, 0.2);
}

.chat-contact-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--chat-ink);
}

.chat-contact-meta {
  font-size: 11px;
  color: var(--chat-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-contact-arrow {
  color: rgba(28, 26, 22, 0.42);
}

.chat-main {
  background: var(--chat-surface);
  border-radius: 24px;
  border: 1px solid var(--chat-line);
  box-shadow: 0 18px 44px rgba(44, 29, 16, 0.08);
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
  border-bottom: 1px solid var(--chat-line);
}

.chat-main-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-main-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--chat-ink);
}

.chat-main-meta {
  font-size: 12px;
  color: var(--chat-muted);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-main-header__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chat-contact-separator {
  color: rgba(28, 26, 22, 0.35);
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
  color: #2e7d4d;
}

.chat-presence--away {
  color: #9a6f19;
}

.chat-presence--offline {
  color: rgba(28, 26, 22, 0.45);
}

.chat-placeholder {
  margin-top: 24px;
  padding: 36px 24px;
  display: grid;
  justify-items: center;
  text-align: center;
  background: rgba(46, 75, 64, 0.04);
  color: var(--chat-muted);
}

.chat-placeholder__title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: 1.5rem;
  color: var(--chat-ink);
}

.chat-placeholder__text {
  margin-top: 8px;
  max-width: 28rem;
  font-size: 13px;
  line-height: 1.6;
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

.chat-message-stack {
  display: grid;
  gap: 6px;
}

.chat-message-bubble {
  background: rgba(46, 75, 64, 0.08);
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 14px;
  color: var(--chat-ink);
  max-width: 70%;
}

.chat-message-avatar {
  border-radius: 10px;
  background: rgba(46, 75, 64, 0.12);
  color: var(--chat-forest);
  overflow: hidden;
  margin-top: 2px;
}

.chat-message-avatar.mine {
  background: rgba(181, 93, 63, 0.12);
}

.chat-message-bubble--mine {
  background: rgba(181, 93, 63, 0.12);
}

.chat-attachment img {
  max-width: 220px;
  border-radius: 12px;
  display: block;
}

.chat-message-time {
  font-size: 11px;
  color: rgba(28, 26, 22, 0.46);
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  padding-top: 12px;
  border-top: 1px solid var(--chat-line);
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
  background: rgba(46, 75, 64, 0.06);
}

.chat-attachment-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--chat-ink);
}

.chat-send {
  text-transform: none;
  font-weight: 700;
  background: var(--chat-forest);
  color: #fff8f2;
}

.chat-empty--messages {
  justify-self: center;
  width: fit-content;
}

@media (max-width: 960px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .chat-hero-stats,
  .chat-main-header,
  .chat-main-header__stats {
    justify-content: flex-start;
  }

  .chat-input {
    grid-template-columns: 1fr;
  }
}
</style>

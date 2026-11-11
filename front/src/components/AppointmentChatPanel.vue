<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'
import {
  ATTACHMENT_ACCEPT,
  downloadChatAttachment,
  readChatAttachment,
} from '@/utils/chatAttachments'

const props = defineProps({
  participantId: { type: String, required: true },
  participantName: String,
})
const auth = useAuthStore()
const messages = ref([]),
  draft = ref(''),
  attachment = ref(null),
  error = ref('')
const loading = ref(true),
  sending = ref(false),
  reading = ref(false),
  connected = ref(false)
const conversationId = ref(''),
  list = ref(null),
  fileInput = ref(null),
  followLatest = ref(true)
const canSend = computed(
  () =>
    connected.value &&
    !sending.value &&
    !reading.value &&
    (draft.value.trim() || attachment.value),
)
let unsubscribe,
  version = 0,
  fileVersion = 0,
  disposed = false
async function scrollToLatest() {
  await nextTick()
  if (list.value && followLatest.value)
    list.value.scrollTop = list.value.scrollHeight
}
function onScroll() {
  const el = list.value
  if (el)
    followLatest.value = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}
function time(value) {
  const millis =
    value?.toMillis?.() || (value?.seconds || value?._seconds || 0) * 1000
  return millis
    ? new Date(millis).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'À l’instant'
}
function parts(text = '') {
  return String(text)
    .split(/(https?:\/\/[^\s<>]+)/g)
    .map((value) => {
      try {
        const url = new URL(value)
        return {
          text: value,
          href: ['http:', 'https:'].includes(url.protocol) ? url.href : null,
        }
      } catch {
        return { text: value, href: null }
      }
    })
}
async function connect() {
  const current = ++version
  unsubscribe?.()
  unsubscribe = undefined
  connected.value = false
  conversationId.value = ''
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.post('/chat/conversations', {
      participantId: props.participantId,
    })
    if (disposed || current !== version) return
    conversationId.value = data.id
    unsubscribe = onSnapshot(
      query(
        collection(db, 'conversations', data.id, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
      (snapshot) => {
        if (disposed || current !== version) return
        messages.value = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .reverse()
        connected.value = true
        loading.value = false
        void scrollToLatest()
      },
      () => {
        if (disposed || current !== version) return
        connected.value = false
        loading.value = false
        error.value =
          'La messagerie est déconnectée. Réessayez ; la visio continue.'
      },
    )
  } catch (err) {
    if (disposed || current !== version) return
    loading.value = false
    error.value =
      err.response?.data?.message ||
      'Impossible de charger la discussion. La visio reste disponible.'
  }
}
async function send() {
  if (!canSend.value) return
  const current = version
  sending.value = true
  error.value = ''
  try {
    await api.post(
      `/chat/conversations/${encodeURIComponent(conversationId.value)}/messages`,
      { text: draft.value.trim(), attachment: attachment.value },
    )
    if (disposed || current !== version) return
    draft.value = ''
    clearFile()
    followLatest.value = true
    void scrollToLatest()
  } catch (err) {
    if (!disposed && current === version)
      error.value =
        err.response?.data?.message ||
        'Envoi impossible. Votre message est conservé, vous pouvez réessayer.'
  } finally {
    if (current === version) sending.value = false
  }
}
function clearFile() {
  fileVersion++
  attachment.value = null
  reading.value = false
  if (fileInput.value) fileInput.value.value = ''
}
async function selectFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  clearFile()
  const current = fileVersion
  reading.value = true
  error.value = ''
  try {
    const result = await readChatAttachment(file)
    if (!disposed && current === fileVersion) attachment.value = result
  } catch (err) {
    if (!disposed && current === fileVersion) error.value = err.message
  } finally {
    if (current === fileVersion) reading.value = false
  }
}
function download(file) {
  try {
    downloadChatAttachment(file)
  } catch (err) {
    error.value = err.message
  }
}
watch(
  () => props.participantId,
  () => {
    messages.value = []
    draft.value = ''
    clearFile()
    sending.value = false
    followLatest.value = true
    void connect()
  },
  { immediate: true },
)
onUnmounted(() => {
  disposed = true
  version++
  fileVersion++
  unsubscribe?.()
})
</script>

<template>
  <aside class="session-chat" aria-label="Messages et documents de la visio">
    <header>
      <div>
        <h2>Messages et documents</h2>
        <p>Avec {{ participantName || 'votre interlocuteur' }}</p>
      </div>
      <v-icon aria-hidden="true">mdi-message-text-outline</v-icon>
    </header>
    <p class="history-note">
      Vos échanges sont conservés dans votre messagerie.
    </p>
    <div v-if="error" class="chat-error" role="alert">
      {{ error
      }}<v-btn v-if="!connected" size="small" variant="text" @click="connect"
        >Réessayer</v-btn
      >
    </div>
    <div
      ref="list"
      class="message-list"
      role="log"
      aria-label="Messages de la conversation"
      aria-live="polite"
      aria-relevant="additions"
      :aria-busy="loading"
      @scroll="onScroll"
    >
      <p v-if="loading" class="empty">Chargement des messages…</p>
      <p v-else-if="!messages.length" class="empty">
        Envoyez un premier message ou partagez un document pour votre séance.
      </p>
      <a
        v-if="messages.length === 50"
        class="older"
        :href="`${ROUTE_PATHS.chat}?contact=${encodeURIComponent(participantId)}`"
        target="_blank"
        rel="noopener noreferrer"
        >Voir les messages plus anciens dans un nouvel onglet</a
      >
      <article
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="{ mine: message.senderId === auth.user?.uid }"
      >
        <span class="sender">{{
          message.senderId === auth.user?.uid
            ? 'Vous'
            : participantName || 'Votre interlocuteur'
        }}</span>
        <p v-if="message.text" class="message-text">
          <template v-for="(part, index) in parts(message.text)" :key="index"
            ><a
              v-if="part.href"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer"
              >{{ part.text }}</a
            ><template v-else>{{ part.text }}</template></template
          >
        </p>
        <button
          v-if="message.attachment?.dataUrl"
          type="button"
          class="document-download"
          @click="download(message.attachment)"
        >
          <v-icon size="22">mdi-file-download-outline</v-icon
          ><span
            >{{ message.attachment.name || 'Document'
            }}<small
              >Télécharger{{
                message.attachment.size
                  ? ` · ${Math.ceil(message.attachment.size / 1024)} Ko`
                  : ''
              }}</small
            ></span
          >
        </button>
        <template v-else-if="message.attachment?.url"
          ><template
            v-for="(part, index) in parts(message.attachment.url)"
            :key="index"
            ><a
              v-if="part.href"
              :href="part.href"
              target="_blank"
              rel="noopener noreferrer"
              >{{ message.attachment.name || 'Ouvrir le document' }}</a
            ></template
          ></template
        >
        <time>{{ time(message.createdAt) }}</time>
      </article>
    </div>
    <form class="composer" @submit.prevent="send">
      <div v-if="attachment" class="selected-file">
        <span
          >{{ attachment.name }} ·
          {{ Math.ceil(attachment.size / 1024) }} Ko</span
        ><v-btn
          icon="mdi-close"
          variant="text"
          size="x-small"
          aria-label="Retirer le document"
          :disabled="sending"
          @click="clearFile"
        />
      </div>
      <label for="session-message">Votre message</label>
      <textarea
        id="session-message"
        v-model="draft"
        rows="3"
        maxlength="5000"
        placeholder="Un message, une question ou un lien…"
        :disabled="sending"
        @keydown.ctrl.enter.prevent="send"
        @keydown.meta.enter.prevent="send"
      ></textarea>
      <input
        ref="fileInput"
        type="file"
        hidden
        :accept="ATTACHMENT_ACCEPT"
        @change="selectFile"
      />
      <div class="composer-actions">
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-paperclip"
          :loading="reading"
          :disabled="sending || reading"
          @click="fileInput?.click()"
          >Joindre</v-btn
        ><v-btn
          color="#24443f"
          size="small"
          append-icon="mdi-send"
          type="submit"
          :disabled="!canSend"
          :loading="sending"
          >Envoyer</v-btn
        >
      </div>
      <small
        >PDF, Office, texte et images · 600 Ko maximum. Pour un fichier plus
        grand, partagez un lien.</small
      >
    </form>
  </aside>
</template>

<style scoped>
.session-chat {
  display: flex;
  flex-direction: column;
  height: min(75dvh, 850px);
  min-height: 500px;
  border: 1px solid #d5e1d8;
  border-radius: 16px;
  background: #fffdf8;
  overflow: hidden;
  color: #24443f;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 8px;
}
h2 {
  font-size: 17px;
}
header p,
.history-note {
  font-size: 12px;
  color: #617368;
}
.history-note {
  padding: 0 18px 12px;
  margin: 0;
  border-bottom: 1px solid #d5e1d8;
}
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.message {
  padding: 10px 12px;
  background: #edf2ea;
  border-radius: 12px;
  width: 92%;
  align-self: flex-start;
  overflow-wrap: anywhere;
}
.message.mine {
  align-self: flex-end;
  background: #e0ece4;
}
.sender {
  font-size: 11px;
  font-weight: 700;
}
.message-text {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
  margin: 5px 0;
}
.message a,
.older {
  text-decoration: underline;
  color: #295d50;
}
.older {
  font-size: 12px;
}
time {
  display: block;
  font-size: 10px;
  color: #617368;
  margin-top: 6px;
}
.document-download {
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  padding: 10px 0;
  font-size: 13px;
  width: 100%;
}
.document-download small {
  display: block;
  font-size: 11px;
}
.empty {
  font-size: 13px;
  color: #617368;
  text-align: center;
  margin: auto;
}
.composer {
  border-top: 1px solid #d5e1d8;
  padding: 12px;
}
.composer label {
  font-size: 12px;
  font-weight: 600;
}
.composer textarea {
  display: block;
  width: 100%;
  resize: vertical;
  max-height: 150px;
  background: white;
  border: 1px solid #c9dbce;
  border-radius: 8px;
  padding: 10px;
  margin: 6px 0;
  font: inherit;
  font-size: 13px;
}
.composer small {
  display: block;
  font-size: 10px;
  line-height: 1.5;
  color: #617368;
}
.composer-actions,
.selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.selected-file {
  font-size: 12px;
  background: #edf2ea;
  padding: 6px 8px;
  border-radius: 8px;
  overflow-wrap: anywhere;
}
.selected-file span {
  min-width: 0;
}
.chat-error {
  font-size: 12px;
  padding: 10px 16px;
  color: #923e32;
  background: #fff0e9;
}
button:focus-visible,
textarea:focus-visible {
  outline: 2px solid #35644e;
  outline-offset: 2px;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
@media (max-width: 1000px) {
  .session-chat {
    height: 580px;
    min-height: 420px;
  }
}
</style>

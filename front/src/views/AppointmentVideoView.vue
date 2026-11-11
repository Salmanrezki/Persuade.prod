<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { loadDailyVideo } from '@/services/dailyVideo'
import { ROUTE_PATHS } from '@/router/paths'
import AppointmentChatPanel from '@/components/AppointmentChatPanel.vue'

const route = useRoute()
const chatOpen = ref(true)
const appointment = ref(null),
  error = ref(''),
  notice = ref(''),
  loading = ref(true)
const connecting = ref(false),
  active = ref(false),
  joined = ref(false),
  remotePresent = ref(false)
const host = ref(null),
  now = ref(Date.now()),
  offset = ref(0)
let frame,
  poll,
  clock,
  disposed = false,
  refreshing = false,
  generation = 0,
  sessionVersion
const ready = computed(() => appointment.value?.state === 'ready')
const remaining = computed(() => {
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(appointment.value?.startAt) - now.value) / 1000),
  )
  if (!Number.isFinite(seconds)) return ''
  if (seconds >= 3600)
    return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
})
const dateLabel = computed(() =>
  appointment.value
    ? new Date(appointment.value.startAt).toLocaleString('fr-FR', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : '',
)
async function stopCall() {
  generation++
  const current = frame
  frame = null
  active.value = false
  joined.value = false
  connecting.value = false
  remotePresent.value = false
  if (current) await current.destroy().catch(() => {})
}
async function refresh() {
  if (refreshing || disposed) return
  refreshing = true
  const id = route.params.id
  try {
    const { data } = await api.get(`/video/${encodeURIComponent(id)}`)
    if (disposed || id !== route.params.id) return
    appointment.value = data
    offset.value = data.serverNow - Date.now()
    now.value = Date.now() + offset.value
    if (
      active.value &&
      (data.state !== 'ready' || data.sessionVersion !== sessionVersion)
    ) {
      await stopCall()
      notice.value = 'La séance est terminée ou le rendez-vous a été modifié.'
    }
    error.value = ''
  } catch (err) {
    if (disposed || id !== route.params.id) return
    error.value =
      err.response?.data?.message ||
      'Connexion interrompue. Vérifiez votre réseau puis actualisez.'
    // Fail closed if the appointment can no longer be verified.
    appointment.value = null
    await stopCall()
  } finally {
    refreshing = false
    loading.value = false
  }
}
async function join() {
  if (connecting.value || active.value) return
  if (!window.isSecureContext) {
    error.value = 'La caméra et le micro nécessitent une connexion HTTPS.'
    return
  }
  connecting.value = true
  error.value = ''
  notice.value = ''
  const currentGeneration = ++generation
  try {
    const Daily = await loadDailyVideo()
    if (disposed || currentGeneration !== generation) return
    const { data } = await api.post(
      `/video/${encodeURIComponent(route.params.id)}/join`,
      {},
      { timeout: 35000 },
    )
    if (disposed || currentGeneration !== generation) return
    sessionVersion = data.sessionVersion
    active.value = true
    frame = Daily.createFrame(host.value, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '16px',
      },
    })
    const call = frame
    const updatePresence = () => {
      if (frame === call)
        remotePresent.value = Object.values(call.participants()).some(
          (p) => !p.local,
        )
    }
    call
      .on('joined-meeting', () => {
        joined.value = true
        updatePresence()
      })
      .on('participant-joined', updatePresence)
      .on('participant-left', updatePresence)
      .on('left-meeting', () => {
        if (frame === call) {
          notice.value =
            'Vous avez quitté la visio. Vous pouvez revenir tant que le créneau est ouvert.'
          void stopCall()
        }
      })
      .on('camera-error', () => {
        error.value =
          'Caméra ou micro indisponible. Vérifiez les autorisations du navigateur et les appareils sélectionnés.'
      })
      .on('error', () => {
        if (frame === call) {
          error.value =
            'La connexion vidéo a échoué. Vérifiez votre réseau puis réessayez.'
          void stopCall()
        }
      })
    await call.join({ url: data.url, token: data.token })
  } catch (err) {
    if (disposed || currentGeneration !== generation) return
    error.value =
      err.response?.data?.message ||
      err.message ||
      'Impossible de rejoindre la visio.'
    await stopCall()
  } finally {
    if (currentGeneration === generation) connecting.value = false
  }
}
onMounted(() => {
  void refresh()
  poll = window.setInterval(refresh, 15000)
  clock = window.setInterval(() => {
    now.value = Date.now() + offset.value
    const a = appointment.value
    if (a?.state === 'waiting' && now.value >= Date.parse(a.startAt))
      void refresh()
    if (a?.state === 'ready' && now.value >= Date.parse(a.endAt)) {
      a.state = 'ended'
      void stopCall()
    }
  }, 1000)
})
watch(
  () => route.params.id,
  async () => {
    appointment.value = null
    await stopCall()
    await refresh()
  },
)
onUnmounted(() => {
  disposed = true
  window.clearInterval(poll)
  window.clearInterval(clock)
  void stopCall()
})
</script>

<template>
  <section class="video-page">
    <header class="video-header">
      <div>
        <span class="eyebrow">Votre séance en direct</span>
        <h1>{{ appointment?.title || 'Rendez-vous en visio' }}</h1>
        <p v-if="appointment">
          Avec {{ appointment.participantName }} · {{ dateLabel }}
        </p>
      </div>
      <v-btn :to="ROUTE_PATHS.home" variant="text" prepend-icon="mdi-arrow-left"
        >Retour à mon espace</v-btn
      >
    </header>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert"
      >{{ error
      }}<v-btn v-if="!active" variant="text" @click="refresh"
        >Actualiser</v-btn
      ></v-alert
    >
    <v-alert v-if="notice" type="info" variant="tonal" class="mb-4">{{
      notice
    }}</v-alert>
    <div v-if="active" class="call-status" aria-live="polite">
      <span class="live-dot"></span
      >{{
        !joined
          ? 'Vérifiez votre caméra et votre micro avant d’entrer.'
          : remotePresent
            ? 'Vous êtes ensemble dans la séance.'
            : 'Vous êtes dans la salle. Votre interlocuteur peut vous rejoindre.'
      }}<v-btn size="small" variant="text" @click="stopCall"
        >Quitter la visio</v-btn
      >
    </div>
    <v-btn
      v-if="appointment?.participantId"
      variant="tonal"
      class="mb-4"
      prepend-icon="mdi-message-text-outline"
      :aria-expanded="chatOpen"
      aria-controls="appointment-chat"
      @click="chatOpen = !chatOpen"
      >{{ chatOpen ? 'Masquer les messages' : 'Afficher les messages' }}</v-btn
    >
    <div
      class="session-layout"
      :class="{ 'with-chat': appointment?.participantId && chatOpen }"
    >
      <div class="video-column">
        <div
          v-show="active"
          ref="host"
          class="video-stage"
          aria-label="Salle de visioconférence"
        ></div>
        <div v-if="!active" class="video-lobby">
          <div class="video-symbol">
            <v-icon size="46">mdi-video-outline</v-icon>
          </div>
          <template v-if="loading"
            ><h2>Préparation de votre séance…</h2>
            <v-progress-circular indeterminate class="mt-4"
          /></template>
          <template v-else-if="appointment">
            <template v-if="appointment.state === 'waiting'"
              ><span class="eyebrow">Votre salle vous attend</span>
              <h2>Début dans {{ remaining }}</h2>
              <p>
                L’accès s’ouvrira automatiquement à l’heure prévue. Vous pourrez
                ensuite tester votre caméra et votre micro avant de rejoindre
                votre interlocuteur.
              </p></template
            >
            <template v-else-if="ready"
              ><span class="eyebrow">C’est l’heure de votre rendez-vous</span>
              <h2>Prêt à échanger ?</h2>
              <p>
                Installez-vous au calme. Vous pourrez choisir votre caméra et
                votre micro, puis rejoindre votre coach ou votre apprenant.
              </p></template
            >
            <template v-else
              ><h2>
                {{
                  appointment.state === 'ended'
                    ? 'Ce créneau est terminé'
                    : 'Ce rendez-vous n’est pas ouvert'
                }}
              </h2>
              <p>
                Seuls les rendez-vous confirmés donnent accès à une visio
                pendant l’horaire prévu.
              </p></template
            >
            <v-alert
              v-if="
                !appointment.configured &&
                ['ready', 'waiting'].includes(appointment.state)
              "
              type="info"
              variant="tonal"
              class="my-5"
              >La visioconférence n’est pas encore activée par l’équipe
              Persuade.</v-alert
            >
            <v-btn
              v-if="ready && appointment.configured"
              color="#24443f"
              size="large"
              prepend-icon="mdi-video"
              :loading="connecting"
              @click="join"
              >Entrer dans la visio</v-btn
            >
            <div
              v-if="['ready', 'waiting'].includes(appointment.state)"
              class="features"
            >
              <span
                ><v-icon size="18">mdi-lock-outline</v-icon> Salle privée à
                deux</span
              ><span
                ><v-icon size="18">mdi-monitor-share</v-icon> Partage
                d’écran</span
              ><span
                ><v-icon size="18">mdi-microphone-outline</v-icon> Caméra et
                micro réglables</span
              >
            </div>
            <small v-if="appointment.endAt"
              >Fin du créneau à
              {{
                new Date(appointment.endAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}.</small
            >
          </template>
          <template v-else
            ><h2>Salle indisponible</h2>
            <p>
              Actualisez pour vérifier votre accès au rendez-vous.
            </p></template
          >
        </div>
      </div>
      <AppointmentChatPanel
        v-if="appointment?.participantId"
        v-show="chatOpen"
        id="appointment-chat"
        :key="appointment.participantId"
        :participant-id="appointment.participantId"
        :participant-name="appointment.participantName"
      />
    </div>
  </section>
</template>

<style scoped>
.session-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.session-layout.with-chat {
  grid-template-columns: minmax(0, 1fr) 350px;
}
.video-column {
  min-width: 0;
}
@media (max-width: 1000px) {
  .session-layout.with-chat {
    grid-template-columns: minmax(0, 1fr);
  }
}
.video-page {
  max-width: 1400px;
  margin: auto;
  padding: 28px;
  color: #24443f;
}
.video-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
h1 {
  font-size: clamp(24px, 3vw, 34px);
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.eyebrow {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #587768;
}
p {
  color: #617368;
  line-height: 1.7;
}
.video-lobby {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
  padding: 64px 24px;
  border: 1px solid #d5e1d8;
  border-radius: 24px;
  background: linear-gradient(135deg, #edf3e9, #fffdf8);
}
.video-lobby p {
  max-width: 580px;
  margin: 16px 0 28px;
}
.video-lobby h2 {
  font-size: clamp(24px, 3vw, 32px);
  margin-top: 12px;
}
.video-symbol {
  padding: 24px;
  border-radius: 50%;
  background: #dceade;
  margin-bottom: 28px;
}
.features {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin: 32px 0;
  font-size: 13px;
}
.features span {
  display: flex;
  gap: 8px;
  align-items: center;
}
.video-stage {
  height: min(75dvh, 850px);
  min-height: 500px;
  background: #182c28;
  border-radius: 16px;
}
.call-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}
.call-status .v-btn {
  margin-left: auto;
}
.live-dot {
  width: 8px;
  height: 8px;
  background: #45875e;
  border-radius: 50%;
}
small {
  color: #617368;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
@media (max-width: 650px) {
  .video-page {
    padding: 16px 8px;
  }
  .video-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .video-lobby {
    padding: 36px 16px;
  }
  .video-stage {
    height: 70dvh;
    min-height: 420px;
  }
}
</style>

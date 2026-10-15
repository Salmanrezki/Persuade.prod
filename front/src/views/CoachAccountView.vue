<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { notifyCoachJourneyUpdated } from '@/services/coachJourneyService'
import { ROUTE_PATHS } from '@/router/paths'
import CoachPublicDetails from '@/components/CoachPublicDetails.vue'
import { invalidateCoachDirectory } from '@/services/coachDirectoryService'
const props = defineProps({ page: { type: String, default: 'profile' } })
const auth = useAuthStore()
const isPreferences = computed(() => props.page === 'preferences')
const saving = ref(false),
  loading = ref(true),
  loadFailed = ref(false),
  error = ref(''),
  success = ref('')
const firstname = ref(''),
  photo = ref('')
const profile = ref({
  headline: '',
  bio: '',
  specialties: [],
  experienceYears: null,
  experienceSummary: '',
  certifications: [],
  languages: [],
  audiences: [],
  formats: [],
})
const preferences = ref({
  days: [],
  startTime: '09:00',
  endTime: '18:00',
  timeZone: 'Europe/Paris',
  sessionDuration: 60,
  maxClients: 10,
})
const specialties = [
  'Négociation commerciale',
  'Négociation salariale',
  'Achats et fournisseurs',
  'Gestion des conflits',
  'Négociation B2B',
  'Négociation internationale',
  'Négociation interculturelle',
  'Médiation',
  'Gestion des objections',
  'Préparation de négociation',
  'Négociation de crise',
]
const audiences = [
  'Débutants',
  'Commerciaux',
  'Acheteurs',
  'Managers',
  'Dirigeants',
  'Entrepreneurs',
  'Particuliers',
  'Équipes',
]
const formats = ['Individuel', 'Groupe', 'Visioconférence', 'Présentiel']
const languages = [
  'Français',
  'Anglais',
  'Espagnol',
  'Allemand',
  'Italien',
  'Arabe',
  'Portugais',
]
const days = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]
const tagsRule = (value) =>
  (Array.isArray(value) &&
    value.length <= 12 &&
    value.every(
      (item) => typeof item === 'string' && item.trim().length <= 80,
    )) ||
  '12 tags maximum, 80 caractères par tag.'
const formRef = ref(null)
const missingProfileFields = computed(() => {
  const values = { 'Nom public': firstname.value, Photo: photo.value, 'Titre professionnel': profile.value.headline,
    Présentation: profile.value.bio, Spécialités: profile.value.specialties, Publics: profile.value.audiences,
    Langues: profile.value.languages, Formats: profile.value.formats, Parcours: profile.value.experienceSummary,
    Certifications: profile.value.certifications }
  const missing = Object.entries(values).filter(([, value]) => Array.isArray(value) ? !value.some(item => typeof item === 'string' && item.trim()) : !String(value || '').trim()).map(([label]) => label)
  if (profile.value.experienceYears === null || profile.value.experienceYears === '' || !Number.isInteger(Number(profile.value.experienceYears)) || Number(profile.value.experienceYears) < 0 || Number(profile.value.experienceYears) > 70) missing.push('Années d’expérience')
  return missing
})
async function load() {
  loading.value = true
  loadFailed.value = false
  error.value = ''
  try {
    if (isPreferences.value)
      preferences.value = (await api.get('/coach-account/preferences')).data
    else {
      const { data } = await api.get('/users/me')
      firstname.value = data.firstname || ''
      photo.value = data.profilePhoto || ''
      profile.value = { ...profile.value, ...(data.coachProfile || {}) }
    }
  } catch {
    loadFailed.value = true
    error.value = 'Impossible de charger vos informations.'
  } finally {
    loading.value = false
  }
}
async function save() {
  success.value = ''
  error.value = ''
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (isPreferences.value)
      preferences.value = (
        await api.patch('/coach-account/preferences', preferences.value)
      ).data
    else {
      const { data } = await api.patch('/coach-account/profile', {
        firstname: firstname.value,
        profilePhoto: photo.value,
        coachProfile: profile.value,
      })
      auth.setProfile(data)
      profile.value = data.coachProfile
      invalidateCoachDirectory()
    }
    notifyCoachJourneyUpdated()
    success.value = isPreferences.value
      ? 'Préférences enregistrées.'
      : missingProfileFields.value.length ? 'Modifications enregistrées. Le profil reste incomplet.' : 'Profil complet enregistré.'
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Impossible d’enregistrer les modifications.'
  } finally {
    saving.value = false
  }
}
async function uploadPhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  error.value = ''
  success.value = ''
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 300 * 1024
  ) {
    error.value = 'Choisissez une photo JPEG, PNG ou WebP de moins de 300 Ko.'
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    photo.value = reader.result
  }
  reader.onerror = () => {
    error.value = 'Impossible de lire la photo.'
  }
  reader.readAsDataURL(file)
}
onMounted(load)
</script>
<template>
  <main class="coach-account">
    <header>
      <div>
        <h1>{{ isPreferences ? 'Mes préférences' : 'Mon profil' }}</h1>
        <p>
          {{
            isPreferences
              ? 'Privé · Visible uniquement par vous'
              : 'Public · Visible par les apprenants'
          }}
        </p>
      </div>
      <v-btn
        :to="isPreferences ? ROUTE_PATHS.profile : ROUTE_PATHS.preferences"
        variant="outlined"
        color="#24443f"
        >{{ isPreferences ? 'Mon profil' : 'Mes préférences' }}</v-btn
      >
    </header>
    <v-progress-linear v-if="loading" indeterminate color="#24443f" />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-5"
      >{{ error
      }}<v-btn v-if="loadFailed" variant="text" @click="load"
        >Réessayer</v-btn
      ></v-alert
    >
    <v-alert
      v-if="success"
      type="success"
      variant="tonal"
      class="mb-5"
      role="status"
      >{{ success }}</v-alert
    >
    <v-form
      v-if="!loading && !loadFailed"
      ref="formRef"
      @submit.prevent="save"
      :disabled="saving"
    >
      <div :class="{ 'profile-grid': !isPreferences }">
        <div class="form-panels">
          <template v-if="!isPreferences">
            <section class="panel">
              <h2>Présentation</h2>
              <p class="hint">Tous les champs, y compris la photo et les certifications, doivent être renseignés pour valider le profil.</p>
              <v-alert v-if="missingProfileFields.length" type="info" variant="tonal" class="mb-5">À compléter : {{ missingProfileFields.join(', ') }}.</v-alert>
              <div class="photo-row">
                <v-avatar size="72" color="#edf0e9"
                  ><v-img
                    v-if="photo"
                    :src="photo"
                    alt="Photo du coach"
                  /><v-icon v-else>mdi-account-outline</v-icon></v-avatar
                >
                <div>
                  <label class="photo-label"
                    >Photo publique<input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      :disabled="saving"
                      @change="uploadPhoto" /></label
                  ><small>JPEG, PNG ou WebP · 300 Ko maximum</small
                  ><v-btn
                    v-if="photo"
                    variant="text"
                    size="small"
                    @click="photo = ''"
                    >Retirer</v-btn
                  >
                </div>
              </div>
              <v-text-field
                v-model="firstname"
                label="Nom affiché aux apprenants"
                variant="outlined"
                maxlength="100"
                :rules="[(v) => !!v?.trim() || 'Renseignez votre nom public.']"
              />
              <v-text-field
                v-model="profile.headline"
                label="Titre professionnel"
                placeholder="Coach en négociation commerciale"
                variant="outlined"
                maxlength="120"
                counter
              />
              <v-textarea
                v-model="profile.bio"
                label="Présentation et approche d’accompagnement"
                variant="outlined"
                rows="4"
                maxlength="2000"
                counter
              />
            </section>
            <section class="panel">
              <h2>Spécialités et accompagnement</h2>
              <p class="hint">
                Sélectionnez des tags ou saisissez les vôtres, puis appuyez sur
                Entrée.
              </p>
              <v-combobox
                v-model="profile.specialties"
                :items="specialties"
                label="Spécialités en négociation"
                multiple
                chips
                closable-chips
                variant="outlined"
                :rules="[tagsRule]"
              />
              <v-combobox
                v-model="profile.audiences"
                :items="audiences"
                label="Publics accompagnés"
                multiple
                chips
                closable-chips
                variant="outlined"
                :rules="[tagsRule]"
              />
              <v-combobox
                v-model="profile.languages"
                :items="languages"
                label="Langues d’accompagnement"
                multiple
                chips
                closable-chips
                variant="outlined"
                :rules="[tagsRule]"
              />
              <v-combobox
                v-model="profile.formats"
                :items="formats"
                label="Formats proposés"
                multiple
                chips
                closable-chips
                variant="outlined"
                :rules="[tagsRule]"
              />
            </section>
            <section class="panel">
              <h2>Expérience et qualifications</h2>
              <v-text-field
                v-model.number="profile.experienceYears"
                label="Années d’expérience en négociation"
                type="number"
                min="0"
                max="70"
                step="1"
                variant="outlined"
                :rules="[
                  (v) =>
                    v === '' ||
                    v == null ||
                    (Number.isInteger(Number(v)) &&
                      Number(v) >= 0 &&
                      Number(v) <= 70) ||
                    'Indiquez entre 0 et 70 ans.',
                ]"
              /><v-textarea
                v-model="profile.experienceSummary"
                label="Parcours et expériences professionnelles"
                rows="4"
                variant="outlined"
                maxlength="1500"
                counter
              /><v-combobox
                v-model="profile.certifications"
                label="Diplômes et certifications"
                multiple
                chips
                closable-chips
                variant="outlined"
                :rules="[tagsRule]"
                hint="Intitulé, organisme et année. Ces informations sont déclaratives."
                persistent-hint
              />
            </section>
          </template>
          <template v-else>
            <section class="panel">
              <h2>Disponibilités de travail</h2>
              <p class="hint">Choisissez au moins un jour disponible, puis enregistrez vos préférences pour valider cette étape du parcours.</p>
              <p class="hint">
                Repères personnels pour organiser vos accompagnements. Ces
                réglages ne créent pas de rendez-vous.
              </p>
              <v-select
                v-model="preferences.days"
                :items="days"
                label="Jours disponibles"
                multiple
                chips
                closable-chips
                variant="outlined"
              />
              <div class="two-columns">
                <v-text-field
                  v-model="preferences.startTime"
                  label="À partir de"
                  type="time"
                  variant="outlined"
                  :rules="[(v) => !!v || 'Renseignez une heure.']"
                /><v-text-field
                  v-model="preferences.endTime"
                  label="Jusqu’à"
                  type="time"
                  variant="outlined"
                  :rules="[
                    (v) =>
                      (!!v && v > preferences.startTime) ||
                      'Choisissez une heure après le début.',
                  ]"
                />
              </div>
              <v-combobox
                v-model="preferences.timeZone"
                :items="[
                  'Europe/Paris',
                  'Europe/Brussels',
                  'Europe/Zurich',
                  'Europe/London',
                  'America/Montreal',
                  'Africa/Casablanca',
                  'Africa/Dakar',
                ]"
                label="Fuseau horaire"
                variant="outlined"
              />
            </section>
            <section class="panel">
              <h2>Organisation du suivi</h2>
              <v-select
                v-model="preferences.sessionDuration"
                :items="
                  [30, 45, 60, 90, 120].map((value) => ({
                    title: `${value} minutes`,
                    value,
                  }))
                "
                label="Durée habituelle d’une séance"
                variant="outlined"
              /><v-text-field
                v-model.number="preferences.maxClients"
                label="Nombre maximal de clients souhaité"
                type="number"
                min="1"
                max="100"
                variant="outlined"
                :rules="[
                  (v) =>
                    (Number.isInteger(Number(v)) && v >= 1 && v <= 100) ||
                    'Indiquez entre 1 et 100 clients.',
                ]"
              />
              <p class="hint">
                Ce nombre ne bloque pas les nouvelles demandes de suivi.
              </p>
            </section>
          </template>
          <div class="save-row">
            <v-btn
              type="submit"
              color="#b55d3f"
              :loading="saving"
              size="large"
              >{{
                isPreferences
                  ? 'Enregistrer mes préférences'
                  : 'Enregistrer mon profil public'
              }}</v-btn
            >
          </div>
        </div>
        <aside v-if="!isPreferences" class="panel preview">
          <h2>Aperçu du profil public</h2>
          <div class="preview-name">
            <v-avatar color="#edf0e9" size="56"
              ><v-img v-if="photo" :src="photo" alt="Photo publique" /><v-icon
                v-else
                >mdi-account-outline</v-icon
              ></v-avatar
            ><strong>{{ firstname || 'Votre nom' }}</strong>
          </div>
          <CoachPublicDetails :profile="profile" />
          <p class="hint">
            L’adresse e-mail et vos préférences ne figurent pas dans cet aperçu.
          </p>
        </aside>
      </div>
    </v-form>
  </main>
</template>
<style scoped>
.coach-account {
  max-width: 1200px;
  margin: auto;
  padding: 40px 24px 72px;
  color: #24443f;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
h1 {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.03em;
}
header p {
  margin-top: 8px;
  font-size: 13px;
  color: #64736b;
}
.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 24px;
}
.form-panels {
  display: grid;
  gap: 22px;
}
.panel {
  border: 1px solid #24443f20;
  background: #fffdf8;
  border-radius: 16px;
  padding: 26px;
  min-width: 0;
}
h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 22px;
}
.hint {
  font-size: 13px;
  line-height: 1.6;
  color: #637269;
  margin: 0 0 20px;
}
.preview {
  align-self: start;
  position: sticky;
  top: 136px;
}
.preview-name {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  overflow-wrap: anywhere;
}
.photo-row {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-bottom: 26px;
}
.photo-label {
  display: grid;
  gap: 8px;
  font-size: 14px;
}
input[type='file'] {
  max-width: 100%;
  font-size: 12px;
}
small {
  display: block;
  margin-top: 8px;
  color: #637269;
}
.two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.save-row {
  display: flex;
  justify-content: flex-end;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
.preview .hint {
  margin: 18px 0 0;
}
@media (max-width: 850px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .preview {
    position: static;
  }
}
@media (max-width: 540px) {
  .coach-account {
    padding: 28px 16px;
  }
  header {
    align-items: flex-start;
    flex-direction: column;
  }
  .panel {
    padding: 20px;
  }
  .two-columns {
    grid-template-columns: 1fr;
  }
  .photo-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

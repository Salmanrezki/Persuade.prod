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
const photoInput = ref(null)
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
  <main class="coach-account" :class="{ 'profile-page': !isPreferences, 'preferences-page': isPreferences }">
    <header class="page-heading">
      <div>
        <span class="eyebrow">ESPACE COACH · MON COMPTE</span>
        <h1>{{ isPreferences ? 'Organiser mon accompagnement' : 'Présenter mon expertise' }}</h1>
        <p>
          {{
            isPreferences
              ? 'Organisez vos disponibilités et trouvez le rythme adapté à vos accompagnements.'
              : 'Valorisez votre expertise et donnez aux apprenants envie de vous rencontrer.'
          }}
        </p>
      </div>
      <v-btn
        :to="isPreferences ? ROUTE_PATHS.profile : ROUTE_PATHS.preferences"
        variant="outlined"
        :prepend-icon="isPreferences ? 'mdi-account-outline' : 'mdi-tune-variant'"
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
      <div class="profile-grid">
        <div class="form-panels">
          <template v-if="!isPreferences">
            <section class="panel">
              <div class="section-title"><span class="section-icon"><v-icon size="22">mdi-account-outline</v-icon></span><div><span class="section-step">01 · FAIRE CONNAISSANCE</span><h2>Présentation</h2></div></div>
              <p class="hint">Présentez votre expertise et ce qui rend votre accompagnement unique. Chaque champ contribue à un profil complet.</p>
              <div class="photo-row">
                <v-avatar size="72" color="#edf0e9"
                  ><v-img
                    v-if="photo"
                    :src="photo"
                    alt="Photo du coach"
                  /><v-icon v-else>mdi-account-outline</v-icon></v-avatar
                >
                <div>
                  <span class="photo-label">Votre photo de profil</span>
                  <input
                      ref="photoInput"
                      class="photo-input"
                      aria-label="Choisir une photo publique"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      :disabled="saving"
                      @change="uploadPhoto" />
                  <v-btn variant="outlined" size="small" color="#24443f" prepend-icon="mdi-camera-outline" :disabled="saving" @click="photoInput?.click()">{{ photo ? 'Changer la photo' : 'Ajouter une photo' }}</v-btn>
                  <small>JPEG, PNG ou WebP · 300 Ko maximum</small
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
              <div class="section-title"><span class="section-icon"><v-icon size="22">mdi-compass-outline</v-icon></span><div><span class="section-step">02 · VOTRE EXPERTISE</span><h2>Spécialités et accompagnement</h2></div></div>
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
              <div class="section-title"><span class="section-icon"><v-icon size="22">mdi-school-outline</v-icon></span><div><span class="section-step">03 · VOTRE PARCOURS</span><h2>Expérience et qualifications</h2></div></div>
              <p class="hint">Mettez en lumière votre parcours et les qualifications qui soutiennent votre pratique.</p>
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
              <div class="section-title">
                <span class="section-icon"><v-icon size="22">mdi-calendar-clock-outline</v-icon></span>
                <div><span class="section-step">01 · VOTRE SEMAINE</span><h2>Disponibilités de travail</h2></div>
              </div>
              <p class="hint">Choisissez au moins un jour disponible, puis enregistrez vos préférences pour valider cette étape du parcours.</p>
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
                prepend-inner-icon="mdi-earth"
              />
              <div class="preference-note"><v-icon size="18">mdi-information-outline</v-icon><p>Ces disponibilités sont des repères personnels. Elles ne créent pas de rendez-vous.</p></div>
            </section>
            <section class="panel">
              <div class="section-title">
                <span class="section-icon"><v-icon size="22">mdi-account-group-outline</v-icon></span>
                <div><span class="section-step">02 · VOS ACCOMPAGNEMENTS</span><h2>Organisation du suivi</h2></div>
              </div>
              <p class="hint">Adaptez la durée de vos séances et votre capacité de suivi à votre façon de travailler.</p>
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
                prepend-inner-icon="mdi-clock-outline"
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
              <div class="preference-note"><v-icon size="18">mdi-information-outline</v-icon><p>Le nombre de clients souhaité est un repère d’organisation. Il ne bloque pas les nouvelles demandes de suivi.</p></div>
            </section>
          </template>
          <div class="save-row">
            <p v-if="!isPreferences">Votre aperçu évolue au fil de la saisie.<br />Enregistrez pour conserver vos modifications.</p>
            <p v-else>Vos préférences restent privées.<br />Enregistrez pour conserver vos modifications.</p>
            <v-btn
              type="submit"
              prepend-icon="mdi-check"
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
          <div class="preview-heading"><v-icon size="18">mdi-eye-outline</v-icon><h2>Aperçu public</h2><span>En direct</span></div>
          <div class="preview-cover"><span>COACH EN NÉGOCIATION</span></div>
          <div class="preview-name">
            <v-avatar color="#edf0e9" size="80"
              ><v-img v-if="photo" :src="photo" alt="Photo publique" /><v-icon
                v-else
                >mdi-account-outline</v-icon
              ></v-avatar
            ><strong>{{ firstname || 'Votre nom' }}</strong>
          </div>
          <p v-if="!profile.headline && !profile.bio" class="preview-placeholder">Votre expertise mérite d’être découverte. Complétez votre présentation pour donner vie à votre profil.</p>
          <CoachPublicDetails :profile="profile" />
          <p class="hint preview-privacy">
            <v-icon size="16">mdi-lock-outline</v-icon> Votre e-mail et vos préférences restent privés.
          </p>
        </aside>
        <aside v-else class="panel preview preferences-summary" aria-labelledby="preferences-summary-title">
          <div class="preview-heading"><v-icon size="18">mdi-calendar-check-outline</v-icon><h2 id="preferences-summary-title">Votre organisation</h2><span>En direct</span></div>
          <p class="hint">Un aperçu de vos préférences au fil de la saisie.</p>
          <div class="week-summary">
            <span class="section-step">JOURS DISPONIBLES</span>
            <div v-if="preferences.days.length" class="day-tags">
              <span v-for="day in days.filter(day => preferences.days.includes(day))" :key="day">{{ day }}</span>
            </div>
            <p v-else class="summary-empty">Sélectionnez vos jours de travail pour composer votre semaine.</p>
          </div>
          <dl class="preference-facts">
            <div><dt><v-icon size="18">mdi-clock-outline</v-icon> Plage horaire</dt><dd>{{ preferences.startTime || '—' }} – {{ preferences.endTime || '—' }}</dd></div>
            <div><dt><v-icon size="18">mdi-earth</v-icon> Fuseau horaire</dt><dd>{{ preferences.timeZone || 'À renseigner' }}</dd></div>
            <div><dt><v-icon size="18">mdi-timer-outline</v-icon> Durée d’une séance</dt><dd>{{ preferences.sessionDuration }} minutes</dd></div>
            <div><dt><v-icon size="18">mdi-account-group-outline</v-icon> Capacité souhaitée</dt><dd>{{ preferences.maxClients || '—' }} clients</dd></div>
          </dl>
          <p class="hint preview-privacy"><v-icon size="16">mdi-lock-outline</v-icon> Ces informations ne figurent pas sur votre profil public.</p>
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
.eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  margin-bottom: 10px;
  color: #8b4a34;
}
.coach-account .page-heading { margin-bottom: 32px; }
.coach-account h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(30px, 4vw, 40px); }
.section-title { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.section-icon { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 13px; color: #8b4a34; background: #f3e7de; }
.section-step { font-size: 10px; letter-spacing: 0.1em; color: #6a756d; font-weight: 600; }
.section-title h2 { margin: 4px 0 0; line-height: 1.4; }
.coach-account .panel { border-radius: 20px; }
.coach-account :deep(.v-field) { border-radius: 10px; background: #ffffff80; }
.coach-account :deep(.v-field--focused) { color: #24443f; }
.coach-account :deep(.v-field__outline) { --v-field-border-opacity: 0.2; }
.coach-account :deep(.v-chip) { background: #edf0e9; color: #24443f; }
.photo-input { display: none; }
.profile-page .photo-row { padding: 20px; background: #f4f3ec; border: 1px solid #24443f12; border-radius: 14px; }
.photo-label { margin-bottom: 10px; font-weight: 600; }
.photo-row > div { min-width: 0; }
.preview-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
.preview-heading h2 { font-size: 14px; margin: 0; }
.preview-heading > span { margin-left: auto; border-radius: 20px; padding: 4px 8px; background: #edf0e9; font-size: 10px; white-space: nowrap; }
.preview-cover { height: 104px; padding: 20px; border-radius: 12px; background: linear-gradient(115deg, #24443f, #446454); color: #e8d9bd; text-align: right; }
.preview-cover span { font-size: 9px; letter-spacing: 0.12em; font-weight: 600; }
.profile-page .preview-name { flex-direction: column; align-items: flex-start; gap: 12px; margin-top: -38px; padding: 0 14px; }
.preview-name :deep(.v-avatar) { border: 4px solid #fffdf8; }
.preview-name strong { font-family: 'Space Grotesk', sans-serif; font-size: 24px; line-height: 1.3; }
.preview-placeholder { font-size: 13px; line-height: 1.8; color: #637269; padding: 0 14px; }
.preview :deep(.coach-public-details) { padding: 0 14px 12px; overflow-wrap: anywhere; }
.preview-privacy { padding-top: 18px; border-top: 1px solid #24443f15; font-size: 12px; }
.coach-account .save-row { padding: 20px; gap: 16px; align-items: center; justify-content: space-between; border: 1px solid #24443f20; border-radius: 16px; background: #fffdf8; }
.preference-note { display: flex; align-items: flex-start; gap: 10px; padding: 14px; border-radius: 12px; background: #f4f3ec; color: #637269; }
.preference-note p { font-size: 12px; line-height: 1.7; }
.preference-note .v-icon { flex-shrink: 0; margin-top: 2px; color: #8b4a34; }
.week-summary { margin-top: 22px; padding: 18px; background: #edf0e9; border-radius: 12px; }
.day-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.day-tags span { background: #fffdf8; border: 1px solid #24443f15; border-radius: 8px; padding: 5px 9px; font-size: 12px; }
.summary-empty { color: #637269; font-size: 13px; line-height: 1.7; margin-top: 10px; }
.preference-facts { margin-top: 10px; }
.preference-facts > div { padding: 18px 0; border-bottom: 1px solid #24443f12; }
.preference-facts > div:last-child { border-bottom: 0; }
.preference-facts dt { display: flex; align-items: center; gap: 8px; color: #637269; font-size: 12px; }
.preference-facts dd { margin: 8px 0 0 26px; font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
.save-row p { font-size: 11px; line-height: 1.6; color: #637269; }
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
  border-radius: 9px;
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
@media (min-width: 851px) {
  .preview { max-height: calc(100dvh - 160px); overflow-y: auto; scrollbar-width: thin; }
  .coach-account .save-row { flex-wrap: wrap; }
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
  .coach-account .save-row { flex-direction: column; align-items: stretch; }
  .save-row :deep(.v-btn) { width: 100%; font-size: 12px; }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/services/userService'
import {
  companySizeOptions,
  discoveryOptions,
  familyOptions,
  jobTitleOptions,
  professionOptions,
  revenueOptions,
  sectorOptions,
  seniorityOptions,
} from '@/data/profileOptions'
import {
  estimateDataUrlBytes,
  formatAccountStatusLabel,
  formatProfileRoleLabel,
  MAX_PROFILE_PHOTO_BYTES,
} from '@/utils/profile'

const auth = useAuthStore()

const loading = ref(false)
const fetching = ref(true)
const loadFailed = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const photoInput = ref(null)
const profilePhoto = ref(null)
const profilePhotoPreview = ref('')
const firstname = ref('')
const birthdate = ref('')
const profession = ref('')
const professionDetail = ref('')
const sector = ref('')
const sectorDetail = ref('')
const jobTitle = ref('')
const jobTitleDetail = ref('')
const seniority = ref('')
const companySize = ref('')
const revenue = ref('')
const familyStatus = ref('')
const discovery = ref('')
const referralCode = ref('')
const referralPoints = ref(0)
const referralCount = ref(0)
const referredByCode = ref('')

const needsProfessionDetail = computed(() => profession.value === 'Autre')
const needsSectorDetail = computed(() => sector.value === 'Autre')
const needsJobTitleDetail = computed(() => jobTitle.value === 'Autre')

const displayName = computed(
  () =>
    firstname.value ||
    auth.user?.displayName ||
    auth.user?.email?.split('@')[0] ||
    'Utilisateur',
)
const email = computed(() => auth.user?.email || auth.profile?.email || '—')
const roleLabel = computed(() => formatProfileRoleLabel(auth.profile))
const accountStatusLabel = computed(() =>
  formatAccountStatusLabel(auth.profile),
)
const referralMessage = computed(
  () =>
    'Partagez votre code: si une personne s inscrit avec, vous gagnez des points pour acceder gratuitement a des masterclass privees.',
)
const profileCompletion = computed(() => {
  const fields = [
    firstname.value,
    birthdate.value,
    profession.value,
    jobTitle.value,
    sector.value,
    seniority.value,
    companySize.value,
  ]

  const completed = fields.filter(Boolean).length
  return Math.round((completed / fields.length) * 100)
})

const handleFileSelected = async (file) => {
  successMessage.value = ''

  if (!file) {
    profilePhoto.value = null
    profilePhotoPreview.value = ''
    return
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    errorMessage.value = 'Choisissez une photo JPEG, PNG ou WebP.'
    return
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    errorMessage.value =
      'La photo dépasse 300 Ko. Choisissez une image plus légère.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (estimateDataUrlBytes(reader.result) > MAX_PROFILE_PHOTO_BYTES) {
      errorMessage.value =
        'La photo encodée dépasse 300 Ko. Choisissez une image plus légère.'
      profilePhoto.value = null
      profilePhotoPreview.value = ''
      return
    }

    profilePhoto.value = file
    profilePhotoPreview.value = reader.result
    errorMessage.value = ''
  }
  reader.onerror = () => {
    errorMessage.value = 'Impossible de lire cette photo.'
  }
  reader.readAsDataURL(file)
}

const onPhotoSelected = (event) => {
  handleFileSelected(event.target.files?.[0])
  event.target.value = ''
}

const loadProfile = async () => {
  const data =
    auth.profile ||
    (auth.user?.uid ? await getUserProfile(auth.user.uid) : null)

  firstname.value = data?.firstname || ''
  birthdate.value = data?.birthdate || ''
  profession.value = data?.profession || ''
  professionDetail.value = data?.professionDetail || ''
  sector.value = data?.sector || ''
  sectorDetail.value = data?.sectorDetail || ''
  jobTitle.value = data?.jobTitle || ''
  jobTitleDetail.value = data?.jobTitleDetail || ''
  seniority.value = data?.seniority || ''
  companySize.value = data?.companySize || ''
  revenue.value = data?.revenue || ''
  familyStatus.value = data?.familyStatus || ''
  discovery.value = data?.discovery || ''
  referralCode.value = data?.referralCode || ''
  referralPoints.value = Number(data?.referralPoints || 0)
  referralCount.value = Number(data?.referralCount || 0)
  referredByCode.value = data?.referredByCode || ''
  profilePhotoPreview.value = data?.profilePhoto || ''
}

const submit = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const payload = {
    firstname: firstname.value,
    birthdate: birthdate.value,
    profilePhoto: profilePhotoPreview.value,
    profession: profession.value,
    professionDetail: professionDetail.value,
    sector: sector.value,
    sectorDetail: sectorDetail.value,
    jobTitle: jobTitle.value,
    jobTitleDetail: jobTitleDetail.value,
    seniority: seniority.value,
    companySize: companySize.value,
    revenue: revenue.value,
    familyStatus: familyStatus.value,
    discovery: discovery.value,
  }

  try {
    if (
      estimateDataUrlBytes(profilePhotoPreview.value) > MAX_PROFILE_PHOTO_BYTES
    ) {
      errorMessage.value =
        'La photo est trop lourde pour être enregistrée. Réduisez-la puis réessayez.'
      return
    }

    if (!auth.user?.uid) {
      throw new Error('Missing authenticated user')
    }

    const updatedProfile = await updateUserProfile(auth.user.uid, payload)

    auth.setProfile({
      ...(auth.profile || {}),
      ...(updatedProfile || {}),
      uid: auth.user.uid,
      email: auth.user.email,
      ...payload,
    })

    successMessage.value = 'Vos informations ont été mises à jour.'
  } catch (error) {
    if (error?.response?.status === 413) {
      errorMessage.value =
        error?.response?.data?.message ||
        'Image trop lourde. Merci de choisir une photo plus légère.'
    } else {
      errorMessage.value = 'Impossible d’enregistrer vos informations.'
    }
    console.error(error)
  } finally {
    loading.value = false
  }
}

const initialize = async () => {
  fetching.value = true
  loadFailed.value = false
  errorMessage.value = ''
  try {
    await loadProfile()
  } catch (error) {
    loadFailed.value = true
    errorMessage.value = 'Impossible de charger vos informations.'
    console.error(error)
  } finally {
    fetching.value = false
  }
}
onMounted(initialize)
</script>
<template>
  <main class="learner-account profile-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">ESPACE APPRENANT · MON COMPTE</span>
        <h1>Mes informations</h1>
        <p>
          Présentez-vous pour mieux personnaliser votre parcours
          d’apprentissage.
        </p>
      </div>
      <v-btn
        :to="ROUTE_PATHS.preferences"
        variant="outlined"
        prepend-icon="mdi-tune-variant"
        color="#24443f"
        >Mes préférences</v-btn
      >
    </header>
    <v-progress-linear v-if="fetching" indeterminate color="#24443f" /><v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      class="mb-5"
      >{{ errorMessage
      }}<v-btn v-if="loadFailed" variant="text" @click="initialize"
        >Réessayer</v-btn
      ></v-alert
    ><v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-5"
      role="status"
      >{{ successMessage }}</v-alert
    ><v-form
      v-if="!fetching && !loadFailed"
      :disabled="loading"
      @submit.prevent="submit"
      ><div class="profile-grid">
        <div class="form-panels">
          <section class="panel">
            <div class="section-title">
              <span class="section-icon"
                ><v-icon size="22">mdi-account-outline</v-icon></span
              >
              <div>
                <span class="section-step">01 · FAIRE CONNAISSANCE</span>
                <h2>Photo et identité</h2>
              </div>
            </div>
            <v-row>
              <v-col cols="12"
                ><div class="photo-row">
                  <v-avatar size="72" color="#edf0e9"
                    ><v-img
                      v-if="profilePhotoPreview"
                      :src="profilePhotoPreview"
                      alt="Photo de profil"
                    /><v-icon v-else>mdi-account-outline</v-icon></v-avatar
                  >
                  <div>
                    <span class="photo-label">Votre photo de profil</span
                    ><input
                      ref="photoInput"
                      class="photo-input"
                      type="file"
                      aria-label="Choisir une photo de profil"
                      accept="image/jpeg,image/png,image/webp"
                      :disabled="loading"
                      @change="onPhotoSelected"
                    /><v-btn
                      variant="outlined"
                      size="small"
                      color="#24443f"
                      prepend-icon="mdi-camera-outline"
                      @click="photoInput?.click()"
                      >{{
                        profilePhotoPreview
                          ? 'Changer la photo'
                          : 'Ajouter une photo'
                      }}</v-btn
                    ><small>JPEG, PNG ou WebP · 300 Ko maximum</small
                    ><v-btn
                      v-if="profilePhotoPreview"
                      variant="text"
                      size="small"
                      @click="handleFileSelected(null)"
                      >Retirer</v-btn
                    >
                  </div>
                </div></v-col
              >

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="firstname"
                  label="Prénom"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="email"
                  label="Email"
                  variant="outlined"
                  readonly
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="birthdate"
                  label="Date de naissance"
                  type="date"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  :model-value="roleLabel"
                  label="Rôle"
                  variant="outlined"
                  readonly
                />
              </v-col>
            </v-row>
          </section>
          <section class="panel">
            <div class="section-title">
              <span class="section-icon"
                ><v-icon size="22">mdi-briefcase-outline</v-icon></span
              >
              <div>
                <span class="section-step">02 · VOTRE ACTIVITÉ</span>
                <h2>Profil professionnel</h2>
              </div>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="profession"
                  :items="professionOptions"
                  label="Profession"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6" v-if="needsProfessionDetail">
                <v-text-field
                  v-model="professionDetail"
                  label="Précisez votre profession"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="jobTitle"
                  :items="jobTitleOptions"
                  label="Métier / Poste"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6" v-if="needsJobTitleDetail">
                <v-text-field
                  v-model="jobTitleDetail"
                  label="Précisez votre poste"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="sector"
                  :items="sectorOptions"
                  label="Secteur d’activité"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6" v-if="needsSectorDetail">
                <v-text-field
                  v-model="sectorDetail"
                  label="Précisez votre secteur"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="seniority"
                  :items="seniorityOptions"
                  label="Expérience"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="companySize"
                  :items="companySizeOptions"
                  label="Taille de l’entreprise"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </section>
          <section class="panel">
            <div class="section-title">
              <span class="section-icon"
                ><v-icon size="22">mdi-compass-outline</v-icon></span
              >
              <div>
                <span class="section-step">03 · VOTRE PARCOURS</span>
                <h2>Contexte personnel</h2>
              </div>
            </div>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="revenue"
                  :items="revenueOptions"
                  label="Revenus"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="familyStatus"
                  :items="familyOptions"
                  label="Situation familiale"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="discovery"
                  :items="discoveryOptions"
                  label="Comment avez-vous connu la plateforme ?"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </section>
          <div class="save-row">
            <p>
              Votre aperçu évolue au fil de la saisie.<br />Enregistrez pour
              conserver vos modifications.
            </p>
            <v-btn
              type="submit"
              prepend-icon="mdi-check"
              color="#b55d3f"
              :loading="loading"
              size="large"
              >Enregistrer mon profil</v-btn
            >
          </div>
        </div>
        <aside class="panel preview" aria-label="Résumé du profil">
          <div class="preview-heading">
            <v-icon size="18">mdi-eye-outline</v-icon>
            <h2>Votre profil</h2>
            <span>En direct</span>
          </div>
          <div class="preview-cover"><span>APPRENANT EN NÉGOCIATION</span></div>
          <div class="preview-name">
            <v-avatar size="80" color="#edf0e9"
              ><v-img
                v-if="profilePhotoPreview"
                :src="profilePhotoPreview"
                alt="Photo de profil"
              /><v-icon v-else>mdi-account-outline</v-icon></v-avatar
            ><strong>{{ displayName }}</strong>
          </div>
          <p class="hint">{{ email }}</p>
          <div class="summary-tags">
            <v-chip size="small">{{ roleLabel }}</v-chip
            ><v-chip size="small">{{ accountStatusLabel }}</v-chip>
          </div>
          <div class="completion">
            <span>Profil complété à {{ profileCompletion }} %</span
            ><v-progress-linear
              :model-value="profileCompletion"
              color="#24443f"
              rounded
              height="6"
            />
          </div>
          <dl class="preference-facts">
            <div>
              <dt>Prénom</dt>
              <dd>{{ firstname || 'À compléter' }}</dd>
            </div>
            <div>
              <dt>Naissance</dt>
              <dd>{{ birthdate || 'À compléter' }}</dd>
            </div>
            <div>
              <dt>Fonction</dt>
              <dd>
                {{
                  (needsJobTitleDetail ? jobTitleDetail : jobTitle) ||
                  'À compléter'
                }}
              </dd>
            </div>
          </dl>
          <div class="referral-summary">
            <h2>Parrainage</h2>
            <dl class="preference-facts">
              <div>
                <dt>Votre code</dt>
                <dd>{{ referralCode || 'Indisponible' }}</dd>
              </div>
              <div>
                <dt>Points gagnés</dt>
                <dd>{{ referralPoints }}</dd>
              </div>
              <div>
                <dt>Inscriptions parrainées</dt>
                <dd>{{ referralCount }}</dd>
              </div>
            </dl>
            <p class="hint">{{ referralMessage }}</p>
            <p v-if="referredByCode" class="hint">
              Vous avez utilisé le code {{ referredByCode }}.
            </p>
          </div>
        </aside>
      </div></v-form
    >
  </main>
</template>
<style scoped src="@/assets/learner-account.css"></style>

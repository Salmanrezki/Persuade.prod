<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.png'
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
import { estimateDataUrlBytes, formatRoleLabel, MAX_PROFILE_PHOTO_BYTES } from '@/utils/profile'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

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

const needsProfessionDetail = computed(() => profession.value === 'Autre')
const needsSectorDetail = computed(() => sector.value === 'Autre')
const needsJobTitleDetail = computed(() => jobTitle.value === 'Autre')

const displayName = computed(() => firstname.value || auth.user?.displayName || auth.user?.email?.split('@')[0] || 'Utilisateur')
const email = computed(() => auth.user?.email || auth.profile?.email || '—')
const roleLabel = computed(() => formatRoleLabel(auth.profile?.role))
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

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    errorMessage.value = 'La photo dépasse 300 Ko. Choisissez une image plus légère.'
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (estimateDataUrlBytes(reader.result) > MAX_PROFILE_PHOTO_BYTES) {
      errorMessage.value = 'La photo encodée dépasse 300 Ko. Choisissez une image plus légère.'
      profilePhoto.value = null
      profilePhotoPreview.value = ''
      return
    }

    profilePhoto.value = file
    profilePhotoPreview.value = reader.result
    errorMessage.value = ''
  }
  reader.readAsDataURL(file)
}

const loadProfile = async () => {
  const data = auth.profile || (auth.user?.uid ? await getUserProfile(auth.user.uid) : null)

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
    if (estimateDataUrlBytes(profilePhotoPreview.value) > MAX_PROFILE_PHOTO_BYTES) {
      errorMessage.value = 'La photo est trop lourde pour être enregistrée. Réduisez-la puis réessayez.'
      return
    }

    if (!auth.user?.uid) {
      throw new Error('Missing authenticated user')
    }

    await updateUserProfile(auth.user.uid, payload)

    auth.setProfile({
      ...(auth.profile || {}),
      uid: auth.user.uid,
      email: auth.user.email,
      ...payload,
    })

    successMessage.value = 'Vos informations ont été mises à jour.'
  } catch (error) {
    if (error?.response?.status === 413) {
      errorMessage.value = error?.response?.data?.message || 'Image trop lourde. Merci de choisir une photo plus légère.'
    } else {
      errorMessage.value = 'Impossible d’enregistrer vos informations.'
    }
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadProfile()
  } catch (error) {
    errorMessage.value = 'Impossible de charger vos informations.'
    console.error(error)
  }
})
</script>

<template>
  <v-container class="profile-view" fluid>
    <div class="profile-view__backdrop" aria-hidden="true"></div>

    <v-row class="profile-view__hero" justify="center">
      <v-col cols="12" md="10">
        <v-card class="profile-hero" elevation="8">
          <div class="profile-hero__content">
            <div class="profile-hero__copy">
              <div class="profile-hero__brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="68" height="68" class="profile-hero__logo" />
                <div>
                  <div class="profile-hero__brand-name">Persuade</div>
                  <div class="profile-hero__eyebrow">Espace personnel</div>
                </div>
              </div>

              <div class="profile-hero__title">Voir et gérer mes informations</div>
              <div class="profile-hero__subtitle">
                Retrouvez vos informations personnelles, votre photo et votre profil professionnel au même endroit.
              </div>
            </div>

            <div class="profile-hero__actions">
              <v-btn class="profile-hero__primary" size="large" @click="submit" :loading="loading">
                Enregistrer
              </v-btn>
              <v-btn class="profile-hero__secondary" size="large" variant="outlined" @click="router.push(ROUTE_PATHS.preferences)">
                Gérer mes préférences
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="profile-view__grid" justify="center">
      <v-col cols="12" md="4">
        <v-card class="profile-panel profile-panel--summary" elevation="6">
          <div class="profile-summary">
            <v-avatar size="104" class="profile-summary__avatar">
              <v-img v-if="profilePhotoPreview" :src="profilePhotoPreview" alt="Photo de profil" />
              <v-icon v-else size="44">mdi-account-circle</v-icon>
            </v-avatar>

            <div class="profile-summary__name">{{ displayName }}</div>
            <div class="profile-summary__email">{{ email }}</div>

            <div class="profile-summary__chips">
              <v-chip size="small" class="profile-chip" variant="flat">{{ roleLabel }}</v-chip>
              <v-chip size="small" class="profile-chip profile-chip--accent" variant="flat">
                Profil complété à {{ profileCompletion }}%
              </v-chip>
            </div>
          </div>

          <div class="profile-metrics">
            <div class="profile-metric">
              <div class="profile-metric__label">Identité</div>
              <div class="profile-metric__value">{{ firstname || 'À compléter' }}</div>
            </div>
            <div class="profile-metric">
              <div class="profile-metric__label">Naissance</div>
              <div class="profile-metric__value">{{ birthdate || 'À compléter' }}</div>
            </div>
            <div class="profile-metric">
              <div class="profile-metric__label">Fonction</div>
              <div class="profile-metric__value">{{ jobTitle || 'À compléter' }}</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="profile-panel" elevation="6">
          <div class="profile-panel__header">
            <div>
              <div class="profile-panel__title">Informations du compte</div>
              <div class="profile-panel__subtitle">Modifiez ce qui décrit votre identité et votre contexte.</div>
            </div>
          </div>

          <v-row class="profile-form">
            <v-col cols="12">
              <div class="profile-section-title">Photo et identité</div>
            </v-col>

            <v-col cols="12">
              <div class="profile-photo">
                <v-avatar size="88" class="profile-photo__avatar">
                  <v-img v-if="profilePhotoPreview" :src="profilePhotoPreview" alt="Photo de profil" />
                  <v-icon v-else size="36">mdi-account</v-icon>
                </v-avatar>

                <div class="profile-photo__actions">
                  <v-file-input
                    label="Changer la photo"
                    accept="image/*"
                    variant="outlined"
                    hide-details
                    @update:modelValue="handleFileSelected"
                  />
                  <div class="profile-photo__hint">Format JPG/PNG, 300 Ko max.</div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="firstname" label="Prénom" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="email" label="Email" variant="outlined" readonly />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="birthdate" label="Date de naissance" type="date" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field :model-value="roleLabel" label="Rôle" variant="outlined" readonly />
            </v-col>

            <v-col cols="12">
              <div class="profile-section-title">Profil professionnel</div>
            </v-col>

            <v-col cols="12" md="6">
              <v-select v-model="profession" :items="professionOptions" label="Profession" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6" v-if="needsProfessionDetail">
              <v-text-field v-model="professionDetail" label="Précisez votre profession" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="jobTitle" :items="jobTitleOptions" label="Métier / Poste" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6" v-if="needsJobTitleDetail">
              <v-text-field v-model="jobTitleDetail" label="Précisez votre poste" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="sector" :items="sectorOptions" label="Secteur d’activité" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6" v-if="needsSectorDetail">
              <v-text-field v-model="sectorDetail" label="Précisez votre secteur" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="seniority" :items="seniorityOptions" label="Expérience" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="companySize" :items="companySizeOptions" label="Taille de l’entreprise" variant="outlined" />
            </v-col>

            <v-col cols="12">
              <div class="profile-section-title">Contexte personnel</div>
            </v-col>

            <v-col cols="12" md="6">
              <v-select v-model="revenue" :items="revenueOptions" label="Revenus" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="familyStatus" :items="familyOptions" label="Situation familiale" variant="outlined" />
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

          <div v-if="errorMessage" class="profile-message profile-message--error">{{ errorMessage }}</div>
          <div v-if="successMessage" class="profile-message profile-message--success">{{ successMessage }}</div>

          <div class="profile-actions">
            <v-btn class="profile-actions__save" size="large" :loading="loading" @click="submit">
              Enregistrer les informations
            </v-btn>
            <v-btn size="large" variant="text" @click="router.push(ROUTE_PATHS.preferences)">
              Aller aux préférences
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.profile-view {
  position: relative;
  min-height: 100vh;
  padding: 42px 16px 76px;
  background:
    linear-gradient(180deg, #f5f1e8 0%, #f0ece4 100%);
  overflow: hidden;
}

.profile-view__backdrop {
  position: absolute;
  inset: -12% -10% auto -10%;
  height: 48%;
  background:
    radial-gradient(circle at 12% 20%, rgba(245, 191, 71, 0.2), transparent 34%),
    radial-gradient(circle at 84% 8%, rgba(28, 124, 125, 0.22), transparent 32%),
    linear-gradient(120deg, rgba(19, 58, 59, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(10px);
}

.profile-view__hero,
.profile-view__grid {
  position: relative;
  z-index: 1;
}

.profile-hero {
  border-radius: 30px;
  padding: 26px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(255, 248, 239, 0.92));
  box-shadow: 0 24px 48px rgba(12, 31, 32, 0.12);
}

.profile-hero__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.profile-hero__copy {
  display: grid;
  gap: 10px;
}

.profile-hero__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-hero__logo {
  border-radius: 20px;
  background: #ffffff;
  padding: 8px;
  box-shadow: 0 16px 32px rgba(12, 31, 32, 0.12);
}

.profile-hero__brand-name,
.profile-panel__title,
.profile-section-title,
.profile-hero__title {
  font-family: 'Space Grotesk', sans-serif;
}

.profile-hero__brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #133a3b;
}

.profile-hero__eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.5);
}

.profile-hero__title {
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.profile-hero__subtitle {
  max-width: 720px;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
}

.profile-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.profile-hero__primary,
.profile-actions__save {
  text-transform: none;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #133a3b, #1c7c7d);
}

.profile-hero__secondary {
  text-transform: none;
  font-weight: 700;
  color: #133a3b;
  border-color: rgba(19, 58, 59, 0.16);
}

.profile-panel {
  border-radius: 28px;
  padding: 24px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 40px rgba(12, 31, 32, 0.1);
}

.profile-panel--summary {
  background:
    linear-gradient(165deg, rgba(19, 58, 59, 0.96), rgba(29, 103, 104, 0.94));
  color: #fff7ee;
}

.profile-summary {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 12px;
}

.profile-summary__avatar,
.profile-photo__avatar {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.26), transparent 50%),
    linear-gradient(135deg, #1c7c7d, #f5bf47);
  color: #fff8ef;
}

.profile-summary__name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.profile-summary__email {
  font-size: 14px;
  color: rgba(255, 247, 238, 0.72);
}

.profile-summary__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.profile-chip {
  background: rgba(255, 255, 255, 0.12);
  color: #fff8f0;
}

.profile-chip--accent {
  background: rgba(245, 191, 71, 0.2);
}

.profile-metrics {
  margin-top: 24px;
  display: grid;
  gap: 12px;
}

.profile-metric {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.profile-metric__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 247, 238, 0.52);
}

.profile-metric__value {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #fff8f0;
}

.profile-panel__header {
  margin-bottom: 10px;
}

.profile-panel__title {
  font-size: 24px;
  font-weight: 700;
  color: #133a3b;
}

.profile-panel__subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: rgba(19, 58, 59, 0.64);
}

.profile-form {
  row-gap: 8px;
}

.profile-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #133a3b;
  margin-bottom: 8px;
}

.profile-photo {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 16px;
}

.profile-photo__actions {
  display: grid;
  gap: 8px;
}

.profile-photo__hint {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.56);
}

.profile-message {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 14px;
}

.profile-message--error {
  background: rgba(185, 74, 47, 0.12);
  color: #9f3d25;
}

.profile-message--success {
  background: rgba(28, 124, 125, 0.12);
  color: #146a6a;
}

.profile-actions {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .profile-hero__content {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-hero__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .profile-photo {
    grid-template-columns: 1fr;
  }

  .profile-actions,
  .profile-hero__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

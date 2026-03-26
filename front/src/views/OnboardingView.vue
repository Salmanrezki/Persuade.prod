<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.png'
import { ROUTE_PATHS } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/services/userService'
import {
  availabilityOptions,
  companySizeOptions,
  discoveryOptions,
  expectationsOptions,
  familyOptions,
  jobTitleOptions,
  learningFormatOptions,
  professionOptions,
  revenueOptions,
  sectorOptions,
  seniorityOptions,
} from '@/data/profileOptions'
import { estimateDataUrlBytes, MAX_PROFILE_PHOTO_BYTES } from '@/utils/profile'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')

const profilePhoto = ref(null)
const profilePhotoPreview = ref('')
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
const expectations = ref([])
const expectationsDetail = ref('')
const primaryGoal = ref('')
const availability = ref('')
const learningFormat = ref('')

const needsProfessionDetail = computed(() => profession.value === 'Autre')
const needsSectorDetail = computed(() => sector.value === 'Autre')
const needsJobTitleDetail = computed(() => jobTitle.value === 'Autre')
const needsExpectationsDetail = computed(() => expectations.value.includes('Autre'))

const handleFileSelected = async (file) => {
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
  expectations.value = Array.isArray(data?.expectations) ? data.expectations : []
  expectationsDetail.value = data?.expectationsDetail || ''
  primaryGoal.value = data?.primaryGoal || ''
  availability.value = data?.availability || ''
  learningFormat.value = data?.learningFormat || ''
  profilePhotoPreview.value = data?.profilePhoto || ''
}

const submit = async () => {
  loading.value = true
  errorMessage.value = ''

  const payload = {
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
    expectations: expectations.value,
    expectationsDetail: expectationsDetail.value,
    primaryGoal: primaryGoal.value,
    availability: availability.value,
    learningFormat: learningFormat.value,
    hasOnboarded: true,
    onboardingCompletedAt: new Date().toISOString(),
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

    router.push(ROUTE_PATHS.home)
  } catch (error) {
    if (error?.response?.status === 413) {
      errorMessage.value = error?.response?.data?.message || 'Image trop lourde. Merci de choisir une photo plus légère.'
    } else {
      errorMessage.value = 'Impossible d’enregistrer le questionnaire.'
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
    errorMessage.value = 'Impossible de charger votre profil.'
    console.error(error)
  }
})
</script>

<template>
  <v-container class="onboarding-container" fluid>
    <div class="onboarding-backdrop" aria-hidden="true"></div>

    <v-row class="onboarding-hero" align="center" justify="center">
      <v-col cols="12" md="8">
        <v-card class="onboarding-hero-card" elevation="8">
          <div class="onboarding-hero-content">
            <div class="onboarding-brand">
              <v-img :src="logoUrl" alt="Logo Persuade" width="72" height="72" class="onboarding-logo" />
              <div class="onboarding-brand-text">Persuade</div>
            </div>
            <div class="onboarding-hero-title">Mon profil</div>
            <div class="onboarding-hero-subtitle">
              Ajoutez une photo et modifiez vos informations personnelles.
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="onboarding-grid" align="center" justify="center">
      <v-col cols="12" md="8">
        <v-card class="onboarding-card" elevation="6">
          <v-row class="onboarding-form">
            <v-col cols="12">
              <div class="onboarding-section-title">Photo de profil</div>
              <div class="onboarding-photo">
                <v-avatar size="96" class="onboarding-avatar">
                  <v-img v-if="profilePhotoPreview" :src="profilePhotoPreview" />
                  <v-icon v-else size="42">mdi-account</v-icon>
                </v-avatar>
                <div class="onboarding-photo-actions">
                  <v-file-input
                    label="Ajouter une photo"
                    accept="image/*"
                    variant="outlined"
                    hide-details
                    @update:modelValue="handleFileSelected"
                  />
                  <div class="onboarding-photo-hint">Format JPG/PNG, 300 Ko max.</div>
                </div>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="onboarding-section-title">Profil professionnel</div>
            </v-col>

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
            <v-col cols="12" md="6">
              <v-select v-model="revenue" :items="revenueOptions" label="Revenus" variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="familyStatus"
                :items="familyOptions"
                label="Situation familiale"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="discovery"
                :items="discoveryOptions"
                label="Comment avez-vous connu la plateforme ?"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <div class="onboarding-section-title">Objectifs</div>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="primaryGoal"
                :items="expectationsOptions"
                label="Objectif principal"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="expectations"
                :items="expectationsOptions"
                label="Ce que vous attendez de la plateforme"
                variant="outlined"
                multiple
                chips
              />
            </v-col>
            <v-col cols="12" v-if="needsExpectationsDetail">
              <v-textarea
                v-model="expectationsDetail"
                label="Autre attente (optionnel)"
                variant="outlined"
                rows="3"
              />
            </v-col>
            <v-col cols="12">
              <div class="onboarding-section-title">Habitudes d’apprentissage</div>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="availability"
                :items="availabilityOptions"
                label="Temps disponible"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="learningFormat"
                :items="learningFormatOptions"
                label="Format préféré"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <div v-if="errorMessage" class="onboarding-error">{{ errorMessage }}</div>

          <div class="onboarding-actions">
            <v-btn class="onboarding-submit" size="large" :loading="loading" @click="submit">
              Enregistrer mon profil
            </v-btn>
            <v-btn size="large" variant="text" @click="router.push(ROUTE_PATHS.home)">
              Retour
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.onboarding-container {
  position: relative;
  min-height: 100vh;
  padding: 40px 16px 72px;
  background: #f6f2ea;
  overflow: hidden;
}

.onboarding-backdrop {
  position: absolute;
  inset: -25% -15% auto -15%;
  height: 55%;
  background: radial-gradient(120% 120% at 10% 15%, rgba(22, 130, 132, 0.2), transparent 60%),
    radial-gradient(80% 80% at 85% 5%, rgba(245, 191, 71, 0.18), transparent 55%),
    linear-gradient(120deg, rgba(14, 82, 84, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
  z-index: 0;
}

.onboarding-hero,
.onboarding-grid {
  position: relative;
  z-index: 1;
}

.onboarding-hero-card {
  border-radius: 28px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.1);
  box-shadow: 0 20px 45px rgba(12, 31, 32, 0.16);
}

.onboarding-hero-content {
  display: grid;
  gap: 8px;
}

.onboarding-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
}

.onboarding-logo {
  border-radius: 20px;
  background: #fff;
  padding: 8px;
  box-shadow: 0 14px 26px rgba(12, 31, 32, 0.18);
}

.onboarding-brand-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #133a3b;
  letter-spacing: 0.02em;
}

.onboarding-hero-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 26px;
  font-weight: 700;
  color: #133a3b;
}

.onboarding-hero-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
}

.onboarding-card {
  border-radius: 24px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 18px 35px rgba(12, 31, 32, 0.12);
}

.onboarding-form {
  row-gap: 16px;
}

.onboarding-section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #133a3b;
  margin-bottom: 10px;
}

.onboarding-photo {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
}

.onboarding-avatar {
  background: rgba(19, 58, 59, 0.08);
  color: #133a3b;
}

.onboarding-photo-actions {
  display: grid;
  gap: 8px;
}

.onboarding-photo-hint {
  font-size: 12px;
  color: rgba(19, 58, 59, 0.6);
}

.onboarding-error {
  margin-top: 12px;
  font-size: 13px;
  color: #b94a2f;
}

.onboarding-submit {
  margin-top: 16px;
  text-transform: none;
  font-weight: 600;
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

.onboarding-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

@media (max-width: 760px) {
  .onboarding-photo {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoUrl from '@/assets/logo.png'
import { ROUTE_PATHS } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/services/userService'
import {
  availabilityOptions,
  expectationsOptions,
  learningFormatOptions,
} from '@/data/profileOptions'

const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const primaryGoal = ref('')
const expectations = ref([])
const expectationsDetail = ref('')
const availability = ref('')
const learningFormat = ref('')

const needsExpectationsDetail = computed(() => expectations.value.includes('Autre'))
const role = computed(() => auth.profile?.role || '')
const heroSubtitle = computed(() =>
  role.value === 'coach'
    ? 'Ajustez votre manière d’apprendre, de transmettre et de suivre vos temps forts.'
    : 'Ajustez votre rythme, vos attentes et le format qui vous aide vraiment à progresser.'
)
const summaryChips = computed(() =>
  [primaryGoal.value, learningFormat.value, availability.value].filter(Boolean)
)

const loadProfile = async () => {
  const data = auth.profile || (auth.user?.uid ? await getUserProfile(auth.user.uid) : null)

  primaryGoal.value = data?.primaryGoal || ''
  expectations.value = Array.isArray(data?.expectations) ? data.expectations : []
  expectationsDetail.value = data?.expectationsDetail || ''
  availability.value = data?.availability || ''
  learningFormat.value = data?.learningFormat || ''
}

const submit = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const payload = {
    primaryGoal: primaryGoal.value,
    expectations: expectations.value,
    expectationsDetail: expectationsDetail.value,
    availability: availability.value,
    learningFormat: learningFormat.value,
  }

  try {
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

    successMessage.value = 'Vos préférences ont été mises à jour.'
  } catch (error) {
    errorMessage.value = 'Impossible d’enregistrer vos préférences.'
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadProfile()
  } catch (error) {
    errorMessage.value = 'Impossible de charger vos préférences.'
    console.error(error)
  }
})
</script>

<template>
  <v-container class="preferences-view" fluid>
    <div class="preferences-view__backdrop" aria-hidden="true"></div>

    <v-row class="preferences-view__hero" justify="center">
      <v-col cols="12" md="10">
        <v-card class="preferences-hero" elevation="8">
          <div class="preferences-hero__content">
            <div class="preferences-hero__copy">
              <div class="preferences-hero__brand">
                <v-img :src="logoUrl" alt="Logo Persuade" width="68" height="68" class="preferences-hero__logo" />
                <div>
                  <div class="preferences-hero__brand-name">Persuade</div>
                  <div class="preferences-hero__eyebrow">Parcours personnalisé</div>
                </div>
              </div>

              <div class="preferences-hero__title">Gérer mes préférences</div>
              <div class="preferences-hero__subtitle">{{ heroSubtitle }}</div>

              <div class="preferences-hero__chips" v-if="summaryChips.length">
                <v-chip v-for="chip in summaryChips" :key="chip" size="small" class="preferences-chip" variant="flat">
                  {{ chip }}
                </v-chip>
              </div>
            </div>

            <div class="preferences-hero__actions">
              <v-btn class="preferences-hero__primary" size="large" :loading="loading" @click="submit">
                Enregistrer
              </v-btn>
              <v-btn class="preferences-hero__secondary" size="large" variant="outlined" @click="router.push(ROUTE_PATHS.profile)">
                Voir mes informations
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="preferences-view__grid" justify="center">
      <v-col cols="12" md="4">
        <v-card class="preferences-panel preferences-panel--spotlight" elevation="6">
          <div class="preferences-spotlight__eyebrow">Réglages utiles</div>
          <div class="preferences-spotlight__title">Votre expérience d’apprentissage</div>
          <div class="preferences-spotlight__text">
            Ces préférences aident à garder un parcours cohérent avec votre objectif, votre disponibilité et le format qui vous convient.
          </div>

          <div class="preferences-spotlight__items">
            <div class="preferences-spotlight__item">
              <div class="preferences-spotlight__label">Objectif</div>
              <div class="preferences-spotlight__value">{{ primaryGoal || 'Choisissez un cap principal' }}</div>
            </div>
            <div class="preferences-spotlight__item">
              <div class="preferences-spotlight__label">Rythme</div>
              <div class="preferences-spotlight__value">{{ availability || 'Définissez votre temps disponible' }}</div>
            </div>
            <div class="preferences-spotlight__item">
              <div class="preferences-spotlight__label">Format</div>
              <div class="preferences-spotlight__value">{{ learningFormat || 'Précisez votre format préféré' }}</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="preferences-panel" elevation="6">
          <div class="preferences-panel__header">
            <div class="preferences-panel__title">Préférences d’apprentissage</div>
            <div class="preferences-panel__subtitle">
              Indiquez ce que vous attendez réellement de la plateforme pour mieux structurer votre parcours.
            </div>
          </div>

          <v-row class="preferences-form">
            <v-col cols="12">
              <div class="preferences-section-title">Objectifs</div>
            </v-col>

            <v-col cols="12">
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
                label="Ce que j’attends de la plateforme"
                variant="outlined"
                multiple
                chips
              />
            </v-col>
            <v-col cols="12" v-if="needsExpectationsDetail">
              <v-textarea
                v-model="expectationsDetail"
                label="Précisez votre attente"
                variant="outlined"
                rows="3"
              />
            </v-col>

            <v-col cols="12">
              <div class="preferences-section-title">Rythme et format</div>
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

          <div v-if="errorMessage" class="preferences-message preferences-message--error">{{ errorMessage }}</div>
          <div v-if="successMessage" class="preferences-message preferences-message--success">{{ successMessage }}</div>

          <div class="preferences-actions">
            <v-btn class="preferences-actions__save" size="large" :loading="loading" @click="submit">
              Enregistrer mes préférences
            </v-btn>
            <v-btn size="large" variant="text" @click="router.push(ROUTE_PATHS.profile)">
              Retour au profil
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.preferences-view {
  position: relative;
  min-height: 100vh;
  padding: 42px 16px 76px;
  background: linear-gradient(180deg, #f4efe6 0%, #efe9df 100%);
  overflow: hidden;
}

.preferences-view__backdrop {
  position: absolute;
  inset: -15% -12% auto -12%;
  height: 52%;
  background:
    radial-gradient(circle at 14% 20%, rgba(240, 90, 40, 0.18), transparent 32%),
    radial-gradient(circle at 88% 10%, rgba(245, 191, 71, 0.22), transparent 34%),
    linear-gradient(130deg, rgba(19, 58, 59, 0.08), rgba(245, 191, 71, 0.08));
  filter: blur(12px);
}

.preferences-view__hero,
.preferences-view__grid {
  position: relative;
  z-index: 1;
}

.preferences-hero,
.preferences-panel {
  border-radius: 28px;
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: 0 22px 42px rgba(12, 31, 32, 0.1);
}

.preferences-hero {
  padding: 26px;
  background:
    linear-gradient(140deg, rgba(255, 252, 247, 0.96), rgba(255, 246, 234, 0.92));
}

.preferences-hero__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.preferences-hero__copy {
  display: grid;
  gap: 10px;
}

.preferences-hero__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.preferences-hero__logo {
  border-radius: 20px;
  background: #ffffff;
  padding: 8px;
  box-shadow: 0 16px 30px rgba(12, 31, 32, 0.12);
}

.preferences-hero__brand-name,
.preferences-panel__title,
.preferences-section-title,
.preferences-hero__title,
.preferences-spotlight__title {
  font-family: 'Space Grotesk', sans-serif;
}

.preferences-hero__brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #133a3b;
}

.preferences-hero__eyebrow {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.5);
}

.preferences-hero__title {
  font-size: 30px;
  font-weight: 700;
  color: #133a3b;
}

.preferences-hero__subtitle {
  max-width: 720px;
  font-size: 15px;
  color: rgba(19, 58, 59, 0.7);
}

.preferences-hero__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preferences-chip {
  background: rgba(240, 90, 40, 0.12);
  color: #9b3c20;
}

.preferences-hero__actions,
.preferences-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preferences-hero__actions {
  justify-content: flex-end;
}

.preferences-hero__primary,
.preferences-actions__save {
  text-transform: none;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #f05a28, #f5bf47);
}

.preferences-hero__secondary {
  text-transform: none;
  font-weight: 700;
  color: #133a3b;
  border-color: rgba(19, 58, 59, 0.16);
}

.preferences-panel {
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
}

.preferences-panel--spotlight {
  background:
    linear-gradient(165deg, rgba(255, 247, 237, 0.98), rgba(255, 238, 218, 0.96));
}

.preferences-spotlight__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(155, 60, 32, 0.58);
}

.preferences-spotlight__title {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 700;
  color: #8f381f;
}

.preferences-spotlight__text {
  margin-top: 10px;
  font-size: 14px;
  color: rgba(82, 43, 29, 0.72);
  line-height: 1.6;
}

.preferences-spotlight__items {
  margin-top: 22px;
  display: grid;
  gap: 12px;
}

.preferences-spotlight__item {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(240, 90, 40, 0.08);
}

.preferences-spotlight__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(143, 56, 31, 0.56);
}

.preferences-spotlight__value {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #7f331c;
}

.preferences-panel__header {
  margin-bottom: 12px;
}

.preferences-panel__title {
  font-size: 24px;
  font-weight: 700;
  color: #133a3b;
}

.preferences-panel__subtitle {
  margin-top: 6px;
  font-size: 14px;
  color: rgba(19, 58, 59, 0.64);
}

.preferences-form {
  row-gap: 8px;
}

.preferences-section-title {
  font-size: 16px;
  font-weight: 700;
  color: #133a3b;
  margin-bottom: 8px;
}

.preferences-message {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 14px;
}

.preferences-message--error {
  background: rgba(185, 74, 47, 0.12);
  color: #9f3d25;
}

.preferences-message--success {
  background: rgba(28, 124, 125, 0.12);
  color: #146a6a;
}

.preferences-actions {
  margin-top: 20px;
  justify-content: flex-end;
}

@media (max-width: 960px) {
  .preferences-hero__content {
    flex-direction: column;
    align-items: flex-start;
  }

  .preferences-hero__actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .preferences-hero__actions,
  .preferences-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import { useAuthStore } from '@/stores/auth'
import { getUserProfile, updateUserProfile } from '@/services/userService'
import {
  availabilityOptions,
  expectationsOptions,
  learningFormatOptions,
} from '@/data/profileOptions'

const auth = useAuthStore()

const loading = ref(false)
const fetching = ref(true)
const loadFailed = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const primaryGoal = ref('')
const expectations = ref([])
const expectationsDetail = ref('')
const availability = ref('')
const learningFormat = ref('')

const needsExpectationsDetail = computed(() =>
  expectations.value.includes('Autre'),
)

const loadProfile = async () => {
  const data =
    auth.profile ||
    (auth.user?.uid ? await getUserProfile(auth.user.uid) : null)

  primaryGoal.value = data?.primaryGoal || ''
  expectations.value = Array.isArray(data?.expectations)
    ? data.expectations
    : []
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

    const updatedProfile = await updateUserProfile(auth.user.uid, payload)

    auth.setProfile({
      ...(auth.profile || {}),
      ...(updatedProfile || {}),
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

const initialize = async () => {
  fetching.value = true
  loadFailed.value = false
  errorMessage.value = ''
  try {
    await loadProfile()
  } catch (error) {
    loadFailed.value = true
    errorMessage.value = 'Impossible de charger vos préférences.'
    console.error(error)
  } finally {
    fetching.value = false
  }
}
onMounted(initialize)
</script>
<template>
  <main class="learner-account preferences-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">ESPACE APPRENANT · MON COMPTE</span>
        <h1>Organiser mon apprentissage</h1>
        <p>
          Ajustez vos objectifs, votre rythme et les formats qui vous aident à
          progresser.
        </p>
      </div>
      <v-btn
        :to="ROUTE_PATHS.profile"
        variant="outlined"
        prepend-icon="mdi-account-outline"
        color="#24443f"
        >Mon profil</v-btn
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
                ><v-icon size="22">mdi-target</v-icon></span
              >
              <div>
                <span class="section-step">01 · VOS ATTENTES</span>
                <h2>Objectifs d’apprentissage</h2>
              </div>
            </div>
            <v-row>
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
                  closable-chips
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
            </v-row>
          </section>
          <section class="panel">
            <div class="section-title">
              <span class="section-icon"
                ><v-icon size="22">mdi-calendar-clock-outline</v-icon></span
              >
              <div>
                <span class="section-step">02 · VOTRE ORGANISATION</span>
                <h2>Rythme et format</h2>
              </div>
            </div>
            <v-row>
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
              >Enregistrer mes préférences</v-btn
            >
          </div>
        </div>
        <aside class="panel preview" aria-label="Résumé des préférences">
          <div class="preview-heading">
            <v-icon size="18">mdi-calendar-check-outline</v-icon>
            <h2>Votre organisation</h2>
            <span>En direct</span>
          </div>
          <p class="hint">Un aperçu de vos préférences au fil de la saisie.</p>
          <dl class="preference-facts">
            <div>
              <dt>Objectif principal</dt>
              <dd>{{ primaryGoal || 'Choisissez un cap principal' }}</dd>
            </div>
            <div>
              <dt>Temps disponible</dt>
              <dd>{{ availability || 'À renseigner' }}</dd>
            </div>
            <div>
              <dt>Format préféré</dt>
              <dd>{{ learningFormat || 'À renseigner' }}</dd>
            </div>
          </dl>
          <div class="week-summary">
            <span class="section-step">VOS ATTENTES</span>
            <div v-if="expectations.length" class="summary-tags">
              <v-chip
                v-for="expectation in expectations"
                :key="expectation"
                size="small"
                >{{ expectation }}</v-chip
              >
            </div>
            <p v-else class="summary-empty">
              Précisez ce que vous attendez de votre parcours.
            </p>
            <p
              v-if="needsExpectationsDetail && expectationsDetail"
              class="hint expectation-detail"
            >
              {{ expectationsDetail }}
            </p>
          </div>
        </aside>
      </div></v-form
    >
  </main>
</template>
<style scoped src="@/assets/learner-account.css"></style>

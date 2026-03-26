<template>
  <v-container class="auth-container fill-height" fluid>
    <div class="auth-backdrop" aria-hidden="true"></div>

    <v-row class="auth-header" align="center" justify="center">
      <v-col cols="12" class="d-flex flex-column align-center">
        <v-img
          :src="logoUrl"
          alt="Logo Persuade"
          width="120"
          height="120"
          class="auth-logo"
        />
        <div class="auth-title">Persuade</div>
        <div class="auth-subtitle">Connectez-vous ou créez votre compte</div>
      </v-col>
    </v-row>

    <v-row class="auth-grid" align="center" justify="center">
      <!-- LOGIN -->
      <v-col cols="12" md="5">
        <v-card class="auth-card">
          <v-card-item>
            <div class="auth-card-title">Connexion</div>
            <div class="auth-card-subtitle">Accédez à votre espace personnel</div>
          </v-card-item>

          <v-card-text class="auth-card-body">
            <v-alert
              v-if="loginError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="auth-alert"
            >
              {{ loginError }}
            </v-alert>

            <v-text-field
              v-model="loginEmail"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              density="comfortable"
              required
            />

            <v-text-field
              v-model="loginPassword"
              label="Mot de passe"
              type="password"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
              density="comfortable"
              required
            />
          </v-card-text>

          <v-card-actions class="auth-card-actions">
            <v-btn block class="auth-btn auth-btn-primary" size="large" @click="login">
              Se connecter
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- REGISTER -->
      <v-col cols="12" md="5">
        <v-card class="auth-card">
          <v-card-item>
            <div class="auth-card-title">Inscription</div>
            <div class="auth-card-subtitle">Rejoignez la communauté en 1 minute</div>
          </v-card-item>

          <v-card-text class="auth-card-body">
            <v-alert
              v-if="registerError"
              type="error"
              variant="tonal"
              density="comfortable"
              class="auth-alert"
            >
              {{ registerError }}
            </v-alert>

            <v-text-field
              v-model="registerFirstname"
              label="Prénom"
              prepend-inner-icon="mdi-account-outline"
              variant="outlined"
              density="comfortable"
              required
            />

            <v-text-field
              v-model="registerEmail"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              density="comfortable"
              required
            />

            <v-text-field
              v-model="registerPassword"
              label="Mot de passe"
              type="password"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
              density="comfortable"
              required
            />

            <v-text-field
              v-model="registerBirthdate"
              label="Date de naissance"
              type="date"
              prepend-inner-icon="mdi-cake-variant-outline"
              variant="outlined"
              density="comfortable"
              required
            />

            <v-select
              v-model="registerRole"
              :items="roleOptions"
              label="Rôle"
              prepend-inner-icon="mdi-account-badge-outline"
              variant="outlined"
              density="comfortable"
              required
            />

          </v-card-text>

          <v-card-actions class="auth-card-actions">
            <v-btn block class="auth-btn auth-btn-secondary" size="large" @click="register">
              S’inscrire
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import logoUrl from '@/assets/logo.png'

const router = useRouter()
const auth = useAuthStore()

// LOGIN
const loginEmail = ref('')
const loginPassword = ref('')
const loginError = ref('')

// REGISTER
const registerFirstname = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerBirthdate = ref('')
const registerRole = ref('apprenant')
const registerError = ref('')

const roleOptions = [
  { title: 'Apprenant', value: 'apprenant' },
  { title: 'Coach', value: 'coach', props: { disabled: true } },
]

const authErrorMessages = {
  'auth/email-already-in-use': 'Cet email est deja utilise.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'L email saisi est invalide.',
  'auth/missing-password': 'Le mot de passe est requis.',
  'auth/too-many-requests': 'Trop de tentatives. Reessaie dans quelques minutes.',
  'auth/weak-password': 'Le mot de passe doit etre plus robuste.',
}

const getAuthErrorMessage = (error) =>
  authErrorMessages[error?.code] || 'Une erreur est survenue. Reessaie.'

const login = async () => {
  loginError.value = ''

  try {
    await auth.login(loginEmail.value, loginPassword.value)
    router.push(ROUTE_PATHS.home)
  } catch (error) {
    loginError.value = getAuthErrorMessage(error)
  }
}

const register = async () => {
  registerError.value = ''

  try {
    await auth.register(
      registerEmail.value,
      registerPassword.value,
      registerFirstname.value,
      registerBirthdate.value,
      registerRole.value
    )
    router.push(ROUTE_PATHS.home)
  } catch (error) {
    registerError.value = getAuthErrorMessage(error)
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.auth-container {
  position: relative;
  min-height: 100vh;
  padding: 32px 16px 64px;
  background:
    radial-gradient(circle at top left, rgba(47, 154, 123, 0.18), transparent 32%),
    radial-gradient(circle at top right, rgba(243, 177, 63, 0.16), transparent 28%),
    linear-gradient(145deg, #0d1f24 0%, #133a3b 48%, #1b4f51 100%);
  overflow: hidden;
}

.auth-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(65% 55% at 18% 16%, rgba(67, 196, 175, 0.18), transparent 70%),
    radial-gradient(42% 36% at 82% 14%, rgba(245, 191, 71, 0.16), transparent 72%),
    radial-gradient(55% 48% at 50% 100%, rgba(255, 255, 255, 0.06), transparent 78%);
  filter: blur(18px);
  opacity: 0.95;
  z-index: 0;
}

.auth-header,
.auth-grid {
  position: relative;
  z-index: 1;
}

.auth-logo {
  border-radius: 24px;
  background: #fff;
  padding: 12px;
  box-shadow: none;
}

.auth-title {
  margin-top: 16px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f8fbfb;
}

.auth-subtitle {
  margin-top: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px;
  color: rgba(248, 251, 251, 0.82);
}

.auth-grid {
  margin-top: 28px;
  gap: 24px;
}

.auth-card {
  border-radius: 24px;
  padding: 6px 6px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(19, 58, 59, 0.08);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.auth-card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #133a3b;
}

.auth-card-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: rgba(19, 58, 59, 0.65);
  margin-top: 4px;
}

.auth-card-body {
  display: grid;
  gap: 16px;
  padding-top: 8px;
}

.auth-alert {
  margin-bottom: 4px;
}

.auth-card-actions {
  padding: 0 16px 16px;
}

.auth-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: none !important;
}

.auth-btn-primary {
  background: linear-gradient(120deg, #1c7c7d, #2d9a7b);
  color: #fff;
}

.auth-btn-secondary {
  background: linear-gradient(120deg, #f3b13f, #f07c2f);
  color: #2b1906;
}

@media (max-width: 960px) {
  .auth-grid {
    margin-top: 20px;
  }
}
</style>

<template>
  <v-container fluid class="auth-page pa-4 pa-sm-6">
    <v-container class="auth-frame pa-0">
      <MarketingNavbar class="mb-8" :nav-items="navItems" cta-label="Accueil" :cta-to="ROUTE_PATHS.landing" />

      <v-row justify="center" class="fill-height align-center">
        <v-col cols="12" sm="10" md="8" lg="5" xl="4">
          <v-card class="auth-card" rounded="xl" elevation="0">
            <v-card-text class="pa-6 pa-sm-8">
              <div class="text-center mb-6">
                <h1 class="auth-title mb-2">
                  {{ isRegisterMode ? 'Inscription' : 'Connexion' }}
                </h1>
              </div>

              <v-btn-toggle
                v-model="activeMode"
                mandatory
                divided
                variant="outlined"
                class="auth-toggle mb-6"
              >
                <v-btn value="login" class="auth-toggle__button">J'ai deja un compte</v-btn>
                <v-btn value="register" class="auth-toggle__button">Creer un compte</v-btn>
              </v-btn-toggle>

              <v-alert
                v-if="activeError"
                type="error"
                variant="tonal"
                density="comfortable"
                class="mb-4"
              >
                {{ activeError }}
              </v-alert>

              <v-form v-if="!isRegisterMode" @submit.prevent="login">
                <v-text-field
                  v-model="loginEmail"
                  label="Email"
                  type="email"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  autocomplete="email"
                  required
                />

                <v-text-field
                  v-model="loginPassword"
                  label="Mot de passe"
                  :type="showLoginPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showLoginPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="outlined"
                  density="comfortable"
                  class="mb-6"
                  hide-details="auto"
                  autocomplete="current-password"
                  required
                  @click:append-inner="showLoginPassword = !showLoginPassword"
                />

                <v-btn
                  type="submit"
                  block
                  size="large"
                  class="auth-submit"
                  :loading="isLoggingIn"
                  :disabled="isLoggingIn"
                >
                  Se connecter
                </v-btn>

                <div v-if="isLoggingIn" class="auth-loading-hint" aria-live="polite">
                  <v-progress-circular indeterminate size="18" width="2" color="#234744" />
                  <span>Connexion en cours...</span>
                </div>
              </v-form>

              <v-form v-else @submit.prevent="register">
                <v-text-field
                  v-model="registerFirstname"
                  label="Prenom"
                  prepend-inner-icon="mdi-account-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  autocomplete="given-name"
                  required
                />

                <v-text-field
                  v-model="registerEmail"
                  label="Email"
                  type="email"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  autocomplete="email"
                  required
                />

                <v-text-field
                  v-model="registerPassword"
                  label="Mot de passe"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showRegisterPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  autocomplete="new-password"
                  required
                  @click:append-inner="showRegisterPassword = !showRegisterPassword"
                />

                <v-text-field
                  v-model="registerBirthdate"
                  label="Date de naissance"
                  type="date"
                  prepend-inner-icon="mdi-cake-variant-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-3"
                  hide-details="auto"
                  required
                />

                <v-select
                  v-model="registerRole"
                  :items="roleOptions"
                  label="Role"
                  prepend-inner-icon="mdi-account-badge-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-6"
                  hide-details="auto"
                  required
                />

                <v-text-field
                  v-model="registerReferralCode"
                  label="Code de parrainage (optionnel)"
                  prepend-inner-icon="mdi-gift-outline"
                  variant="outlined"
                  density="comfortable"
                  class="mb-6"
                  hide-details="auto"
                />

                <v-btn
                  type="submit"
                  block
                  size="large"
                  class="auth-submit"
                  :loading="isRegistering"
                >
                  Creer mon compte
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATHS } from '@/router/paths'
import MarketingNavbar from '@/components/MarketingNavbar.vue'

const router = useRouter()
const auth = useAuthStore()

const activeMode = ref('login')
const navItems = [
  { label: 'Vision', href: `${ROUTE_PATHS.landing}#vision` },
  { label: 'Fonctionnalites', href: `${ROUTE_PATHS.landing}#fonctionnalites` },
  { label: 'Apercu', href: `${ROUTE_PATHS.landing}#preview` },
  { label: 'Equipe', href: `${ROUTE_PATHS.landing}#equipe` },
  { label: 'Contact', href: `${ROUTE_PATHS.landing}#contact` },
]

const loginEmail = ref('')
const loginPassword = ref('')
const loginError = ref('')
const showLoginPassword = ref(false)
const isLoggingIn = ref(false)

const registerFirstname = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerBirthdate = ref('')
const registerRole = ref('apprenant')
const registerReferralCode = ref('')
const registerError = ref('')
const showRegisterPassword = ref(false)
const isRegistering = ref(false)

const roleOptions = [
  { title: 'Apprenant', value: 'apprenant' },
  { title: 'Coach', value: 'coach' },
]

const isRegisterMode = computed(() => activeMode.value === 'register')
const activeError = computed(() => (isRegisterMode.value ? registerError.value : loginError.value))

const authErrorMessages = {
  'auth/email-already-in-use': 'Cet email est deja utilise.',
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'L email saisi est invalide.',
  'auth/missing-password': 'Le mot de passe est requis.',
  'auth/too-many-requests': 'Trop de tentatives. Reessaie dans quelques minutes.',
  'auth/weak-password': 'Le mot de passe doit etre plus robuste.',
  'referral/invalid-code': 'Ce code de parrainage est invalide.',
}

const getAuthErrorMessage = (error) =>
  authErrorMessages[error?.code] || 'Une erreur est survenue. Reessaie.'

watch(activeMode, () => {
  loginError.value = ''
  registerError.value = ''
})

const login = async () => {
  loginError.value = ''
  isLoggingIn.value = true

  try {
    await auth.login(loginEmail.value, loginPassword.value)
    await router.push(ROUTE_PATHS.home)
  } catch (error) {
    loginError.value = getAuthErrorMessage(error)
  } finally {
    isLoggingIn.value = false
  }
}

const register = async () => {
  registerError.value = ''
  isRegistering.value = true

  try {
    await auth.register(
      registerEmail.value,
      registerPassword.value,
      registerFirstname.value,
      registerBirthdate.value,
      registerRole.value,
      registerReferralCode.value
    )
    await router.push(ROUTE_PATHS.home)
  } catch (error) {
    registerError.value = getAuthErrorMessage(error)
  } finally {
    isRegistering.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 10%, rgba(35, 71, 68, 0.1), transparent 24%),
    radial-gradient(circle at 82% 14%, rgba(181, 93, 63, 0.1), transparent 22%),
    linear-gradient(180deg, #ffffff 0%, #fffaf5 54%, #ffffff 100%);
}

.auth-frame {
  max-width: 1160px;
}

.auth-card {
  border: 1px solid rgba(35, 71, 68, 0.12);
  background: #ffffff;
  backdrop-filter: blur(14px);
  box-shadow: 0 24px 56px rgba(35, 71, 68, 0.08);
}

.auth-title {
  color: #234744;
  font-size: clamp(1.9rem, 4vw, 2.4rem);
  line-height: 1;
}

.auth-subtitle {
  color: rgba(35, 71, 68, 0.68);
  line-height: 1.6;
}

.auth-toggle {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-radius: 16px;
  overflow: hidden;
}

.auth-toggle :deep(.v-btn) {
  flex: 1 1 50%;
}

.auth-toggle__button {
  min-height: 3rem;
  text-transform: none;
  font-weight: 600;
}

:deep(.auth-toggle .v-btn) {
  color: #234744;
  background: #ffffff;
}

:deep(.auth-toggle .v-btn--active) {
  color: #fffdf8;
  background: linear-gradient(135deg, #b55d3f, #c97958);
}

.auth-submit {
  min-height: 3.2rem;
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.01em;
  border-radius: 16px;
  background: linear-gradient(135deg, #234744, #2f5a56);
  color: #fffaf4;
  box-shadow: none;
}

.auth-loading-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  margin-top: 0.9rem;
  color: rgba(35, 71, 68, 0.78);
  font-size: 0.95rem;
  font-weight: 500;
}

:deep(.v-field) {
  border-radius: 16px;
}

:deep(.v-field--variant-outlined .v-field__outline) {
  color: rgba(35, 71, 68, 0.18);
}

:deep(.v-label.v-field-label) {
  color: rgba(35, 71, 68, 0.62);
}

</style>

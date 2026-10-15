<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import PasswordResetButton from '@/components/PasswordResetButton.vue'
import {
  verifyEmail,
  refreshAccount,
  correctEmail,
  securityError,
} from '@/services/accountSecurityService'
const auth = useAuthStore()
const account = ref(null),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  editing = ref(false),
  address = ref(''),
  password = ref('')
async function refresh() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await refreshAccount()
    account.value = (await api.get('/users/security')).data
    auth.emailVerified = account.value.emailVerified
    auth.setProfile({ ...auth.profile, email: account.value.email })
  } catch (err) {
    error.value = securityError(err)
  } finally {
    busy.value = false
  }
}
async function send() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await verifyEmail()
    message.value =
      'Lien de vérification envoyé. Après avoir ouvert le lien, cliquez sur « Actualiser ».'
  } catch (err) {
    error.value = securityError(err)
  } finally {
    busy.value = false
  }
}
async function change() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await correctEmail(address.value, password.value)
    message.value =
      'Un lien a été envoyé à la nouvelle adresse. Le changement prendra effet après sa confirmation.'
    editing.value = false
  } catch (err) {
    error.value = securityError(err)
  } finally {
    busy.value = false
    password.value = ''
  }
}
onMounted(refresh)
</script>
<template>
  <section class="security-panel" aria-label="Sécurité du compte">
    <div class="heading">
      <h2>Connexion et sécurité</h2>
      <v-btn variant="text" :loading="busy" @click="refresh">Actualiser</v-btn>
    </div>
    <v-progress-linear v-if="busy && !account" indeterminate /><template
      v-if="account"
      ><p>
        {{ account.email || 'Aucune adresse e-mail' }}
        <span class="status">{{
          account.emailVerified ? 'Adresse vérifiée' : 'Adresse à vérifier'
        }}</span>
      </p>
      <p class="help">
        Vérifiez que cette adresse vous appartient : elle sert à récupérer
        l’accès à votre compte.
      </p>
      <div class="actions">
        <v-btn
          v-if="!account.emailVerified"
          color="#24443f"
          :disabled="busy"
          @click="send"
          >Vérifier mon adresse</v-btn
        ><PasswordResetButton
          :email="account.email"
          label="Réinitialiser mon mot de passe"
        /><v-btn
          v-if="account.passwordEnabled"
          variant="text"
          :disabled="busy"
          @click="editing = !editing"
          >Corriger mon adresse</v-btn
        >
      </div></template
    ><v-alert v-if="message" type="success" variant="tonal" class="mt-4">{{
      message
    }}</v-alert
    ><v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{
      error
    }}</v-alert>
    <form v-if="editing" class="mt-5" @submit.prevent="change">
      <v-text-field
        v-model="address"
        type="email"
        label="Nouvelle adresse e-mail"
        variant="outlined"
        required
        autocomplete="email"
      /><v-text-field
        v-model="password"
        type="password"
        label="Mot de passe actuel"
        autocomplete="current-password"
        variant="outlined"
        required
      /><v-btn type="submit" color="#24443f" :loading="busy"
        >Confirmer la nouvelle adresse</v-btn
      >
    </form>
  </section>
</template>
<style scoped>
.security-panel {
  max-width: 1152px;
  margin: 24px auto 0;
  padding: 24px;
  border: 1px solid #24443f20;
  border-radius: 16px;
  background: #fffdf8;
  color: #24443f;
}
.heading,
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.heading {
  justify-content: space-between;
  margin-bottom: 16px;
}
h2 {
  font-size: 18px;
}
.status {
  display: inline-block;
  padding: 4px 10px;
  background: #edf0e9;
  border-radius: 20px;
  font-size: 12px;
  margin-left: 8px;
}
.help {
  margin: 12px 0 20px;
  font-size: 14px;
  color: #68736c;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
@media (max-width: 1200px) {
  .security-panel {
    margin-inline: 24px;
  }
}
@media (max-width: 600px) {
  .security-panel {
    margin-inline: 16px;
    padding: 20px;
  }
}
</style>

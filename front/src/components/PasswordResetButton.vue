<script setup>
import { ref } from 'vue'
import { resetPassword, securityError } from '@/services/accountSecurityService'
const props = defineProps({
  email: { type: String, default: '' },
  label: { type: String, default: 'Mot de passe oublié ?' },
})
const dialog = ref(false),
  address = ref(''),
  busy = ref(false),
  error = ref(''),
  success = ref(false)
function open() {
  address.value = props.email
  error.value = ''
  success.value = false
  dialog.value = true
}
async function submit() {
  busy.value = true
  error.value = ''
  try {
    await resetPassword(address.value)
    success.value = true
  } catch (err) {
    error.value = securityError(err)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <v-btn variant="text" color="#24443f" class="reset-button" @click="open">{{
    label
  }}</v-btn>
  <v-dialog v-model="dialog" max-width="500" :persistent="busy"
    ><v-card class="reset-card"
      ><h2>Réinitialiser mon mot de passe</h2>
      <p>Recevez un lien pour choisir un nouveau mot de passe.</p>
      <v-alert v-if="success" type="success" variant="tonal"
        >Si un compte correspond à cette adresse, un e-mail de réinitialisation
        a été envoyé. Consultez aussi vos courriers indésirables.</v-alert
      >
      <form v-else @submit.prevent="submit">
        <v-text-field
          v-model="address"
          type="email"
          label="Adresse e-mail du compte"
          autocomplete="email"
          variant="outlined"
          required
          maxlength="254"
        /><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{
          error
        }}</v-alert
        ><v-btn type="submit" color="#24443f" :loading="busy"
          >Recevoir le lien</v-btn
        >
      </form>
      <v-btn
        class="mt-4"
        variant="text"
        :disabled="busy"
        @click="dialog = false"
        >Fermer</v-btn
      ></v-card
    ></v-dialog
  >
</template>
<style scoped>
.reset-card {
  padding: 28px;
  background: #fffdf8;
  color: #24443f;
}
.reset-card h2 {
  font-size: 20px;
}
.reset-card p {
  margin: 14px 0 24px;
  color: #68736c;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
</style>

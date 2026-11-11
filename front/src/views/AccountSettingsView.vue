<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth as firebaseAuth } from '@/services/firebase'
import { useAuthStore } from '@/stores/auth'
import { isCoachProfile } from '@/utils/profile'
import { stopUserPresence, startUserPresence } from '@/services/presenceService'
import { securityError } from '@/services/accountSecurityService'
import api from '@/services/api'
import { ROUTE_PATHS } from '@/router/paths'
import AccountSecurityPanel from '@/components/AccountSecurityPanel.vue'
const auth = useAuthStore(),
  router = useRouter()
const dialog = ref(false),
  password = ref(''),
  confirmation = ref(''),
  busy = ref(false),
  error = ref('')
const coach = computed(() => isCoachProfile(auth.profile))
function openDeletion() {
  password.value = ''
  confirmation.value = ''
  error.value = ''
  dialog.value = true
}
async function removeAccount() {
  const user = firebaseAuth.currentUser
  if (!user?.email || confirmation.value !== 'SUPPRIMER' || !password.value)
    return
  busy.value = true
  error.value = ''
  let presenceStopped = false,
    deleted = false
  try {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password.value),
    )
    await user.getIdToken(true)
    await stopUserPresence()
    presenceStopped = true
    await api.delete('/account-settings/me', {
      data: { confirmation: confirmation.value },
    })
    deleted = true
    for (const prefix of [
      'persuade.viewed-courses.v2',
      'persuade.exercise-progress.v2',
    ]) {
      try {
        window.localStorage.removeItem(`${prefix}.${user.uid}`)
      } catch {
        /* storage may be unavailable */
      }
    }
    await auth.logout()
    await router.replace(ROUTE_PATHS.login)
  } catch (err) {
    if (deleted) {
      error.value =
        'Le compte a été supprimé. Fermez cette session pour revenir à la connexion.'
    } else {
      error.value = err.response?.data?.message || securityError(err)
      if (presenceStopped) await startUserPresence(user.uid)
    }
  } finally {
    password.value = ''
    busy.value = false
  }
}
</script>
<template>
  <main class="settings-view">
    <header>
      <h1>Gérer mon compte</h1>
      <p>Gérez votre connexion, la sécurité et les données de votre compte.</p>
    </header>
    <AccountSecurityPanel :key="auth.user?.uid" />
    <section class="settings-panel">
      <h2>Personnaliser mon espace</h2>
      <p>Retrouvez vos informations et vos préférences d’accompagnement.</p>
      <div class="actions">
        <v-btn
          variant="outlined"
          :to="ROUTE_PATHS.profile"
          prepend-icon="mdi-account-outline"
          >Mon profil</v-btn
        ><v-btn
          variant="outlined"
          :to="ROUTE_PATHS.preferences"
          prepend-icon="mdi-tune-variant"
          >Mes préférences</v-btn
        >
      </div>
    </section>
    <section class="settings-panel deletion-panel">
      <h2>Supprimer mon compte</h2>
      <p>
        Cette action est définitive. Votre profil, votre progression, vos
        résultats d’exercices, vos suivis et vos rendez-vous seront supprimés.
        Les conversations auxquelles vous participez seront également supprimées
        pour vos interlocuteurs.
      </p>
      <p v-if="coach">
        Vos cours, masterclass, exercices publiés et les inscriptions associées
        seront aussi supprimés. Les résultats déjà enregistrés dans l’historique
        personnel des élèves restent disponibles.
      </p>
      <v-btn
        variant="outlined"
        color="#a53c35"
        prepend-icon="mdi-delete-outline"
        @click="openDeletion"
        >Supprimer mon compte</v-btn
      >
    </section>
    <v-dialog v-model="dialog" max-width="520" :persistent="busy"
      ><v-card class="delete-dialog"
        ><h2>Confirmer la suppression</h2>
        <p>
          Vous allez supprimer le compte <strong>{{ auth.user?.email }}</strong
          >. Cette opération est irréversible.
        </p>
        <form @submit.prevent="removeAccount">
          <v-text-field
            v-model="password"
            type="password"
            label="Mot de passe actuel"
            autocomplete="current-password"
            variant="outlined"
            :disabled="busy"
            required
          /><v-text-field
            v-model="confirmation"
            label="Saisissez SUPPRIMER"
            autocomplete="off"
            variant="outlined"
            :disabled="busy"
            required
          /><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{
            error
          }}</v-alert>
          <div class="actions">
            <v-btn variant="text" :disabled="busy" @click="dialog = false"
              >Annuler</v-btn
            ><v-btn
              type="submit"
              color="#a53c35"
              :loading="busy"
              :disabled="confirmation !== 'SUPPRIMER' || !password"
              >Supprimer définitivement</v-btn
            >
          </div>
        </form></v-card
      ></v-dialog
    >
  </main>
</template>
<style scoped>
.settings-view {
  max-width: 1200px;
  margin: auto;
  padding: 40px 24px 72px;
  color: #24443f;
}
.settings-view header {
  margin-bottom: 28px;
}
h1 {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.04em;
}
h2 {
  font-size: 18px;
  font-weight: 600;
}
p {
  font-size: 14px;
  line-height: 1.7;
  color: #68736c;
  margin: 12px 0 20px;
}
.settings-panel {
  padding: 24px;
  margin-top: 24px;
  border: 1px solid #24443f20;
  background: #fffdf8;
  border-radius: 16px;
}
.settings-view :deep(.security-panel) {
  max-width: none;
  margin: 0;
}
.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.deletion-panel {
  border-color: #a53c3530;
}
.deletion-panel h2 {
  color: #a53c35;
}
.delete-dialog {
  padding: 28px;
  background: #fffdf8;
  color: #24443f;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
  border-radius: 8px;
}
@media (max-width: 600px) {
  .settings-view {
    padding: 28px 16px 48px;
  }
  h1 {
    font-size: 28px;
  }
  .settings-panel {
    padding: 20px;
  }
}
</style>

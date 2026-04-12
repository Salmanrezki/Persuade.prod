<script setup>
import { ref } from 'vue'
import { useDisplay } from 'vuetify'

const dialog = ref(true)
const { smAndDown } = useDisplay()
</script>

<template>
  <div class="dev-notice" aria-live="polite">
    <v-btn
      icon
      size="46"
      class="dev-notice__button"
      aria-label="Informations sur le développement de l'application"
      @click="dialog = true"
    >
      <v-icon size="22">mdi-information-variant-circle-outline</v-icon>
    </v-btn>
  </div>

  <v-dialog
    v-model="dialog"
    :max-width="smAndDown ? 380 : 460"
    scrim="rgba(19, 58, 59, 0.32)"
  >
    <v-card class="dev-notice__card" rounded="xl">
      <div class="dev-notice__eyebrow">Information</div>
      <h2 class="dev-notice__title">Application en développement</h2>
      <p class="dev-notice__text">
        Certaines sections évoluent encore. Le contenu complet sera disponible d'ici peu.
      </p>
      <p class="dev-notice__text">
        Nous recherchons actuellement des partenariats avec des coachs agréés dans le domaine.
      </p>

      <div class="dev-notice__actions">
        <v-btn
          color="#133a3b"
          variant="flat"
          rounded="pill"
          class="dev-notice__close"
          @click="dialog = false"
        >
          Fermer
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dev-notice {
  position: fixed;
  right: max(18px, calc(env(safe-area-inset-right) + 18px));
  bottom: max(18px, calc(env(safe-area-inset-bottom) + 18px));
  z-index: 1100;
  pointer-events: none;
}

.dev-notice__button {
  pointer-events: auto;
  min-width: 46px;
  border-radius: 999px;
  background: rgba(19, 58, 59, 0.94);
  color: #f8f5ee;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 16px 36px rgba(19, 58, 59, 0.18);
}

.dev-notice__button::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 1px solid rgba(19, 58, 59, 0.16);
}

.dev-notice__card {
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(245, 191, 71, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 245, 238, 0.98));
  border: 1px solid rgba(19, 58, 59, 0.1);
  color: #133a3b;
}

.dev-notice__eyebrow {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(19, 58, 59, 0.58);
}

.dev-notice__title {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.1;
}

.dev-notice__text {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: rgba(19, 58, 59, 0.78);
}

.dev-notice__text + .dev-notice__text {
  margin-top: 10px;
}

.dev-notice__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.dev-notice__close {
  text-transform: none;
  font-weight: 600;
}

@media (max-width: 959px) {
  .dev-notice {
    right: max(14px, calc(env(safe-area-inset-right) + 14px));
    bottom: max(14px, calc(env(safe-area-inset-bottom) + 14px));
  }

  .dev-notice__card {
    padding: 22px 18px;
  }

  .dev-notice__title {
    font-size: 21px;
  }
}
</style>

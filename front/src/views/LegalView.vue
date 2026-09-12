<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ROUTE_PATHS } from '@/router/paths'
import MarketingNavbar from '@/components/MarketingNavbar.vue'

const route = useRoute()
const isPrivacyPage = computed(() => route.meta.legalPage === 'privacy')
const title = computed(() => (isPrivacyPage.value ? 'Politique de confidentialité' : 'Mentions légales'))
const navItems = [
  { label: 'Accueil', href: ROUTE_PATHS.landing },
  { label: 'Notre offre', href: `${ROUTE_PATHS.landing}#offre` },
  { label: 'Contact', href: `${ROUTE_PATHS.landing}#contact` },
]
</script>

<template>
  <v-container fluid class="legal-page pa-3 pa-md-5">
    <v-container class="legal-frame pa-0">
      <MarketingNavbar :nav-items="navItems" />

      <main class="legal-content">
        <div class="legal-kicker">Persuade</div>
        <h1>{{ title }}</h1>
        <p class="legal-updated">Dernière mise à jour : {{ new Date().toLocaleDateString('fr-FR') }}</p>

        <template v-if="isPrivacyPage">
          <section>
            <h2>Collecte des données</h2>
            <p>Persuade collecte uniquement les informations nécessaires à la création et à la gestion de votre compte, ainsi qu'à l'accès à la plateforme d'apprentissage.</p>
          </section>
          <section>
            <h2>Utilisation des données</h2>
            <p>Vos données servent à vous connecter, suivre votre progression et améliorer votre expérience. Elles ne sont pas vendues à des tiers.</p>
          </section>
          <section>
            <h2>Vos droits</h2>
            <p>Vous pouvez demander l'accès, la rectification ou la suppression de vos données en écrivant à <a href="mailto:persuade.fr@gmail.com">persuade.fr@gmail.com</a>.</p>
          </section>
        </template>

        <template v-else>
          <section>
            <h2>Éditeur du site</h2>
            <p>Le site Persuade est édité par Persuade. Pour toute question, contactez-nous à <a href="mailto:persuade.fr@gmail.com">persuade.fr@gmail.com</a>.</p>
          </section>
          <section>
            <h2>Hébergement</h2>
            <p>Les informations relatives à l'hébergeur seront complétées lors de la mise en production définitive du site.</p>
          </section>
          <section>
            <h2>Propriété intellectuelle</h2>
            <p>Les contenus, textes, visuels et éléments de marque présents sur Persuade sont protégés. Toute reproduction non autorisée est interdite.</p>
          </section>
        </template>
      </main>
    </v-container>
  </v-container>
</template>

<style scoped>
.legal-page {
  min-height: 100vh;
  color: #1f342f;
  background: linear-gradient(135deg, #fffdf8, #f4f0e8 58%, #ffffff);
}

.legal-frame {
  max-width: 1160px;
}

.legal-content {
  max-width: 780px;
  margin: clamp(3rem, 8vw, 7rem) auto;
  padding: clamp(1.5rem, 5vw, 3.5rem);
  border: 1px solid rgba(31, 52, 47, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 24px 60px rgba(31, 52, 47, 0.1);
}

.legal-kicker {
  color: #b55d3f;
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.legal-content h1,
.legal-content h2 {
  font-family: 'Avenir Next', Avenir, Inter, sans-serif;
}

.legal-content h1 {
  margin-top: 0.7rem;
  font-size: clamp(2rem, 5vw, 3.8rem);
  line-height: 1;
}

.legal-updated {
  color: rgba(31, 52, 47, 0.54);
  font-size: 0.86rem;
}

.legal-content section {
  margin-top: 2rem;
}

.legal-content h2 {
  margin-bottom: 0.55rem;
  font-size: 1.25rem;
}

.legal-content p {
  color: rgba(31, 52, 47, 0.74);
  line-height: 1.7;
}

.legal-content a {
  color: #b55d3f;
  font-weight: 800;
}
</style>

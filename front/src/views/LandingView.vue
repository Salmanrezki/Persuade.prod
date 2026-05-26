<script setup>
import { computed } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import logoUrl from '@/assets/logo.png'
import MarketingNavbar from '@/components/MarketingNavbar.vue'
import LandingLaptopScene from '@/components/LandingLaptopScene.vue'

const painPoints = [
  {
    value: '01',
    title: 'Une forte demande cote coachs',
    text: 'Les coachs recherchent des outils concrets et modernes pour accompagner efficacement leurs clients.',
  },
  {
    value: '02',
    title: 'Un acces a la formation encore trop couteux',
    text: "Pour les freelances et petites structures, l'acces a des formations de qualite reste souvent trop cher.",
  },
  {
    value: '03',
    title: 'Un manque de formation adaptee dans le temps',
    text: "Peu de solutions permettent encore de progresser durablement et de s'entrainer regulierement.",
  },
]

const features = [
  {
    title: 'Dashboard',
    text: 'Suivez votre progression, vos indicateurs cles et les prochaines etapes depuis un seul ecran.',
    image: '/landing/Dashboard.png',
    accent: 'Dashboard',
  },
  {
    title: 'Masterclass',
    text: 'Approfondissez les techniques essentielles et travaillez votre posture de negociation.',
    image: '/landing/Masterclass.png',
    accent: 'Masterclass',
  },
  {
    title: 'Cours preenregistres',
    text: 'Apprenez a votre rythme et revenez facilement sur les notions essentielles.',
    image: '/landing/Courpreenregistrer.png',
    accent: 'Cours',
  },
  {
    title: 'Chat',
    text: "Un espace direct pour echanger, poser vos questions et garder le lien.",
    image: '/landing/Chat.png',
    accent: 'Chat',
  },
]

const founders = [
  {
    initials: 'CD',
    name: 'Come Du Parc Locmaria',
    role: 'Co-fondateur',
  },
  {
    initials: 'SR',
    name: 'Salman Rezki',
    role: 'Co-fondateur',
  },
]

const teamHighlights = [
  'Produit pense pour la pratique',
  'Progression claire',
  'Construit avec les utilisateurs',
]

const navItems = [
  { label: 'Vision', href: '#vision' },
  { label: 'Fonctionnalites', href: '#fonctionnalites' },
  { label: 'Apercu', href: '#preview' },
  { label: 'Equipe', href: '#equipe' },
  { label: 'Contact', href: '#contact' },
]

const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
  <v-container fluid class="landing-page pa-3 pa-sm-4 pa-md-6">
    <div class="landing-ambient landing-ambient--left" aria-hidden="true"></div>
    <div class="landing-ambient landing-ambient--right" aria-hidden="true"></div>

    <v-container class="landing-frame pa-0">
      <MarketingNavbar class="mb-6" :nav-items="navItems" />

      <section id="hero" class="landing-section landing-section--hero">
        <v-row align="center" class="ga-0">
          <v-col cols="12" md="5">
            <v-sheet class="landing-hero-copy" rounded="xl" elevation="0">
              <h1 class="landing-title mb-4">Reinventez votre maniere de negocier</h1>
              <p class="landing-text landing-text--hero mb-6">
                Apprenez, pratiquez et progressez dans une interface simple et claire.
              </p>

              <div class="d-flex flex-wrap ga-3">
                <v-btn
                  :to="ROUTE_PATHS.login"
                  size="large"
                  rounded="pill"
                  class="landing-btn landing-btn--hero"
                >
                  Tester la demo
                </v-btn>
                <v-btn
                  href="#fonctionnalites"
                  size="large"
                  rounded="pill"
                  variant="outlined"
                  class="landing-btn landing-btn--secondary"
                >
                  Decouvrir
                </v-btn>
              </div>
            </v-sheet>
          </v-col>

          <v-col cols="12" md="7">
            <v-card class="landing-showcase" rounded="xl" elevation="0">
              <LandingLaptopScene />
            </v-card>
          </v-col>
        </v-row>
      </section>

      <section id="vision" class="landing-section">
        <div class="landing-heading mb-6">
          <div class="landing-section-label mb-2">Vision</div>
          <h2 class="landing-section-title mb-3">Notre vision</h2>
          <p class="landing-text">
            Nous avons etudie en profondeur le marche de la formation a la negociation. Trois constats majeurs ont fait emerger un besoin clair.
          </p>
        </div>

        <v-row>
          <v-col v-for="item in painPoints" :key="item.title" cols="12" md="4">
            <v-card class="landing-info-card h-100" rounded="xl" elevation="0">
              <v-card-text class="pa-5">
                <div class="landing-card-index mb-3">{{ item.value }}</div>
                <h3 class="landing-card-title mb-2">{{ item.title }}</h3>
                <p class="landing-card-text mb-0">{{ item.text }}</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </section>

      <section id="fonctionnalites" class="landing-section">
        <div class="landing-heading mb-6">
          <div class="landing-section-label mb-2">Fonctionnalites</div>
          <h2 class="landing-section-title mb-3">Fonctionnalites cles</h2>
          <p class="landing-text">
            Les briques essentielles pour apprendre et pratiquer.
          </p>
        </div>

        <v-card class="landing-feature-carousel" rounded="xl" elevation="0">
          <v-carousel
            hide-delimiter-background
            show-arrows="hover"
            height="460"
            class="landing-carousel"
            cycle
            interval="5000"
          >
            <v-carousel-item v-for="feature in features" :key="feature.title">
              <div class="landing-carousel__slide">
                <div class="landing-carousel__meta">
                  <div class="landing-card-index mb-2">{{ feature.accent }}</div>
                  <h3 class="landing-card-title mb-2">{{ feature.title }}</h3>
                  <p class="landing-card-text mb-0">{{ feature.text }}</p>
                </div>

                <div class="landing-feature-shot pa-3">
                  <v-img :src="feature.image" :alt="feature.title" contain class="landing-feature-shot__image" />
                </div>
              </div>
            </v-carousel-item>
          </v-carousel>
        </v-card>
      </section>

      <section id="preview" class="landing-section">
        <v-card class="landing-panel" rounded="xl" elevation="0">
          <v-row align="center" class="ma-0">
            <v-col cols="12" md="5">
              <v-card-text class="pa-5 pa-sm-6">
                <div class="landing-section-label mb-2">Demo</div>
                <h2 class="landing-section-title mb-3">Acceder a la demo</h2>
                <p class="landing-text mb-6">
                  Visualisez l'interface et testez l'entree dans la plateforme.
                </p>

                <div class="d-flex flex-wrap ga-3">
                  <v-btn
                    :to="ROUTE_PATHS.login"
                    rounded="pill"
                    class="landing-btn landing-btn--primary"
                  >
                    Tester la demo
                  </v-btn>
                  <v-btn
                    href="#contact"
                    rounded="pill"
                    variant="outlined"
                    class="landing-btn landing-btn--secondary"
                  >
                    Nous contacter
                  </v-btn>
                </div>
              </v-card-text>
            </v-col>

            <v-col cols="12" md="7">
              <div class="landing-feature-shot pa-3">
                <v-img
                  src="/landing/Login.register.png"
                  alt="Apercu de l'ecran de connexion Persuade"
                  cover
                  class="landing-feature-shot__image"
                />
              </div>
            </v-col>
          </v-row>
        </v-card>
      </section>

      <section id="equipe" class="landing-section landing-section--team">
        <v-row>
          <v-col cols="12" md="7">
            <v-card class="landing-team-copy" rounded="xl" elevation="0">
              <v-card-text class="pa-5 pa-sm-6">
                <div class="landing-section-label mb-2">Qui sommes-nous</div>
                <h2 class="landing-section-title mb-4">Un projet construit a deux, avec une ambition claire.</h2>
                <p class="landing-text mb-4">
                  Nous construisons Persuade comme un outil moderne, pratique et vraiment utile pour progresser en negociation.
                </p>

                <div class="d-flex flex-wrap ga-2 mb-5">
                  <v-chip
                    v-for="highlight in teamHighlights"
                    :key="highlight"
                    rounded="pill"
                    class="landing-highlight"
                  >
                    {{ highlight }}
                  </v-chip>
                </div>

                <v-chip rounded="pill" class="landing-partner-chip">
                  <v-avatar start rounded="0">
                    <v-img src="/landing/epitech-logo.png" alt="Logo Epitech" />
                  </v-avatar>
                  Projet ne a Epitech
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="5">
            <v-row>
              <v-col v-for="person in founders" :key="person.name" cols="12">
                <v-card class="landing-founder-card" rounded="xl" elevation="0">
                  <v-card-text class="pa-5 d-flex align-center ga-4">
                    <v-avatar size="72" class="landing-founder-avatar">
                      <span>{{ person.initials }}</span>
                    </v-avatar>

                    <div>
                      <h3 class="landing-card-title mb-1">{{ person.name }}</h3>
                      <p class="landing-card-text mb-3">{{ person.role }}</p>
                      <v-chip rounded="pill" class="landing-founder-tag">Persuade</v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </section>

      <section id="contact" class="landing-section">
        <v-card class="landing-panel" rounded="xl" elevation="0">
          <v-card-text class="pa-5 pa-sm-6 d-flex flex-column flex-md-row align-md-center justify-space-between ga-4">
            <div>
              <div class="landing-section-label mb-2">Contact</div>
              <h2 class="landing-section-title mb-3">Discutons de Persuade.</h2>
              <p class="landing-text mb-0">
                Une question ou une demande d'acces ? Ecrivez-nous.
              </p>
            </div>

            <div class="d-flex flex-wrap ga-3">
              <v-btn
                href="mailto:persuade.fr@gmail.com"
                rounded="pill"
                class="landing-btn landing-btn--primary"
              >
                persuade.fr@gmail.com
              </v-btn>
              <v-btn
                href="https://www.linkedin.com/company/persuade-fr/"
                target="_blank"
                rel="noreferrer"
                rounded="pill"
                variant="outlined"
                class="landing-btn landing-btn--secondary"
              >
                LinkedIn
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </section>

      <footer class="landing-footer">
        <v-divider class="mb-4"></v-divider>
        <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3">
          <div class="d-flex align-center ga-3">
            <v-avatar size="42" class="landing-brand__avatar">
              <v-img :src="logoUrl" alt="Logo Persuade" />
            </v-avatar>
            <span class="landing-footer__brand">Persuade</span>
          </div>

          <p class="landing-footer__text mb-0">© {{ currentYear }} Persuade. Tous droits reserves.</p>
        </div>
      </footer>
    </v-container>
  </v-container>
</template>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  color: #234744;
  background: #ffffff;
  overflow: hidden;
}

.landing-frame {
  position: relative;
  z-index: 1;
  max-width: 1160px;
}

.landing-ambient {
  position: fixed;
  width: 22rem;
  height: 22rem;
  border-radius: 50%;
  filter: blur(24px);
  pointer-events: none;
  opacity: 0.7;
}

.landing-ambient--left {
  top: -5rem;
  left: -7rem;
  background: rgba(35, 71, 68, 0.12);
}

.landing-ambient--right {
  right: -8rem;
  bottom: -4rem;
  background: rgba(181, 93, 63, 0.12);
}

.landing-info-card,
.landing-panel,
.landing-team-copy,
.landing-founder-card {
  border: 1px solid rgba(35, 71, 68, 0.12);
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(35, 71, 68, 0.08);
  backdrop-filter: blur(16px);
}

.landing-footer__text {
  color: rgba(35, 71, 68, 0.62);
  font-size: 0.82rem;
}

.landing-btn--primary {
  color: #fffdf8;
  background: linear-gradient(135deg, #234744, #2f5a56);
  border: 1px solid rgba(35, 71, 68, 0.14);
  text-transform: none;
  font-weight: 700;
  box-shadow: 0 14px 28px rgba(35, 71, 68, 0.08);
}

.landing-section {
  padding: 0 0 3rem;
}

.landing-section--hero {
  padding-top: 1rem;
}

.landing-section--team {
  border-radius: 28px;
}

.landing-eyebrow,
.landing-section-label,
.landing-card-index {
  color: #b55d3f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-title,
.landing-section-title {
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.landing-title {
  font-size: clamp(2.3rem, 5vw, 4.8rem);
}

.landing-section-title {
  font-size: clamp(1.7rem, 3vw, 2.7rem);
}

.landing-text,
.landing-card-text {
  color: rgba(35, 71, 68, 0.72);
  line-height: 1.6;
}

.landing-text--hero {
  max-width: 32rem;
  font-size: clamp(1rem, 1.35vw, 1.18rem);
}

.landing-hero-copy {
  padding: 2rem;
  border: 1px solid rgba(35, 71, 68, 0.14);
  background:
    linear-gradient(145deg, #234744, #2f5a56),
    #234744;
  box-shadow: 0 28px 56px rgba(35, 71, 68, 0.18);
}

.landing-hero-copy .landing-eyebrow {
  color: #ffd7c7;
}

.landing-hero-copy .landing-title {
  color: #fffdf9;
}

.landing-hero-copy .landing-text {
  color: rgba(255, 251, 245, 0.78);
}

.landing-showcase {
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

.landing-showcase :deep(.landing-laptop-scene) {
  min-height: 460px;
}

.landing-carousel {
  background: transparent;
}

.landing-carousel :deep(.v-btn--icon) {
  background: rgba(35, 71, 68, 0.92);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(35, 71, 68, 0.18);
}

.landing-carousel :deep(.v-carousel__controls) {
  background: transparent;
}

.landing-carousel :deep(.v-btn--icon .v-icon) {
  color: #ffffff;
}

.landing-carousel :deep(.v-carousel__controls__item) {
  color: rgba(35, 71, 68, 0.28) !important;
}

.landing-carousel :deep(.v-carousel__controls__item.v-btn--active) {
  color: #b55d3f !important;
}

.landing-feature-carousel {
  border: 1px solid rgba(35, 71, 68, 0.12);
  background:
    linear-gradient(180deg, #ffffff, #f3faf7),
    #ffffff;
  box-shadow: 0 18px 44px rgba(35, 71, 68, 0.08);
}

.landing-carousel__slide {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.landing-carousel__meta {
  max-width: 28rem;
  padding: 0 0.75rem 0 1rem;
}

.landing-showcase__image,
.landing-feature-shot__image {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  min-height: 240px;
}

.landing-btn {
  text-transform: none;
  font-weight: 700;
}

.landing-btn--hero {
  color: #fffdf8;
  background: linear-gradient(135deg, #b55d3f, #c97958);
  border: 1px solid rgba(181, 93, 63, 0.2);
  box-shadow: 0 18px 40px rgba(181, 93, 63, 0.16);
}

.landing-btn--secondary {
  color: #fffdf8;
  border-color: rgba(181, 93, 63, 0.2);
  background: linear-gradient(135deg, #b55d3f, #c97958);
  box-shadow: 0 14px 28px rgba(181, 93, 63, 0.14);
}

.landing-card-title {
  font-size: 1.06rem;
  color: #234744;
}

.landing-feature-shot {
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 248, 244, 0.96)),
    rgba(255, 255, 255, 0.92);
}

.landing-highlight {
  border: 1px solid rgba(35, 71, 68, 0.12);
  background: rgba(35, 71, 68, 0.08);
  color: #234744;
  font-weight: 600;
}

.landing-partner-chip {
  background: rgba(181, 93, 63, 0.08);
  border: 1px solid rgba(181, 93, 63, 0.14);
  color: #b55d3f;
}

.landing-founder-card {
  background:
    linear-gradient(180deg, #ffffff, #fff7f3),
    #ffffff;
}

.landing-founder-avatar {
  background: linear-gradient(135deg, #b55d3f, #d27d5a);
  color: #fff;
  font-weight: 700;
}

.landing-founder-tag {
  background: rgba(35, 71, 68, 0.1);
  color: #234744;
  font-weight: 700;
  text-transform: uppercase;
}

.landing-panel {
  background:
    linear-gradient(145deg, #ffffff, #fff8f5),
    #ffffff;
}

.landing-footer__brand {
  color: #234744;
  font-weight: 700;
}

.landing-footer {
  padding-bottom: 1.5rem;
}

.landing-footer__brand {
  color: #2a241d;
  font-weight: 700;
}

@media (max-width: 960px) {
  .landing-section {
    padding-bottom: 2.2rem;
  }

  .landing-hero-copy {
    text-align: center;
    padding: 1.5rem;
  }

  .landing-text--hero {
    margin-left: auto;
    margin-right: auto;
  }
}

@media (max-width: 600px) {
  .landing-showcase {
    padding: 0;
  }

  .landing-showcase :deep(.landing-laptop-scene) {
    min-height: 340px;
  }

  .landing-showcase__image,
  .landing-feature-shot__image {
    min-height: 190px;
    border-radius: 16px;
  }

  .landing-carousel__slide {
    grid-template-columns: 1fr;
    padding: 0.55rem;
  }

  .landing-carousel__meta {
    padding: 0.5rem 0.5rem 0;
    max-width: none;
  }
}
</style>

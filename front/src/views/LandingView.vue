<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import MarketingNavbar from '@/components/MarketingNavbar.vue'
import mailLogoUrl from '@/assets/logo-mail.svg'
import linkedinLogoUrl from '@/assets/logo-linkedin.svg'

const offerItems = [
  {
    value: '01',
    title: 'Apprendre',
    icon: 'mdi-school-outline',
    items: ['Cours structurés', 'Masterclasses', 'Entretiens privés'],
  },
  {
    value: '02',
    title: 'Pratiquer',
    icon: 'mdi-target-variant',
    items: ['Exercices', 'Cas concrets', 'Mises en situation', 'Scénarios commerciaux'],
  },
  {
    value: '03',
    title: 'Être accompagné',
    icon: 'mdi-account-tie-outline',
    items: ['Messagerie', 'Demandes de suivi', 'Feedback de coachs'],
  },
  {
    value: '04',
    title: 'Progresser',
    icon: 'mdi-trending-up',
    items: ['Tableau de bord', 'Parcours guidé', 'Suivi dans le temps'],
  },
]

const features = [
  {
    title: 'Dashboard',
    text: 'Suivez votre progression, vos indicateurs clés et les prochaines étapes depuis un seul écran.',
    image: '/landing/Dashboard.png',
    accent: "Vue d'ensemble",
  },
  {
    title: 'Masterclass',
    text: 'Approfondissez les techniques essentielles et travaillez votre posture de négociation.',
    image: '/landing/Masterclass.png',
    accent: 'Formation live',
  },
  {
    title: 'Cours vidéo',
    text: 'Apprenez à votre rythme grâce à des contenus vidéo clairs et revenez facilement sur les notions essentielles.',
    image: '/landing/Courpreenregistrer.png',
    accent: 'À la demande',
  },
  {
    title: 'Exercices pratiques',
    text: 'Mettez vos connaissances en application avec des exercices concrets et des mises en situation.',
    image: '/landing/Exercices pratique.png',
    accent: 'Entraînement',
  },
  {
    title: 'Chat',
    text: "Un espace direct pour échanger, poser vos questions et garder le lien.",
    image: '/landing/Chat.png',
    accent: 'Échanges directs',
  },
]

const founders = [
  {
    name: 'Côme Du Parc Locmaria',
    role: 'Co-fondateur & CEO',
    image: '/photodeprofil/photodeprofil1Come.png',
  },
  {
    name: 'Salman Rezki',
    role: 'Fondateur & CTO',
    image: '/photodeprofil/photodeprofil2Salman.png',
  },
]

const navItems = [
  { label: 'Notre offre', href: '#offre' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Démo', href: '#preview' },
  { label: 'Équipe', href: '#equipe' },
  { label: 'Contact', href: '#contact' },
]

const currentYear = computed(() => new Date().getFullYear())
const activeFeatureIndex = ref(0)
const featureTabElements = ref([])
const offerCarouselRef = ref(null)
const activeOfferIndex = ref(0)
const showScrollTop = ref(false)
const activeFeature = computed(() => features[activeFeatureIndex.value] || features[0])

const setFeatureTabRef = (element, index) => {
  if (element) featureTabElements.value[index] = element
}

const selectFeature = (index, shouldScroll = true) => {
  activeFeatureIndex.value = index

  if (shouldScroll) {
    nextTick(() => {
      featureTabElements.value[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    })
  }
}

const scrollOfferTo = (index) => {
  const nextIndex = (index + offerItems.length) % offerItems.length
  activeOfferIndex.value = nextIndex
  offerCarouselRef.value?.children[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
}

const handleOfferScroll = (event) => {
  const element = event.currentTarget
  const firstCard = element?.children?.[0]
  if (!firstCard) return

  const cardStep = firstCard.getBoundingClientRect().width + 16
  activeOfferIndex.value = Math.min(offerItems.length - 1, Math.max(0, Math.round(element.scrollLeft / cardStep)))
}

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 420
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll))

const vReveal = {
  mounted(element) {
    element.classList.add('landing-reveal')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('landing-reveal--visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        element.classList.add('landing-reveal--visible')
        observer.unobserve(element)
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.16,
      },
    )

    observer.observe(element)
    element._landingRevealObserver = observer
  },
  unmounted(element) {
    element._landingRevealObserver?.disconnect()
  },
}
</script>

<template>
  <v-container fluid class="landing-page pa-3 pa-md-5">
    <div class="landing-grain" aria-hidden="true"></div>

    <v-container class="landing-frame pa-0">
      <MarketingNavbar class="landing-nav" :nav-items="navItems" />

      <section id="hero" class="landing-section landing-section--hero">
        <div class="landing-hero-grid">
          <div class="landing-hero-copy">
            <h1 class="landing-title">
              <span>Réinventez votre</span>
              <span>manière de <strong>négocier</strong></span>
            </h1>
            <p class="landing-text landing-text--hero">
              Apprenez, pratiquez et progressez dans une interface simple et claire.
            </p>
          </div>

          <div class="landing-hero-stage" v-reveal>
            <v-img
              src="/AcceuilAnimation.png"
              alt="Illustration d'accueil Persuade"
              cover
              eager
              class="landing-hero-image"
            />
          </div>

          <div class="landing-actions landing-hero-actions">
            <v-btn :to="ROUTE_PATHS.login" size="large" rounded="pill" class="landing-btn landing-btn--hero">
              Tester la demo
            </v-btn>
            <v-btn href="#offre" size="large" rounded="pill" variant="outlined" class="landing-btn landing-btn--ghost">
              Découvrir
            </v-btn>
          </div>
        </div>
      </section>

      <section id="offre" class="landing-section landing-section--offer">
        <div class="landing-heading landing-heading--offer" v-reveal>
          <div class="landing-heading__main">
            <div class="landing-section-label">Notre offre</div>
            <h2 class="landing-section-title">Apprendre, pratiquer et progresser en négociation</h2>
          </div>
          <p class="landing-text landing-heading__text">
            Un parcours structuré, du feedback expert et un prix plus accessible.
          </p>
        </div>

        <div ref="offerCarouselRef" class="landing-offer-grid" @scroll.passive="handleOfferScroll">
          <article
            v-for="(item, index) in offerItems"
            :key="item.title"
            class="landing-offer-card"
            :style="{ '--reveal-delay': `${index * 90}ms` }"
            v-reveal
          >
            <div class="landing-offer-card__top">
              <span class="landing-offer-icon">
                <v-icon :icon="item.icon" size="26" />
              </span>
              <span class="landing-card-index">{{ item.value }}</span>
            </div>

            <h3 class="landing-card-title landing-offer-title">{{ item.title }}</h3>
            <ul class="landing-offer-list">
              <li v-for="entry in item.items" :key="entry">{{ entry }}</li>
            </ul>
          </article>
        </div>

        <div class="landing-offer-controls" aria-label="Navigation de l'offre">
          <button
            type="button"
            class="landing-offer-control"
            aria-label="Offre précédente"
            @click="scrollOfferTo(activeOfferIndex - 1)"
          >
            <v-icon icon="mdi-arrow-left" size="18" />
          </button>
          <div class="landing-offer-dots" aria-hidden="true">
            <span
              v-for="(item, index) in offerItems"
              :key="`offer-dot-${item.title}`"
              class="landing-offer-dot"
              :class="{ 'landing-offer-dot--active': index === activeOfferIndex }"
            ></span>
          </div>
          <button
            type="button"
            class="landing-offer-control"
            aria-label="Offre suivante"
            @click="scrollOfferTo(activeOfferIndex + 1)"
          >
            <v-icon icon="mdi-arrow-right" size="18" />
          </button>
        </div>
      </section>

      <section id="fonctionnalites" class="landing-section landing-section--features">
        <div class="landing-heading landing-heading--split" v-reveal>
          <div>
            <div class="landing-section-label">Fonctionnalités</div>
            <h2 class="landing-section-title">Fonctionnalités clés</h2>
          </div>
          <p class="landing-text">Les briques essentielles pour apprendre et pratiquer.</p>
        </div>

        <div class="landing-feature-dock" v-reveal>
          <div class="landing-feature-tabs">
            <button
              v-for="(feature, index) in features"
              :key="feature.title"
              :ref="(element) => setFeatureTabRef(element, index)"
              class="landing-feature-tab"
              :class="{ 'landing-feature-tab--active': index === activeFeatureIndex }"
              type="button"
              @mouseenter="selectFeature(index, false)"
              @focus="selectFeature(index)"
              @click="selectFeature(index)"
            >
              <span>{{ feature.accent }}</span>
              <strong>{{ feature.title }}</strong>
              <small>{{ feature.text }}</small>
            </button>
          </div>

          <div class="landing-feature-controls" aria-label="Navigation des fonctionnalités">
            <button
              type="button"
              class="landing-feature-control"
              aria-label="Fonctionnalité précédente"
              @click="selectFeature((activeFeatureIndex - 1 + features.length) % features.length)"
            >
              <v-icon icon="mdi-arrow-left" size="18" />
            </button>
            <div class="landing-feature-dots" aria-hidden="true">
              <span
                v-for="(feature, index) in features"
                :key="`dot-${feature.title}`"
                class="landing-feature-dot"
                :class="{ 'landing-feature-dot--active': index === activeFeatureIndex }"
              ></span>
            </div>
            <button
              type="button"
              class="landing-feature-control"
              aria-label="Fonctionnalité suivante"
              @click="selectFeature((activeFeatureIndex + 1) % features.length)"
            >
              <v-icon icon="mdi-arrow-right" size="18" />
            </button>
          </div>

          <div class="landing-feature-preview">
            <v-img :src="activeFeature.image" :alt="activeFeature.title" cover loading="lazy" class="landing-feature-preview__image" />
          </div>
        </div>
      </section>

      <section id="preview" class="landing-section landing-section--preview">
        <div class="landing-heading landing-heading--split" v-reveal>
          <div>
            <div class="landing-section-label">Démo</div>
            <h2 class="landing-section-title">Accéder à la démo</h2>
          </div>
          <p class="landing-text">Découvrez l'expérience Persuade avant de commencer.</p>
        </div>
        <div class="landing-demo-panel" v-reveal>
          <div class="landing-demo-copy">
            <p class="landing-text">Visualisez l'interface et testez l'entrée dans la plateforme.</p>

            <div class="landing-actions">
              <v-btn :to="ROUTE_PATHS.login" rounded="pill" class="landing-btn landing-btn--primary">
                Tester la demo
              </v-btn>
              <a href="#contact" class="landing-beta-link">
                Nous contacter pour obtenir un accès à notre bêta
                <v-icon icon="mdi-arrow-top-right" size="17" />
              </a>
            </div>
          </div>

          <div class="landing-login-stack">
            <v-img src="/landing/Login.register.png" alt="Aperçu de l'écran de connexion Persuade" contain loading="lazy" class="landing-login-stack__image" />
          </div>
        </div>
      </section>

      <section id="equipe" class="landing-section landing-section--team">
        <div class="landing-heading landing-heading--split" v-reveal>
          <div>
            <div class="landing-section-label">Équipe</div>
            <h2 class="landing-section-title">Qui sommes-nous ?</h2>
          </div>
          <p class="landing-text">Une équipe engagée pour rendre la négociation plus accessible.</p>
        </div>
        <div class="landing-team-grid" v-reveal>
          <div class="landing-team-copy">
            <p class="landing-text">
              Notre but est de rendre l'apprentissage de la négociation
              <strong class="landing-text-emphasis">plus accessible</strong>, plus concret et plus régulier. Avec
              Persuade, chacun peut apprendre les bases, progresser à son rythme et passer à la pratique avec des
              formats pensés pour le terrain.
            </p>
            <p class="landing-text">
              Nous voulons aussi créer un accompagnement humain autour de la plateforme, grâce à des
              <strong class="landing-text-emphasis landing-text-emphasis--large">coachs partenaires experts en négociation</strong>,
              capables d'aider les utilisateurs à prendre confiance, structurer leurs échanges et améliorer leur
              posture.
            </p>
          </div>

          <div class="landing-founder-stack">
            <article
              v-for="(person, index) in founders"
              :key="person.name"
              class="landing-founder-card"
              :style="{ '--reveal-delay': `${index * 110}ms` }"
              v-reveal
            >
              <v-avatar size="124" class="landing-founder-avatar">
                <v-img :src="person.image" :alt="`Photo de ${person.name}`" cover loading="lazy" />
              </v-avatar>
              <div>
                <h3 class="landing-card-title">{{ person.name }}</h3>
                <p class="landing-card-text">{{ person.role }}</p>
                <v-chip rounded="pill" class="landing-founder-tag">Persuade</v-chip>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="contact" class="landing-section landing-section--contact">
        <div class="landing-heading landing-heading--split" v-reveal>
          <div>
            <div class="landing-section-label">Contact</div>
            <h2 class="landing-section-title">Construisons la suite ensemble.</h2>
          </div>
          <p class="landing-text">Une question ou envie de rejoindre l'aventure Persuade ?</p>
        </div>
        <div class="landing-contact-panel" v-reveal>
          <div class="landing-contact-copy">
            <p class="landing-text">
              Une question, une demande d'accès ou l'envie de tester Persuade avec votre équipe ? Contactez-nous
              directement par email ou suivez l'avancée du projet sur LinkedIn.
            </p>
            <div class="landing-coach-callout">
              <div>
                <span class="landing-coach-callout__eyebrow">Coachs partenaires</span>
                <h3>Vous êtes coach ?</h3>
                <p>Rejoignez notre réseau d'experts et accompagnez les apprenants dans leur progression.</p>
              </div>
              <a
                class="landing-coach-callout__action"
                href="mailto:persuade.fr@gmail.com?subject=Devenir%20coach%20partenaire"
              >
                <span>Devenir coach partenaire</span>
                <v-icon icon="mdi-arrow-top-right" size="18" />
              </a>
            </div>
          </div>

          <div class="landing-contact-card" aria-label="Moyens de contact">
            <a class="landing-contact-link landing-contact-link--primary" href="mailto:persuade.fr@gmail.com">
              <span class="landing-contact-link__icon">
                <img :src="mailLogoUrl" alt="" class="landing-contact-link__image" />
              </span>
              <span>
                <small>Nous écrire</small>
                <strong>persuade.fr@gmail.com</strong>
              </span>
              <v-icon icon="mdi-arrow-top-right" size="20" />
            </a>

            <a
              class="landing-contact-link"
              href="https://www.linkedin.com/company/persuade-fr/"
              target="_blank"
              rel="noreferrer"
            >
              <span class="landing-contact-link__icon">
                <img :src="linkedinLogoUrl" alt="" class="landing-contact-link__image" />
              </span>
              <span>
                <small>LinkedIn</small>
                <strong>Suivre Persuade</strong>
              </span>
              <v-icon icon="mdi-arrow-top-right" size="20" />
            </a>
          </div>
        </div>
      </section>

      <footer class="landing-footer">
        <div class="landing-footer__identity">
          <span class="landing-footer__brand">Persuade</span>
          <span class="landing-footer__text">© {{ currentYear }} Persuade. Tous droits réservés.</span>
        </div>
        <nav class="landing-footer__links" aria-label="Informations légales">
          <a href="/politique-de-confidentialite">Politique de confidentialité</a>
          <a href="/mentions-legales">Mentions légales</a>
        </nav>
      </footer>

      <button
        v-show="showScrollTop"
        type="button"
        class="landing-scroll-top"
        aria-label="Retour en haut de la page"
        title="Retour en haut"
        @click="scrollToTop"
      >
        <v-icon icon="mdi-arrow-up" size="21" />
      </button>
    </v-container>
  </v-container>
</template>

<style scoped>
.landing-page {
  position: relative;
  min-height: 100vh;
  color: #1f342f;
  background:
    linear-gradient(115deg, rgba(181, 93, 63, 0.12), transparent 28%),
    linear-gradient(245deg, rgba(35, 71, 68, 0.12), transparent 32%),
    linear-gradient(180deg, #fffdf8 0%, #f4f0e8 48%, #ffffff 100%);
  overflow: hidden;
}

.landing-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.45;
  background-image:
    linear-gradient(rgba(35, 71, 68, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(35, 71, 68, 0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), transparent 78%);
}

.landing-frame {
  position: relative;
  z-index: 1;
  max-width: 1220px;
}

.landing-nav {
  position: sticky;
  top: 16px;
  z-index: 5;
}

.landing-section {
  padding: 4.5rem 0;
}

.landing-reveal {
  opacity: 0;
  transform: translateY(34px) scale(0.985);
  filter: blur(10px);
  transition:
    opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    transform 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    filter 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms);
  will-change: opacity, transform, filter;
}

.landing-reveal--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.landing-section--hero {
  min-height: calc(100vh - 112px);
  display: flex;
  align-items: center;
  padding-top: 2rem;
}

.landing-hero-grid,
.landing-feature-dock,
.landing-demo-panel,
.landing-team-grid,
.landing-contact-panel {
  display: grid;
  gap: 2rem;
  align-items: center;
}

.landing-hero-grid {
  grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr);
}

.landing-hero-actions {
  grid-column: 1;
}

.landing-feature-dock,
.landing-demo-panel,
.landing-team-grid,
.landing-contact-panel {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.landing-hero-copy {
  display: grid;
  gap: 1.5rem;
  align-content: center;
  padding: clamp(1rem, 2vw, 1.5rem) 0;
}

.landing-title,
.landing-section-title {
  font-family: 'Avenir Next', Avenir, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 900;
  line-height: 0.94;
  letter-spacing: 0;
  color: #1e2f2c;
}

.landing-title {
  display: grid;
  gap: 0.1em;
  max-width: 12.5ch;
  font-size: clamp(3rem, 6.1vw, 6rem);
  line-height: 0.92;
  text-wrap: balance;
}

.landing-title span {
  display: block;
}

.landing-title strong {
  color: #b55d3f;
  font: inherit;
}

.landing-section-title {
  max-width: 900px;
  font-size: clamp(2.15rem, 3.7vw, 4.1rem);
  line-height: 1;
}

.landing-text,
.landing-card-text {
  color: rgba(31, 52, 47, 0.68);
  line-height: 1.65;
}

.landing-text-emphasis {
  color: #b55d3f;
  font-size: 1.08em;
  font-weight: 900;
}

.landing-text-emphasis--large {
  font-size: clamp(1.08em, 1.8vw, 1.24em);
}

.landing-text--hero {
  max-width: 34rem;
  font-size: clamp(1.05rem, 1.5vw, 1.26rem);
}

.landing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
}

.landing-beta-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #b55d3f;
  font-size: 0.94rem;
  font-weight: 800;
  text-decoration: none;
  transition: gap 180ms ease, color 180ms ease;
}

.landing-beta-link:hover {
  gap: 0.65rem;
  color: #24443f;
}

.landing-btn {
  min-height: 46px;
  text-transform: none;
  font-weight: 800;
}

.landing-btn--hero,
.landing-btn--primary {
  color: #fffaf1;
  background: linear-gradient(135deg, #b55d3f, #d17b58);
  border: 1px solid rgba(181, 93, 63, 0.2);
  box-shadow: 0 18px 38px rgba(181, 93, 63, 0.18);
}

.landing-btn--ghost {
  color: #1f342f;
  background: rgba(255, 255, 255, 0.64);
  border-color: rgba(31, 52, 47, 0.18);
}

.landing-btn--ghost-dark {
  color: #24443f;
  background: rgba(255, 255, 255, 0.52);
  border-color: rgba(36, 68, 63, 0.2);
}

.landing-hero-stage {
  position: relative;
  min-height: 560px;
  border-radius: 0;
  overflow: hidden;
  background: transparent;
}

.landing-hero-image {
  width: 100%;
  min-height: 560px;
  filter: drop-shadow(0 28px 48px rgba(31, 52, 47, 0.14));
}

.landing-section-label,
.landing-card-index,
.landing-feature-tab span {
  color: #b55d3f;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.landing-heading {
  display: grid;
  gap: 0.8rem;
  max-width: 720px;
  margin-bottom: 2rem;
}

.landing-heading--offer {
  max-width: none;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  gap: 2rem;
  align-items: end;
}

.landing-heading__main {
  display: grid;
  gap: 0.8rem;
}

.landing-heading__text {
  max-width: 27rem;
  margin-left: auto;
}

.landing-heading--split {
  max-width: none;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.65fr);
  align-items: end;
}

.landing-offer-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.05rem;
  perspective: 1200px;
}

.landing-offer-controls {
  display: none;
}

.landing-offer-card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 1.15rem;
  min-height: 330px;
  padding: 1.45rem;
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 0%, rgba(181, 93, 63, 0.14), transparent 34%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(255, 248, 241, 0.86));
  border: 1px solid rgba(31, 52, 47, 0.1);
  box-shadow:
    0 22px 54px rgba(31, 52, 47, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform-origin: center bottom;
  transition:
    transform 240ms ease,
    box-shadow 240ms ease,
    border-color 240ms ease,
    background 240ms ease;
}

.landing-offer-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.72) 46%, transparent 72%);
  opacity: 0;
  transform: translateX(-55%);
  transition: opacity 220ms ease, transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.landing-offer-card:nth-child(2) {
  animation-delay: 80ms;
  background:
    radial-gradient(circle at 18% 0%, rgba(35, 71, 68, 0.13), transparent 34%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(242, 249, 246, 0.88));
}

.landing-offer-card:nth-child(3) {
  animation-delay: 160ms;
  background:
    radial-gradient(circle at 18% 0%, rgba(10, 102, 194, 0.1), transparent 34%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(244, 248, 252, 0.88));
}

.landing-offer-card:nth-child(4) {
  animation-delay: 240ms;
  background:
    radial-gradient(circle at 18% 0%, rgba(181, 93, 63, 0.11), transparent 34%),
    linear-gradient(155deg, rgba(255, 255, 255, 0.96), rgba(250, 245, 238, 0.9));
}

.landing-offer-card.landing-reveal,
.landing-founder-card.landing-reveal {
  transition:
    opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    transform 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    filter 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.landing-offer-card::after {
  content: '';
  position: absolute;
  inset: auto 1.45rem 1.25rem 1.45rem;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #b55d3f, rgba(35, 71, 68, 0.34), transparent);
  transform: scaleX(0.34);
  transform-origin: left;
  transition: transform 240ms ease;
}

.landing-offer-card:hover,
.landing-founder-card:hover,
.landing-feature-tab:hover {
  transform: translateY(-8px);
  border-color: rgba(181, 93, 63, 0.28);
  box-shadow: 0 24px 56px rgba(31, 52, 47, 0.12);
}

.landing-offer-card:hover {
  transform: translateY(-10px) rotateX(2deg);
  box-shadow:
    0 30px 72px rgba(31, 52, 47, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.landing-offer-card:hover::before {
  opacity: 1;
  transform: translateX(55%);
}

.landing-offer-card:hover::after {
  transform: scaleX(1);
}

.landing-offer-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.landing-offer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  color: #fffaf1;
  background: linear-gradient(135deg, #24443f, #b55d3f);
  box-shadow: 0 14px 28px rgba(31, 52, 47, 0.16);
  transition: transform 240ms ease, box-shadow 240ms ease;
}

.landing-offer-card:nth-child(2) .landing-offer-icon {
  background: linear-gradient(135deg, #24443f, #3b6a65);
}

.landing-offer-card:nth-child(3) .landing-offer-icon {
  background: linear-gradient(135deg, #0a66c2, #24443f);
}

.landing-offer-card:hover .landing-offer-icon {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 18px 36px rgba(31, 52, 47, 0.2);
}

.landing-offer-title {
  position: relative;
  z-index: 1;
  font-size: clamp(1.35rem, 2vw, 1.7rem);
}

.landing-offer-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.85rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.landing-offer-list li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: rgba(31, 52, 47, 0.72);
  font-weight: 650;
  line-height: 1.35;
  transition: color 180ms ease, transform 180ms ease;
}

.landing-offer-list li::before {
  content: '';
  flex: 0 0 auto;
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: #b55d3f;
  box-shadow: 0 0 0 0.28rem rgba(181, 93, 63, 0.1);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.landing-offer-card:hover .landing-offer-list li {
  color: rgba(31, 52, 47, 0.84);
}

.landing-offer-card:hover .landing-offer-list li:nth-child(1) {
  transform: translateX(2px);
}

.landing-offer-card:hover .landing-offer-list li:nth-child(2) {
  transform: translateX(4px);
}

.landing-offer-card:hover .landing-offer-list li:nth-child(3) {
  transform: translateX(6px);
}

.landing-offer-card:hover .landing-offer-list li:nth-child(4) {
  transform: translateX(8px);
}

.landing-offer-card:hover .landing-offer-list li::before {
  transform: scale(1.14);
  box-shadow: 0 0 0 0.34rem rgba(181, 93, 63, 0.13);
}

.landing-card-title {
  font-size: clamp(1.08rem, 1.5vw, 1.28rem);
  font-weight: 800;
  line-height: 1.2;
  color: #1f342f;
}

.landing-feature-dock {
  grid-template-columns: minmax(280px, 0.78fr) minmax(0, 1.22fr);
  align-items: stretch;
  padding: 1rem;
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(31, 52, 47, 0.1);
  box-shadow: 0 28px 70px rgba(31, 52, 47, 0.1);
  backdrop-filter: blur(18px);
}

.landing-feature-tabs {
  display: grid;
  gap: 0.8rem;
}

.landing-feature-controls {
  display: none;
}

.landing-feature-tab {
  display: grid;
  gap: 0.38rem;
  width: 100%;
  min-height: 108px;
  padding: 1rem;
  text-align: left;
  border-radius: 20px;
  border: 1px solid rgba(31, 52, 47, 0.08);
  background: rgba(255, 253, 248, 0.78);
  color: inherit;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
}

.landing-feature-tab strong {
  color: #1f342f;
  font-size: 1rem;
}

.landing-feature-tab small {
  color: rgba(31, 52, 47, 0.62);
  line-height: 1.45;
}

.landing-feature-tab--active {
  background: linear-gradient(135deg, rgba(35, 71, 68, 0.96), rgba(47, 90, 86, 0.94));
  border-color: rgba(35, 71, 68, 0.24);
  box-shadow: 0 20px 42px rgba(35, 71, 68, 0.16);
}

.landing-feature-tab--active span,
.landing-feature-tab--active strong,
.landing-feature-tab--active small {
  color: #fffaf1;
}

.landing-feature-preview {
  align-self: center;
  display: grid;
  place-items: center;
  height: clamp(250px, 33vw, 430px);
  min-height: 0;
  padding: 0.9rem;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(181, 93, 63, 0.14), rgba(35, 71, 68, 0.12)),
    #fffaf1;
  overflow: hidden;
}

.landing-feature-preview__image,
.landing-login-stack__image {
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 44px rgba(31, 52, 47, 0.14);
}

.landing-feature-preview__image :deep(.v-img__img),
.landing-login-stack__image :deep(.v-img__img) {
  object-fit: cover !important;
  object-position: center;
}

.landing-demo-panel,
.landing-team-grid,
.landing-contact-panel {
  padding: clamp(1.2rem, 3vw, 2rem);
  border-radius: 34px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(31, 52, 47, 0.1);
  box-shadow: 0 24px 60px rgba(31, 52, 47, 0.1);
  backdrop-filter: blur(18px);
}

.landing-demo-copy,
.landing-team-copy {
  display: grid;
  gap: 1.05rem;
  align-content: center;
}

.landing-login-stack {
  min-height: 420px;
  padding: 0.85rem;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(181, 93, 63, 0.14), rgba(35, 71, 68, 0.12)),
    #fffaf1;
}

.landing-founder-stack {
  display: grid;
  gap: 1.15rem;
}

.landing-founder-card {
  display: flex;
  align-items: center;
  gap: 1.35rem;
  min-height: 168px;
  padding: 1.35rem;
  border-radius: 28px;
  background: rgba(255, 253, 248, 0.86);
  border: 1px solid rgba(31, 52, 47, 0.1);
  box-shadow: 0 20px 44px rgba(31, 52, 47, 0.1);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.landing-founder-avatar {
  flex: 0 0 auto;
  border: 4px solid rgba(255, 250, 241, 0.95);
  background: #fffaf1;
  box-shadow: 0 18px 34px rgba(31, 52, 47, 0.16);
}

.landing-founder-tag {
  background: rgba(35, 71, 68, 0.1);
  color: #24443f;
  font-weight: 800;
  text-transform: uppercase;
}

.landing-contact-panel {
  grid-template-columns: minmax(0, 1fr) auto;
  position: relative;
  overflow: hidden;
  min-height: 390px;
  padding: clamp(1.6rem, 4vw, 3.2rem);
  background:
    linear-gradient(135deg, rgba(181, 93, 63, 0.18), transparent 36%),
    linear-gradient(225deg, rgba(35, 71, 68, 0.12), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 250, 241, 0.82));
}

.landing-contact-panel::before {
  content: '';
  position: absolute;
  inset: 1rem;
  border: 1px solid rgba(31, 52, 47, 0.08);
  border-radius: 26px;
  pointer-events: none;
}

.landing-contact-panel::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: min(38%, 22rem);
  height: 100%;
  background:
    linear-gradient(90deg, transparent, rgba(35, 71, 68, 0.08)),
    repeating-linear-gradient(
      135deg,
      rgba(35, 71, 68, 0.08) 0,
      rgba(35, 71, 68, 0.08) 1px,
      transparent 1px,
      transparent 18px
    );
  mask-image: linear-gradient(90deg, transparent, #000 34%);
  pointer-events: none;
}

.landing-contact-copy,
.landing-contact-card {
  position: relative;
  z-index: 1;
}

.landing-contact-copy {
  display: grid;
  gap: 1.15rem;
  max-width: 710px;
}

.landing-contact-copy .landing-text {
  max-width: 42rem;
  font-size: clamp(1.03rem, 1.45vw, 1.2rem);
}

.landing-coach-callout {
  display: grid;
  gap: 1rem;
  max-width: 620px;
  padding: 1.15rem 1.25rem;
  border: 1px solid rgba(181, 93, 63, 0.2);
  border-radius: 20px;
  background: rgba(255, 250, 241, 0.64);
  box-shadow: 0 14px 30px rgba(31, 52, 47, 0.06);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.landing-coach-callout:hover {
  transform: translateY(-3px);
  border-color: rgba(181, 93, 63, 0.38);
  box-shadow: 0 20px 38px rgba(31, 52, 47, 0.1);
}

.landing-coach-callout__eyebrow {
  display: block;
  margin-bottom: 0.3rem;
  color: #b55d3f;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.landing-coach-callout h3 {
  margin: 0;
  color: #24443f;
  font-family: 'Avenir Next', Avenir, Inter, sans-serif;
  font-size: clamp(1.25rem, 2vw, 1.65rem);
  line-height: 1.1;
}

.landing-coach-callout p {
  max-width: 40rem;
  margin: 0.5rem 0 0;
  color: rgba(31, 52, 47, 0.72);
  font-size: 0.96rem;
  line-height: 1.55;
}

.landing-coach-callout__action {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  width: fit-content;
  color: #24443f;
  font-size: 0.9rem;
  font-weight: 900;
  text-decoration: none;
  transition: color 180ms ease, gap 180ms ease;
}

.landing-coach-callout__action:hover {
  gap: 1rem;
  color: #b55d3f;
}

.landing-contact-card {
  display: grid;
  gap: 1rem;
  width: min(100%, 430px);
  padding: 0.9rem;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255, 253, 248, 0.98), rgba(255, 248, 241, 0.92));
  border: 1px solid rgba(31, 52, 47, 0.12);
  box-shadow:
    0 30px 70px rgba(31, 52, 47, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.landing-contact-link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  min-height: 96px;
  padding: 1.1rem;
  border-radius: 22px;
  color: #1f342f;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(31, 52, 47, 0.09);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
}

.landing-contact-link:hover {
  transform: translateY(-3px);
  border-color: rgba(181, 93, 63, 0.22);
  box-shadow: 0 22px 44px rgba(31, 52, 47, 0.12);
  background: rgba(255, 255, 255, 0.88);
}

.landing-contact-link--primary {
  color: #fffaf1;
  background: linear-gradient(135deg, #24443f, #b55d3f);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 18px 42px rgba(181, 93, 63, 0.2);
}

.landing-contact-link--primary:hover {
  background: linear-gradient(135deg, #1f342f, #c66b49);
  border-color: rgba(255, 255, 255, 0.38);
}

.landing-contact-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.4);
}

.landing-contact-link--primary .landing-contact-link__icon {
  background: rgba(255, 250, 241, 0.14);
}

.landing-contact-link__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.landing-contact-link small,
.landing-contact-link strong {
  display: block;
}

.landing-contact-link small {
  margin-bottom: 0.15rem;
  color: rgba(31, 52, 47, 0.58);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-contact-link strong {
  overflow-wrap: anywhere;
  font-size: clamp(1.02rem, 1.25vw, 1.14rem);
  line-height: 1.25;
}

.landing-contact-link--primary small {
  color: rgba(255, 250, 241, 0.72);
}

.landing-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 0;
  border-top: 1px solid rgba(31, 52, 47, 0.1);
}

.landing-footer__identity,
.landing-footer__links {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.landing-footer__links {
  gap: 1.25rem;
}

.landing-footer__links a {
  color: rgba(31, 52, 47, 0.66);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
  transition: color 180ms ease;
}

.landing-footer__links a:hover {
  color: #b55d3f;
}

.landing-footer__brand {
  color: #1f342f;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.landing-footer__text {
  color: rgba(31, 52, 47, 0.58);
  font-size: 0.86rem;
}

.landing-scroll-top {
  position: fixed;
  right: clamp(1rem, 3vw, 2rem);
  bottom: max(1rem, env(safe-area-inset-bottom));
  z-index: 6;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 50%;
  color: #fffaf1;
  background: linear-gradient(145deg, #234744, #b55d3f);
  box-shadow: 0 16px 34px rgba(31, 52, 47, 0.22);
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.landing-scroll-top:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px rgba(31, 52, 47, 0.28);
}

.landing-scroll-top:focus-visible {
  outline: 3px solid rgba(181, 93, 63, 0.35);
  outline-offset: 3px;
}

@media (max-width: 960px) {
  .landing-section {
    padding: 3rem 0;
  }

  .landing-section--hero {
    min-height: auto;
  }

  .landing-hero-grid,
  .landing-feature-dock,
  .landing-demo-panel,
  .landing-team-grid,
  .landing-contact-panel,
  .landing-heading--offer,
  .landing-heading--split {
    grid-template-columns: 1fr;
  }

  .landing-title,
  .landing-section-title,
  .landing-text--hero {
    max-width: none;
  }

  .landing-heading__text {
    max-width: 100%;
    margin-left: 0;
  }

  .landing-hero-stage,
  .landing-hero-image {
    min-height: 430px;
  }

  .landing-offer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing-feature-preview,
  .landing-feature-preview__image,
  .landing-login-stack__image {
    min-height: 0;
  }

  .landing-contact-panel {
    align-items: start;
  }

  .landing-contact-card {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .landing-page {
    padding-inline: 0.75rem !important;
  }

  .landing-nav {
    top: 8px;
  }

  .landing-section {
    padding: 2.75rem 0;
  }

  .landing-section--hero {
    min-height: calc(100svh - 92px);
    padding-top: 0.8rem;
    padding-bottom: 1.4rem;
  }

  .landing-hero-grid {
    gap: 0.8rem;
  }

  .landing-hero-copy {
    gap: 0.9rem;
    padding: 0;
  }

  .landing-hero-actions {
    grid-column: 1;
  }

  .landing-title {
    font-size: clamp(2.5rem, 12.2vw, 3.35rem);
    line-height: 0.98;
    transform: translateY(0.35rem);
  }

  .landing-section-title {
    font-size: clamp(1.95rem, 9.5vw, 2.8rem);
    line-height: 1;
  }

  .landing-heading--split,
  .landing-heading--offer {
    gap: 0.8rem;
  }

  .landing-offer-grid {
    grid-auto-flow: column;
    grid-auto-columns: minmax(86vw, 1fr);
    grid-template-columns: none;
    gap: 1rem;
    margin-inline: -0.25rem;
    padding: 0.25rem 0.25rem 0.9rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 0.25rem;
    scrollbar-width: none;
    scroll-behavior: smooth;
  }

  .landing-offer-grid::-webkit-scrollbar,
  .landing-feature-tabs::-webkit-scrollbar,
  .landing-founder-stack::-webkit-scrollbar {
    display: none;
  }

  .landing-offer-card,
  .landing-feature-tab,
  .landing-founder-card {
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  .landing-offer-card {
    min-height: 305px;
    padding: 1.25rem;
    border-radius: 24px;
    box-shadow: 0 18px 38px rgba(31, 52, 47, 0.12);
  }

  .landing-offer-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0.1rem 0 0.2rem;
    padding-inline: 0.15rem;
  }

  .landing-offer-control {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border: 1px solid rgba(35, 71, 68, 0.14);
    border-radius: 50%;
    color: #234744;
    background: rgba(255, 253, 248, 0.86);
    box-shadow: 0 8px 18px rgba(31, 52, 47, 0.08);
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease;
  }

  .landing-offer-control:active {
    transform: scale(0.94);
  }

  .landing-offer-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  }

  .landing-offer-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(35, 71, 68, 0.2);
    transition: width 180ms ease, border-radius 180ms ease, background 180ms ease;
  }

  .landing-offer-dot--active {
    width: 22px;
    border-radius: 999px;
    background: #b55d3f;
  }

  .landing-hero-stage,
  .landing-hero-image {
    min-height: 0;
    height: clamp(190px, 30svh, 260px);
  }

  .landing-feature-dock,
  .landing-demo-panel,
  .landing-team-grid,
  .landing-contact-panel {
    padding: 0.85rem;
    border-radius: 24px;
  }

  .landing-feature-tabs {
    display: flex;
    gap: 0.8rem;
    margin-inline: -0.05rem;
    padding: 0.15rem 0.05rem 0.8rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-inline: contain;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .landing-feature-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: -0.2rem;
  }

  .landing-feature-control {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    border: 1px solid rgba(35, 71, 68, 0.14);
    border-radius: 50%;
    color: #234744;
    background: rgba(255, 253, 248, 0.86);
    box-shadow: 0 8px 18px rgba(31, 52, 47, 0.08);
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease;
  }

  .landing-feature-control:active {
    transform: scale(0.94);
  }

  .landing-feature-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  }

  .landing-feature-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(35, 71, 68, 0.2);
    transition: width 180ms ease, border-radius 180ms ease, background 180ms ease;
  }

  .landing-feature-dot--active {
    width: 22px;
    border-radius: 999px;
    background: #b55d3f;
  }

  .landing-offer-grid,
  .landing-feature-tabs,
  .landing-founder-stack {
    scrollbar-width: thin;
    scrollbar-color: rgba(35, 71, 68, 0.48) rgba(35, 71, 68, 0.1);
  }

  .landing-offer-grid::-webkit-scrollbar,
  .landing-feature-tabs::-webkit-scrollbar,
  .landing-founder-stack::-webkit-scrollbar {
    display: block;
    height: 5px;
  }

  .landing-offer-grid::-webkit-scrollbar-track,
  .landing-feature-tabs::-webkit-scrollbar-track,
  .landing-founder-stack::-webkit-scrollbar-track {
    border-radius: 999px;
    background: rgba(35, 71, 68, 0.1);
  }

  .landing-offer-grid::-webkit-scrollbar-thumb,
  .landing-feature-tabs::-webkit-scrollbar-thumb,
  .landing-founder-stack::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(35, 71, 68, 0.48);
  }

  .landing-feature-tab {
    flex: 0 0 84vw;
    min-height: 138px;
  }

  .landing-founder-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
    margin: 0;
    padding: 0.15rem 0 0.2rem;
    overflow: visible;
  }

  .landing-founder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.7rem;
    min-height: 0;
    padding: 1rem 0.55rem;
    border-radius: 20px;
    text-align: center;
  }

  .landing-founder-avatar {
    width: 82px !important;
    height: 82px !important;
  }

  .landing-founder-card .landing-card-title {
    font-size: 0.92rem;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .landing-founder-card .landing-card-text {
    font-size: 0.8rem;
  }

  .landing-founder-card .landing-founder-tag {
    font-size: 0.68rem;
  }

  .landing-demo-panel .landing-login-stack {
    grid-row: 1;
  }

  .landing-demo-panel .landing-demo-copy {
    grid-row: 2;
  }

  .landing-feature-preview,
  .landing-feature-preview__image,
  .landing-login-stack,
  .landing-login-stack__image {
    min-height: 0;
  }

  .landing-actions,
  .landing-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .landing-footer {
    align-items: center;
    gap: 0.45rem;
    padding: 1.5rem 0 1.25rem;
    text-align: center;
  }

  .landing-footer__identity,
  .landing-footer__links {
    flex-direction: column;
    gap: 0.4rem;
  }

  .landing-footer__links {
    margin-top: 0.45rem;
    gap: 0.55rem;
    width: 100%;
    padding-top: 0.7rem;
    border-top: 1px solid rgba(31, 52, 47, 0.08);
  }

  .landing-footer__brand {
    font-size: 0.9rem;
  }

  .landing-footer__text {
    max-width: 100%;
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .landing-footer__links a {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
  }

  .landing-actions {
    gap: 0.7rem;
  }

  .landing-actions .landing-btn,
  .landing-beta-link {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  .landing-beta-link {
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    line-height: 1.35;
  }

  .landing-contact-copy .landing-text,
  .landing-demo-copy .landing-text {
    font-size: 1rem;
  }

  .landing-scroll-top {
    right: 1rem;
    bottom: max(1rem, env(safe-area-inset-bottom));
    width: 46px;
    height: 46px;
  }

  .landing-contact-panel::before,
  .landing-contact-panel::after {
    display: none;
  }

  .landing-contact-card {
    padding: 0.55rem;
    border-radius: 20px;
  }

  .landing-contact-link {
    min-height: 74px;
    padding: 0.78rem;
    border-radius: 16px;
  }

  .landing-contact-link__icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-reveal {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }
}
</style>

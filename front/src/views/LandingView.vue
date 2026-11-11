<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import LearningJourney from '@/components/LearningJourney.vue'
import MarketingNavbar from '@/components/MarketingNavbar.vue'
import SalaryNegotiationExperience from '@/components/SalaryNegotiationExperience.vue'
import mailLogoUrl from '@/assets/logo-mail.svg'
import linkedinLogoUrl from '@/assets/logo-linkedin.svg'

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
  { label: 'Simulation', href: '#simulation' },
  { label: 'Équipe', href: '#equipe' },
  { label: 'Contact', href: '#contact' },
]

const currentYear = computed(() => new Date().getFullYear())
const showScrollTop = ref(false)
const heroCta = ref(null)
const arrowVisible = ref(false)
const pointerReady = ref(false)
const arrowPosition = ref({ x: 0, y: 0, angle: 0, distance: 0 })
let heroCtaObserver
let pointerFrame

const showCtaArrow = computed(
  () => arrowVisible.value && pointerReady.value && arrowPosition.value.distance > 110,
)

const arrowStyle = computed(() => {
  const normalizedDistance = Math.min(1, arrowPosition.value.distance / 700)
  const arrowLength = Math.min(132, Math.max(42, arrowPosition.value.distance * 0.24))
  return {
    left: `${arrowPosition.value.x}px`,
    top: `${arrowPosition.value.y}px`,
    width: `${arrowLength}px`,
    transform: `translate(-50%, -50%) rotate(${arrowPosition.value.angle}deg)`,
    '--arrow-duration': `${1.4 - normalizedDistance * 0.45}s`,
  }
})

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 420
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handlePointerMove = (event) => {
  if (pointerFrame) return

  pointerFrame = window.requestAnimationFrame(() => {
    pointerFrame = null
    const buttonElement = heroCta.value?.$el || heroCta.value
    if (!buttonElement) return

    const buttonRect = buttonElement.getBoundingClientRect()
    const arrowX = event.clientX - 30
    const arrowY = event.clientY + 24
    const targetX = buttonRect.left + buttonRect.width / 2
    const targetY = buttonRect.top + buttonRect.height / 2
    const deltaX = targetX - arrowX
    const deltaY = targetY - arrowY

    arrowPosition.value = {
      x: arrowX,
      y: arrowY,
      angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
      distance: Math.hypot(deltaX, deltaY),
    }
    pointerReady.value = true
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })

  const buttonElement = heroCta.value?.$el || heroCta.value
  if (buttonElement) {
    heroCtaObserver = new IntersectionObserver(
      ([entry]) => {
        arrowVisible.value = entry.isIntersecting && entry.intersectionRatio > 0.55
      },
      { threshold: [0, 0.55, 1] },
    )
    heroCtaObserver.observe(buttonElement)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('pointermove', handlePointerMove)
  heroCtaObserver?.disconnect()
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
})

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
              Préparez vos échanges, entraînez-vous à répondre aux objections et avancez avec des conseils adaptés à votre situation.
            </p>
            <div class="landing-actions landing-hero-actions">
              <v-btn ref="heroCta" :to="ROUTE_PATHS.login" size="large" rounded="pill" class="landing-btn landing-btn--hero">
                Rejoindre Persuade
              </v-btn>
              <v-btn href="#offre" size="large" rounded="pill" variant="outlined" class="landing-btn landing-btn--ghost">
                Découvrir notre méthode
              </v-btn>
            </div>
          </div>

          <div class="landing-hero-stage" v-reveal>
            <v-img
              src="/AcceuilAnimation.png"
              alt="Illustration d'accueil Persuade"
              contain
              eager
              class="landing-hero-image"
            />
          </div>

        </div>
      </section>

      <Transition name="cta-arrow">
        <div
          v-if="showCtaArrow"
          class="landing-cta-arrow"
          :style="arrowStyle"
          aria-hidden="true"
        >
          <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="presentation">
            <defs>
              <linearGradient id="cta-arrow-gradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stop-color="#24443f" />
                <stop offset="1" stop-color="#c66b49" />
              </linearGradient>
            </defs>
            <path class="landing-cta-arrow__line" d="M3 12 L 91 12" />
            <path class="landing-cta-arrow__head" d="M83 4 L 94 12 L 83 20" />
          </svg>
        </div>
      </Transition>

      <section id="offre" class="landing-section landing-section--offer">
        <div class="landing-heading landing-heading--offer" v-reveal>
          <div class="landing-heading__main">
            <div class="landing-section-label">Votre prochaine négociation</div>
            <h2 class="landing-section-title">Préparez-la. Testez vos réponses. Puis passez à l’action.</h2>
          </div>
          <p class="landing-text landing-heading__text">
            Partez d’une situation concrète, essayez différentes approches et travaillez les moments qui vous posent
            vraiment problème.
          </p>
        </div>
        <LearningJourney />
      </section>

      <section id="simulation" class="landing-section landing-section--simulation">
        <SalaryNegotiationExperience v-reveal />
      </section>

      <section id="equipe" class="landing-section landing-section--team">
        <div class="landing-heading landing-heading--split" v-reveal>
          <div>
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
            <h2 class="landing-section-title">Construisons la suite ensemble.</h2>
          </div>
          <p class="landing-text">Une question ou envie de rejoindre l'aventure Persuade ?</p>
        </div>
        <div class="landing-contact-panel" v-reveal>
          <div class="landing-contact-copy">
            <p class="landing-text">
              Une question, une demande d'accès ou l'envie de faire progresser votre équipe ? Contactez-nous
              directement par email ou suivez l'avancée du projet sur LinkedIn.
            </p>
            <div class="landing-coach-callout">
              <div>
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

.landing-cta-arrow {
  position: fixed;
  z-index: 20;
  width: 54px;
  height: 24px;
  pointer-events: none;
  transform-origin: center;
  will-change: left, top, width, transform;
  transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.landing-cta-arrow svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 5px 8px rgba(31, 52, 47, 0.14));
  animation: cta-arrow-breathe var(--arrow-duration) ease-in-out infinite;
}

.landing-cta-arrow path {
  fill: none;
  stroke: url('#cta-arrow-gradient');
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.landing-cta-arrow__line {
  stroke-dasharray: none;
}

.landing-cta-arrow__head {
  stroke-width: 2.7 !important;
}

.cta-arrow-enter-active,
.cta-arrow-leave-active {
  transition: opacity 260ms ease, scale 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cta-arrow-enter-from,
.cta-arrow-leave-to {
  opacity: 0;
  scale: 0.72;
}

@keyframes cta-arrow-breathe {
  0%, 100% { opacity: 0.78; }
  50% { opacity: 1; }
}

.landing-hero-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border-radius: 26px;
  overflow: hidden;
  background: transparent;
}

.landing-hero-image {
  width: 100%;
  height: 100%;
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
    grid-auto-columns: minmax(90vw, 1fr);
    grid-template-columns: none;
    gap: 1rem;
    margin-inline: -0.25rem;
    padding: 0.25rem 0.25rem 0.9rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-inline: contain;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-snap-stop: always;
    scroll-padding-inline: 0.25rem;
    scrollbar-width: none;
    scroll-behavior: smooth;
    touch-action: pan-x;
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
    transform: none !important;
    transition: opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
      filter 720ms cubic-bezier(0.22, 1, 0.36, 1) var(--reveal-delay, 0ms),
      box-shadow 180ms ease;
  }

  .landing-offer-card:hover,
  .landing-offer-card:active {
    transform: none !important;
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

  .landing-hero-stage {
    aspect-ratio: auto;
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

@media (hover: none), (pointer: coarse) {
  .landing-cta-arrow { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .landing-cta-arrow svg { animation: none; }
  .landing-reveal {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }
}
</style>

<script setup>
import { ROUTE_PATHS } from '@/router/paths'
import logoUrl from '@/assets/logo.png'

const painPoints = [
  {
    value: '01',
    title: 'Une forte demande côté coachs',
    text: 'Les coachs et formateurs recherchent des outils concrets, modernes et réellement utiles pour accompagner efficacement leurs clients en négociation.',
  },
  {
    value: '02',
    title: 'Un accès à la formation encore trop coûteux',
    text: "Pour les freelances, auto-entrepreneurs et petites structures, l'accès à des formations de qualité reste encore freiné par des coûts élevés.",
  },
  {
    value: '03',
    title: 'Un manque de formation adaptée dans le temps',
    text: "Les closers et indépendants trouvent encore peu de solutions pour progresser durablement et s'entraîner régulièrement.",
  },
]

const features = [
  {
    title: 'Dashboard',
    text: 'Retrouvez sur un seul écran votre progression, vos indicateurs clés et les éléments importants de votre parcours pour garder une lecture claire de votre évolution.',
    image: '/landing/Dashboard.png',
    accent: 'Dashboard',
  },
  {
    title: 'Masterclass',
    text: 'Explorez des masterclass conçues pour approfondir les techniques, affiner votre posture et progresser sur les fondamentaux de la négociation.',
    image: '/landing/Masterclass.png',
    accent: 'Masterclass',
  },
  {
    title: 'Cours préenregistrés',
    text: 'Accédez à des cours préenregistrés pour apprendre à votre rythme, revenir facilement sur les notions essentielles et structurer votre progression dans le temps.',
    image: '/landing/Courpreenregistrer.png',
    accent: 'Cours',
  },
  {
    title: 'Chat',
    text: "Profitez d'un espace de chat simple et direct pour fluidifier les échanges, poser vos questions et renforcer l'accompagnement autour de la plateforme.",
    image: '/landing/Chat.png',
    accent: 'Chat',
  },
]

const founders = [
  {
    initials: 'CD',
    name: 'Côme Du Parc Locmaria',
    role: 'Co-fondateur',
  },
  {
    initials: 'SR',
    name: 'Salman Rezki',
    role: 'Co-fondateur',
  },
]

const teamHighlights = [
  'Produit pensé pour la pratique',
  'Vision long terme de la progression',
  'Construction au contact des utilisateurs',
]
</script>

<template>
  <div class="landing-shell">
    <div class="landing-glow landing-glow--left" aria-hidden="true"></div>
    <div class="landing-glow landing-glow--right" aria-hidden="true"></div>

    <header class="landing-topbar">
      <div class="landing-frame landing-topbar__inner">
        <div class="landing-brand">
          <span class="landing-brand__mark">
            <img :src="logoUrl" alt="Logo Persuade" width="56" height="56" />
          </span>
          <span class="landing-brand__copy">
            <strong>Persuade</strong>
            <span>Plateforme interactive de négociation</span>
          </span>
        </div>

        <nav class="landing-nav landing-nav--desktop" aria-label="Navigation principale">
          <a href="#vision">Vision</a>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#preview">Aperçu</a>
          <a href="#equipe">Équipe</a>
          <a href="#contact">Contact</a>
          <RouterLink :to="ROUTE_PATHS.login" class="landing-login-button">
            Se connecter
          </RouterLink>
        </nav>

        <details class="landing-mobile-nav">
          <summary class="landing-mobile-nav__trigger" aria-label="Ouvrir le menu">
            <span>Menu</span>
            <span class="landing-mobile-nav__icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </summary>

          <nav class="landing-mobile-nav__panel" aria-label="Navigation mobile">
            <a href="#vision">Vision</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#preview">Aperçu</a>
            <a href="#equipe">Équipe</a>
            <a href="#contact">Contact</a>
            <RouterLink :to="ROUTE_PATHS.login" class="landing-login-button landing-login-button--mobile">
              Se connecter
            </RouterLink>
          </nav>
        </details>
      </div>
    </header>

    <main id="hero" class="landing-hero">
      <div class="landing-frame landing-hero__grid">
        <section class="landing-hero__content">
          <div class="landing-copy">
            <p class="landing-kicker">Persuade</p>
            <h1 class="landing-title">Réinventez votre manière de négocier.</h1>
            <p class="landing-slogan">
              Une plateforme simple, visuelle et interactive pour apprendre, pratiquer et progresser.
            </p>
            <div class="landing-hero__actions">
              <RouterLink :to="ROUTE_PATHS.login" class="landing-contact-link landing-contact-link--hero">
                Tester la démo
              </RouterLink>
              <a href="#fonctionnalites" class="landing-contact-link landing-contact-link--secondary">
                Découvrir
              </a>
            </div>
          </div>
        </section>

        <section id="preview" class="landing-hero__visual">
          <div class="landing-shot">
            <img src="/landing/Dashboard.png" alt="Aperçu de la plateforme Persuade" />
          </div>
        </section>
      </div>
    </main>

    <section id="vision" class="landing-section">
      <div class="landing-frame">
        <div class="landing-section__heading">
          <p class="landing-section__eyebrow">Vision</p>
          <h2 class="landing-section__title">Notre vision</h2>
          <p class="landing-section__text">
            Nous avons étudié en profondeur le marché de la formation à la négociation. Trois constats majeurs ont fait émerger un besoin clair.
          </p>
        </div>

        <div class="landing-card-grid">
          <article v-for="item in painPoints" :key="item.title" class="landing-info-card">
            <span class="landing-info-card__index">{{ item.value }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="landing-section landing-section--tight">
      <div class="landing-frame">
        <div class="landing-response-card">
          <div>
            <p class="landing-section__eyebrow">Notre réponse</p>
            <p class="landing-section__text">
              Face à ces constats, nous avons décidé de lancer <strong>Persuade</strong> afin de démocratiser l'accès à la formation à la négociation. Une plateforme pensée pour accompagner les professionnels dans la durée, leur permettre de s'entraîner régulièrement et de progresser concrètement.
            </p>
          </div>

          <a href="#fonctionnalites" class="landing-contact-link landing-contact-link--secondary">
            Découvrir nos fonctionnalités
          </a>
        </div>
      </div>
    </section>

    <section id="fonctionnalites" class="landing-section landing-section--soft">
      <div class="landing-frame">
        <div class="landing-section__heading">
          <p class="landing-section__eyebrow">Fonctionnalités</p>
          <h2 class="landing-section__title">Fonctionnalités clés</h2>
          <p class="landing-section__text">
            Découvrez comment Persuade vous aide à progresser durablement grâce à des outils interactifs et immersifs.
          </p>
        </div>

        <div class="landing-feature-list">
          <article v-for="feature in features" :key="feature.title" class="landing-feature-card">
            <div class="landing-feature-card__copy">
              <span class="landing-feature-card__accent">{{ feature.accent }}</span>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.text }}</p>
            </div>

            <div class="landing-feature-card__shot">
              <img :src="feature.image" :alt="feature.title" />
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="preview" class="landing-section">
      <div class="landing-frame">
        <div class="landing-demo-card">
          <div class="landing-demo-card__copy">
            <p class="landing-section__eyebrow">Démo</p>
            <h2 class="landing-section__title">Accéder à la démo</h2>
            <p class="landing-section__text">
              Découvrez un aperçu de l’interface et testez l’entrée dans la plateforme via l’écran de connexion.
            </p>

            <div class="landing-demo-card__actions">
              <RouterLink :to="ROUTE_PATHS.login" class="landing-contact-link">
                Tester la démo
              </RouterLink>
              <a href="#contact" class="landing-contact-link landing-contact-link--secondary">
                Nous contacter
              </a>
            </div>
          </div>

          <div class="landing-demo-card__shot">
            <img src="/landing/Login.register.png" alt="Aperçu de l'écran de connexion Persuade" />
          </div>
        </div>
      </div>
    </section>

    <section id="equipe" class="landing-section landing-section--team">
      <div class="landing-frame landing-team-grid">
        <div class="landing-team-copy">
          <p class="landing-section__eyebrow">Qui sommes-nous</p>
          <h2 class="landing-section__title">Un projet construit à deux, avec une ambition claire.</h2>
          <p class="landing-section__text">
            Nous sommes deux étudiants passionnés de tech et d'innovation. En analysant le marché de la formation à la négociation, nous avons identifié une opportunité claire : créer un outil moderne, interactif et réellement utile.
          </p>
          <p class="landing-section__text">
            C'est ainsi qu'est née <strong>Persuade</strong> : une plateforme pensée pour apprendre en pratiquant, progresser vite et s'entraîner dans des conditions proches du réel.
          </p>

          <div class="landing-team-highlights">
            <div v-for="highlight in teamHighlights" :key="highlight" class="landing-team-highlights__item">
              {{ highlight }}
            </div>
          </div>

          <div class="landing-partner-badge">
            <img src="/landing/epitech-logo.png" alt="Logo Epitech" width="96" height="30" />
            <span>Projet né à Epitech</span>
          </div>
        </div>

        <div class="landing-team-list">
          <article v-for="person in founders" :key="person.name" class="landing-team-card">
            <div class="landing-team-card__avatar">{{ person.initials }}</div>
            <div>
              <h3>{{ person.name }}</h3>
              <p>{{ person.role }}</p>
              <span class="landing-team-card__tag">Persuade</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="contact" class="landing-section">
      <div class="landing-frame">
        <div class="landing-contact-card">
          <div>
            <p class="landing-section__eyebrow">Contact</p>
            <h2 class="landing-section__title">Discutons de Persuade.</h2>
            <p class="landing-section__text">
              Une question, un retour ou une demande d’accès ? Notre équipe reste joignable rapidement.
            </p>
          </div>

          <div class="landing-contact-card__actions">
            <a href="mailto:persuade.fr@gmail.com" class="landing-contact-link">persuade.fr@gmail.com</a>
            <a
              href="https://www.linkedin.com/company/persuade-fr/"
              target="_blank"
              rel="noreferrer"
              class="landing-contact-link landing-contact-link--secondary"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-frame landing-footer__inner">
        <div class="landing-footer__brand">
          <img :src="logoUrl" alt="Logo Persuade" width="52" height="52" />
          <span>Persuade</span>
        </div>
        <p>© {{ new Date().getFullYear() }} Persuade. Tous droits réservés.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing-shell {
  min-height: 100vh;
  color: #2a241d;
  background:
    radial-gradient(circle at top left, rgba(239, 190, 111, 0.22), transparent 30%),
    radial-gradient(circle at right 15%, rgba(102, 182, 170, 0.18), transparent 24%),
    linear-gradient(180deg, #fdf9f2 0%, #f5eee4 100%);
  overflow: hidden;
}

.landing-shell *,
.landing-shell *::before,
.landing-shell *::after {
  box-sizing: border-box;
}

.landing-shell a {
  color: inherit;
  text-decoration: none;
}

.landing-shell img {
  display: block;
  max-width: 100%;
}

.landing-glow {
  position: fixed;
  width: 22rem;
  height: 22rem;
  border-radius: 50%;
  filter: blur(24px);
  pointer-events: none;
  opacity: 0.7;
}

.landing-glow--left {
  top: -5rem;
  left: -7rem;
  background: rgba(239, 190, 111, 0.22);
}

.landing-glow--right {
  right: -8rem;
  bottom: -4rem;
  background: rgba(102, 182, 170, 0.2);
}

.landing-frame {
  width: min(calc(100% - 2rem), 1160px);
  margin: 0 auto;
}

.landing-topbar {
  position: relative;
  z-index: 2;
  padding: 0.8rem 0 0;
}

.landing-topbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid rgba(42, 36, 29, 0.08);
  border-radius: 24px;
  background: rgba(255, 252, 247, 0.78);
  backdrop-filter: blur(16px);
}

.landing-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.landing-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(244, 233, 219, 0.95));
}

.landing-brand__copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.landing-brand__copy strong {
  font-size: 0.98rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-brand__copy span {
  color: rgba(42, 36, 29, 0.62);
  font-size: 0.82rem;
}

.landing-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: rgba(42, 36, 29, 0.72);
  font-size: 0.9rem;
}

.landing-nav a {
  transition: opacity 180ms ease;
}

.landing-nav a:hover {
  opacity: 1;
}

.landing-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  color: #234744;
  background: linear-gradient(135deg, #d7f1eb, #bee4dc);
  border: 1px solid rgba(35, 71, 68, 0.12);
  font-weight: 700;
}

.landing-mobile-nav {
  display: none;
  position: relative;
}

.landing-mobile-nav summary {
  list-style: none;
}

.landing-mobile-nav summary::-webkit-details-marker {
  display: none;
}

.landing-mobile-nav__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 2.8rem;
  padding: 0.7rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 252, 247, 0.84);
  cursor: pointer;
}

.landing-mobile-nav__icon {
  display: inline-grid;
  gap: 0.22rem;
}

.landing-mobile-nav__icon span {
  display: block;
  width: 1rem;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.landing-mobile-nav__panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: min(18rem, calc(100vw - 1.25rem));
  display: grid;
  gap: 0.45rem;
  padding: 0.7rem;
  border-radius: 18px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 252, 247, 0.96);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 44px rgba(60, 43, 24, 0.12);
}

.landing-mobile-nav__panel a {
  display: flex;
  align-items: center;
  min-height: 2.7rem;
  padding: 0.65rem 0.8rem;
  border-radius: 14px;
  background: rgba(42, 36, 29, 0.03);
}

.landing-login-button--mobile {
  width: 100%;
}

.landing-hero {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 5.6rem);
  display: flex;
  align-items: center;
  padding: 1rem 0 2rem;
}

.landing-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(320px, 1.1fr);
  gap: 1.25rem;
  align-items: center;
}

.landing-hero__content {
  display: grid;
  gap: 1rem;
  align-content: center;
}

.landing-copy {
  max-width: 34rem;
}

.landing-kicker {
  margin: 0 0 0.65rem;
  color: #c06c43;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.landing-title {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(2.3rem, 5vw, 4.8rem);
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.landing-slogan {
  margin: 1rem 0 0;
  max-width: 28rem;
  color: rgba(42, 36, 29, 0.7);
  font-size: clamp(1rem, 1.35vw, 1.18rem);
  line-height: 1.55;
}

.landing-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.1rem;
}

.landing-hero__visual {
  display: flex;
  justify-content: center;
}

.landing-shot {
  width: 100%;
  max-width: 680px;
  padding: 0.85rem;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(244, 234, 220, 0.92));
  border: 1px solid rgba(42, 36, 29, 0.08);
  box-shadow: 0 28px 70px rgba(60, 43, 24, 0.12);
}

.landing-shot img {
  width: 100%;
  aspect-ratio: 1.55 / 1;
  object-fit: contain;
  object-position: center;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
}

.landing-section {
  position: relative;
  z-index: 1;
  padding: 1.5rem 0 3rem;
}

.landing-section--tight {
  padding-top: 0;
}

.landing-section--soft {
  background: linear-gradient(180deg, rgba(255, 250, 244, 0.55), rgba(241, 233, 223, 0.72));
}

.landing-section--dark {
  background: linear-gradient(180deg, #1f1b17 0%, #151311 100%);
}

.landing-section--team {
  background: linear-gradient(180deg, rgba(255, 250, 244, 0.82), rgba(244, 236, 226, 0.96));
}

.landing-section__heading {
  max-width: 42rem;
  margin-bottom: 1rem;
}

.landing-section__eyebrow {
  margin: 0 0 0.45rem;
  color: #c06c43;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.landing-section__eyebrow--light {
  color: #f2c4a4;
}

.landing-section__title {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  font-size: clamp(1.7rem, 3vw, 2.7rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.landing-section__text {
  margin: 0.75rem 0 0;
  color: rgba(42, 36, 29, 0.7);
  font-size: 0.94rem;
  line-height: 1.55;
}

.landing-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.landing-info-card,
.landing-feature-card,
.landing-contact-card,
.landing-response-card,
.landing-demo-card {
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 252, 247, 0.82);
  box-shadow: 0 18px 44px rgba(60, 43, 24, 0.08);
}

.landing-info-card {
  padding: 1rem;
  border-radius: 20px;
}

.landing-info-card__index {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: #c06c43;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.landing-info-card h3,
.landing-feature-card h3,
.landing-team-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.landing-info-card p,
.landing-feature-card p,
.landing-team-card p {
  margin: 0.45rem 0 0;
  color: rgba(42, 36, 29, 0.7);
  font-size: 0.9rem;
  line-height: 1.5;
}

.landing-feature-list {
  display: grid;
  gap: 0.85rem;
}

.landing-feature-card {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(260px, 1.1fr);
  gap: 0.9rem;
  padding: 0.9rem;
  border-radius: 22px;
  align-items: center;
}

.landing-feature-card__accent {
  display: inline-block;
  margin-bottom: 0.45rem;
  color: #c06c43;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.landing-feature-card__shot {
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
}

.landing-feature-card__shot img {
  width: 100%;
  aspect-ratio: 1.5 / 1;
  object-fit: contain;
  padding: 0.4rem;
}

.landing-response-card,
.landing-demo-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-radius: 22px;
}

.landing-demo-card {
  grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1.1fr);
}

.landing-demo-card__copy {
  max-width: 32rem;
}

.landing-demo-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.landing-demo-card__shot {
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
}

.landing-demo-card__shot img {
  width: 100%;
  aspect-ratio: 1.4 / 1;
  object-fit: contain;
  padding: 0.45rem;
}

.landing-team-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 1.1rem;
  align-items: start;
}

.landing-team-copy {
  padding: 1.15rem;
  border-radius: 24px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(252, 246, 239, 0.96));
  box-shadow: 0 18px 46px rgba(73, 53, 31, 0.08);
}

.landing-team-copy .landing-section__title {
  max-width: 16ch;
}

.landing-team-copy .landing-section__text {
  max-width: 58ch;
  font-size: 0.98rem;
  line-height: 1.72;
  color: rgba(42, 36, 29, 0.78);
}

.landing-team-list {
  display: grid;
  gap: 0.75rem;
}

.landing-team-highlights {
  display: grid;
  gap: 0.55rem;
  margin-top: 1rem;
}

.landing-team-highlights__item {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 2.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 255, 255, 0.88);
  color: rgba(42, 36, 29, 0.86);
  font-size: 0.88rem;
  font-weight: 600;
}

.landing-team-highlights__item::before {
  content: '';
  width: 0.45rem;
  height: 0.45rem;
  margin-right: 0.55rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f2c4a4, #efbc62);
}

.landing-team-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.95rem;
  align-items: center;
  min-height: 122px;
  padding: 1rem;
  border-radius: 22px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 42px rgba(73, 53, 31, 0.08);
}

.landing-team-card__avatar {
  display: grid;
  place-items: center;
  width: 4.4rem;
  height: 4.4rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3d8bf, #d98b61);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.landing-team-card h3 {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.15;
  color: #2a241d;
}

.landing-team-card p {
  margin: 0.35rem 0 0;
  color: rgba(42, 36, 29, 0.66);
  font-size: 0.9rem;
  line-height: 1.45;
}

.landing-team-card__tag {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  margin-top: 0.55rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgba(217, 241, 235, 0.9);
  color: #234744;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.landing-partner-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(42, 36, 29, 0.08);
  background: rgba(255, 255, 255, 0.9);
  color: #2a241d;
}

.landing-partner-badge img {
  width: 104px;
  height: auto;
  object-fit: contain;
}

.landing-contact-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-radius: 22px;
}

.landing-contact-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.landing-contact-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.7rem;
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  color: #234744;
  background: linear-gradient(135deg, #d7f1eb, #bee4dc);
  border: 1px solid rgba(35, 71, 68, 0.12);
  font-weight: 700;
}

.landing-contact-link--hero {
  min-height: 3rem;
  padding: 0.8rem 1.15rem;
  color: #173836;
  background: linear-gradient(135deg, #f6d685, #efbc62);
  border-color: rgba(192, 108, 67, 0.16);
  box-shadow: 0 18px 40px rgba(192, 108, 67, 0.18);
}

.landing-contact-link--secondary {
  color: #2a241d;
  background: rgba(255, 255, 255, 0.8);
}

.landing-footer {
  padding: 0 0 1.5rem;
}

.landing-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(42, 36, 29, 0.08);
  color: rgba(42, 36, 29, 0.62);
}

.landing-footer__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: #2a241d;
  font-weight: 700;
}

@media (max-width: 900px) {
  .landing-nav--desktop {
    display: none;
  }

  .landing-mobile-nav {
    display: block;
  }

  .landing-hero__grid {
    grid-template-columns: 1fr;
  }

  .landing-hero {
    min-height: auto;
    padding-top: 1.25rem;
  }

  .landing-hero__content {
    justify-items: center;
    text-align: center;
  }

  .landing-copy {
    max-width: 100%;
  }

  .landing-slogan {
    max-width: 34rem;
    margin-left: auto;
    margin-right: auto;
  }

  .landing-hero__actions {
    justify-content: center;
  }

  .landing-card-grid,
  .landing-feature-card,
  .landing-team-grid,
  .landing-contact-card,
  .landing-response-card,
  .landing-demo-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .landing-frame {
    width: min(calc(100% - 1.25rem), 1160px);
  }

  .landing-topbar {
    padding-top: 0.55rem;
  }

  .landing-topbar__inner {
    padding: 0.55rem 0.65rem;
    border-radius: 18px;
  }

  .landing-mobile-nav__trigger {
    min-height: 2.55rem;
    padding: 0.6rem 0.8rem;
  }

  .landing-brand__copy span {
    display: none;
  }

  .landing-brand__mark {
    width: 2.8rem;
    height: 2.8rem;
  }

  .landing-hero {
    padding: 0.9rem 0 1.25rem;
  }

  .landing-hero__content {
    gap: 0.8rem;
  }

  .landing-kicker {
    font-size: 0.68rem;
    margin-bottom: 0.5rem;
  }

  .landing-title {
    font-size: clamp(1.9rem, 10vw, 2.8rem);
  }

  .landing-slogan {
    margin-top: 0.75rem;
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .landing-hero__actions {
    flex-direction: column;
    margin-top: 0.9rem;
  }

  .landing-shot {
    padding: 0.55rem;
    border-radius: 22px;
  }

  .landing-shot img {
    aspect-ratio: 1.3 / 1;
    border-radius: 16px;
  }

  .landing-section {
    padding: 1rem 0 2rem;
  }

  .landing-info-card,
  .landing-feature-card,
  .landing-contact-card,
  .landing-team-card,
  .landing-response-card,
  .landing-demo-card {
    padding: 0.8rem;
    border-radius: 18px;
  }

  .landing-team-card {
    grid-template-columns: 1fr;
    text-align: center;
    min-height: 0;
  }

  .landing-team-card__avatar {
    margin: 0 auto;
  }

  .landing-team-copy {
    padding: 0.95rem;
    border-radius: 20px;
  }

  .landing-team-copy .landing-section__title {
    max-width: none;
  }

  .landing-team-copy .landing-section__text {
    max-width: none;
    font-size: 0.92rem;
    line-height: 1.6;
  }

  .landing-team-highlights__item {
    width: 100%;
    justify-content: center;
  }

  .landing-contact-card__actions {
    flex-direction: column;
  }

  .landing-demo-card__actions {
    flex-direction: column;
  }

  .landing-contact-link {
    width: 100%;
  }

  .landing-partner-badge {
    width: 100%;
    justify-content: center;
    border-radius: 18px;
  }

  .landing-footer__inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

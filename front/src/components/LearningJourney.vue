<script setup>
import { ref } from 'vue'

const steps = [
  {
    title: 'Apprenez',
    hook: 'Une négociation réussie commence bien avant de prendre la parole.',
    text: 'Convaincre, argumenter, écouter, anticiper les objections… La négociation repose sur des fondamentaux qui s’apprennent. Découvrez les méthodes qui vous aideront à mieux préparer chaque discussion.',
    methods: ['Cours structurés', 'Masterclasses', 'Entretiens privés'],
    scene: 'learn',
    question: 'Quelles connaissances puis-je acquérir ?',
  },
  {
    title: 'Pratiquez',
    hook: 'Vous savez quoi dire en théorie. Mais saurez-vous réagir face à un véritable désaccord ?',
    text: 'Un refus, une objection ou un interlocuteur difficile peuvent rapidement déstabiliser. Mettez vos connaissances à l’épreuve et apprenez à réagir avec assurance.',
    methods: ['Simulations de négociation', 'Mises en situation interactives', 'Exercices pratiques'],
    scene: 'practice',
    question: 'Comment mettre mes connaissances en application ?',
  },
  {
    title: 'Soyez accompagné',
    hook: 'Et si vous n’aviez plus à préparer vos négociations seul ?',
    text: 'Un regard extérieur suffit parfois à identifier ce que l’on n’avait pas anticipé. Échangez avec des coachs et bénéficiez de conseils adaptés à vos objectifs.',
    methods: ['Coaching individuel', 'Questions aux coachs', 'Retours personnalisés'],
    scene: 'coach',
    question: 'Qui peut m’aider à progresser ?',
  },
  {
    title: 'Progressez',
    hook: 'Chaque négociation est une occasion de faire mieux que la précédente.',
    text: 'Gagnez en confiance, affinez vos arguments et comprenez mieux vos interlocuteurs. Identifiez vos points forts et développez durablement vos compétences.',
    methods: ['Suivi de progression', 'Objectifs personnalisés', 'Parcours d’amélioration'],
    scene: 'progress',
    question: 'Comment continuer à m’améliorer ?',
  },
]

const openStep = ref(null)

const toggleStep = (index) => {
  openStep.value = openStep.value === index ? null : index
}
</script>

<template>
  <div class="offer-grid" aria-label="Les quatre dimensions de l’accompagnement Persuade">
    <svg class="offer-path" viewBox="0 0 260 1100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M130 12 C 235 110, 215 235, 132 286 S 28 440, 130 552 S 232 742, 130 828 S 42 1004, 132 1088" />
    </svg>
    <article v-for="(step, index) in steps" :key="step.title" class="offer-card">
      <button
        type="button"
        class="offer-card__visual"
        :class="[`offer-scene--${step.scene}`, { 'offer-card__visual--open': openStep === index }]"
        :aria-expanded="openStep === index"
        :aria-label="`Afficher les méthodes pour ${step.title.toLowerCase()}`"
        @click="toggleStep(index)"
      >
        <span class="offer-card__image" aria-hidden="true"></span>
        <span class="offer-card__veil"></span>
        <span class="offer-card__methods">
          <strong v-for="method in step.methods" :key="method">
            <v-icon icon="mdi-check" size="16" />
            {{ method }}
          </strong>
        </span>
      </button>

      <span class="offer-card__marker" aria-hidden="true">{{ index + 1 }}</span>

      <div class="offer-card__content">
        <h3>{{ step.title }}</h3>
        <p class="offer-card__hook">{{ step.hook }}</p>
        <p class="offer-card__text">{{ step.text }}</p>
        <span class="offer-card__question">{{ step.question }}</span>
      </div>
    </article>
  </div>
</template>

<style scoped>
.offer-grid {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1.8rem, 4vw, 3.2rem);
  margin-top: clamp(2rem, 4vw, 3.5rem);
}

.offer-path {
  position: absolute;
  top: 1rem;
  bottom: 1rem;
  left: 50%;
  width: 190px;
  height: calc(100% - 2rem);
  transform: translateX(-50%);
  overflow: visible;
  pointer-events: none;
}

.offer-path path {
  fill: none;
  stroke: rgba(181, 93, 63, 0.48);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 3 13;
  animation: offer-path-flow 28s linear infinite;
}

.offer-card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.offer-card:hover {
  transform: translateY(-3px);
}

.offer-card:nth-of-type(even) .offer-card__visual {
  grid-column: 3;
}

.offer-card:nth-of-type(even) .offer-card__content {
  grid-column: 1;
  grid-row: 1;
  text-align: right;
}

.offer-card:nth-of-type(even) .offer-card__marker {
  grid-column: 2;
}

.offer-card__visual {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  padding: 0;
  border: 0;
  border-radius: 22px;
  background: #dfc5a5;
  cursor: pointer;
  overflow: hidden;
  contain: layout paint;
  box-shadow: 0 22px 52px rgba(31, 52, 47, 0.1);
}

.offer-card__image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  background-image: url('/branding/negotiation-journey-scenes.png');
  background-repeat: no-repeat;
  background-size: 200% 200%;
  transition: filter 520ms ease, transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.offer-scene--learn .offer-card__image { background-position: left top; }
.offer-scene--practice .offer-card__image { background-position: right top; }
.offer-scene--coach .offer-card__image { background-position: left bottom; }
.offer-scene--progress .offer-card__image { background-position: right bottom; }

.offer-card__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(12, 47, 42, 0.32), rgba(12, 47, 42, 0.76));
  opacity: 0;
  transition: opacity 480ms ease;
}

.offer-card__methods {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.2rem;
  color: #fffaf1;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 420ms ease, transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.offer-card__methods small {
  margin-bottom: 0.15rem;
  color: rgba(255, 250, 241, 0.7);
  font-size: 0.72rem;
  font-weight: 800;
}

.offer-card__methods strong {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: clamp(0.88rem, 1.5vw, 1rem);
  text-align: center;
}

.offer-card__hint {
  position: absolute;
  right: 0.7rem;
  bottom: 0.7rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 999px;
  color: #fffaf1;
  background: rgba(31, 52, 47, 0.58);
  backdrop-filter: blur(10px);
  font-size: 0.7rem;
  font-weight: 800;
  transition: background 300ms ease;
}

.offer-card__visual:hover .offer-card__image,
.offer-card__visual:focus-visible .offer-card__image,
.offer-card__visual--open .offer-card__image {
  filter: blur(3px) saturate(0.85);
  transform: scale(1.035);
}

.offer-card__visual:hover .offer-card__veil,
.offer-card__visual:focus-visible .offer-card__veil,
.offer-card__visual--open .offer-card__veil,
.offer-card__visual:hover .offer-card__methods,
.offer-card__visual:focus-visible .offer-card__methods,
.offer-card__visual--open .offer-card__methods {
  opacity: 1;
}

.offer-card__visual:hover .offer-card__methods,
.offer-card__visual:focus-visible .offer-card__methods,
.offer-card__visual--open .offer-card__methods {
  transform: translateY(0);
}

.offer-card__visual:focus-visible {
  outline: 3px solid rgba(181, 93, 63, 0.34);
  outline-offset: 3px;
}

.offer-card__content {
  position: relative;
  grid-column: 3;
  grid-row: 1;
  padding: 1.25rem 1.4rem;
  border: 1px solid rgba(31, 52, 47, 0.08);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(255, 248, 239, 0.6));
  box-shadow: 0 18px 44px rgba(31, 52, 47, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.offer-card__marker {
  position: relative;
  z-index: 3;
  grid-column: 2;
  grid-row: 1;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: auto;
  border: 7px solid #f5f0e8;
  border-radius: 50%;
  color: #fffaf1;
  background: #24443f;
  box-shadow: 0 0 0 1px rgba(31, 52, 47, 0.12), 0 12px 26px rgba(31, 52, 47, 0.16);
  font-size: 0.74rem;
  font-weight: 900;
  transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1), background 280ms ease;
}

.offer-card:hover .offer-card__marker {
  transform: scale(1.08);
  background: #b55d3f;
}

.offer-card__number {
  color: rgba(181, 93, 63, 0.7);
  font-size: 0.72rem;
  font-weight: 900;
}

.offer-card h3 {
  margin: 0.2rem 0 0.65rem;
  color: #1f342f;
  font-family: 'Avenir Next', Avenir, Inter, sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1;
}

.offer-card__hook {
  margin: 0;
  color: #24443f;
  font-size: clamp(0.98rem, 1.5vw, 1.08rem);
  font-weight: 800;
  line-height: 1.45;
}

.offer-card__text {
  margin: 0.65rem 0 0;
  color: rgba(31, 52, 47, 0.66);
  font-size: 0.91rem;
  line-height: 1.62;
}

.offer-card__question {
  display: inline-block;
  margin-top: 0.85rem;
  color: #b55d3f;
  font-size: 0.76rem;
  font-weight: 800;
}

@media (max-width: 800px) {
  .offer-grid { gap: 1.6rem; padding-left: 1rem; }
  .offer-path { left: 1.9rem; width: 38px; transform: none; }
  .offer-card,
  .offer-card:nth-of-type(even) { grid-template-columns: 44px minmax(0, 1fr); gap: 0.7rem; }
  .offer-card__marker,
  .offer-card:nth-of-type(even) .offer-card__marker { grid-column: 1; grid-row: 1; width: 40px; height: 40px; border-width: 6px; align-self: start; margin-top: 0.7rem; }
  .offer-card__visual,
  .offer-card:nth-of-type(even) .offer-card__visual { grid-column: 2; grid-row: 1; }
  .offer-card__content,
  .offer-card:nth-of-type(even) .offer-card__content { grid-column: 2; grid-row: 2; text-align: left; }
}

@media (max-width: 600px) {
  .offer-card { padding: 0.55rem; border-radius: 23px; }
  .offer-card__visual { border-radius: 18px; }
  .offer-card__hint span { display: none; }
  .offer-card__content { padding: 1rem 0.55rem 0.65rem; }
  .offer-card h3 { font-size: 2rem; }
}

@media (prefers-reduced-motion: reduce) {
  .offer-card,
  .offer-card__image,
  .offer-card__veil,
  .offer-card__methods { transition: none; }
  .offer-path path { animation: none; }
}

@keyframes offer-path-flow {
  to { stroke-dashoffset: -160; }
}
</style>

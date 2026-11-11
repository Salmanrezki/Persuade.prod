<script setup>
import { computed, ref } from 'vue'
import { ROUTE_PATHS } from '@/router/paths'
import { getContextualReaction, getFinalTone, negotiationSteps } from '@/data/salaryNegotiationScenario'

const started = ref(false)
const currentStepIndex = ref(0)
const pendingChoice = ref('')
const answers = ref([])
const chapters = ref([])
const finished = ref(false)
const storyEnd = ref(null)
const storyCover = ref(null)
const challengeButton = ref(null)
let scrollAfterStepEnter = false

const currentStep = computed(() => negotiationSteps[currentStepIndex.value])
const finalTone = computed(() => getFinalTone(answers.value))

const centerInViewport = (element, focusTarget = element) => {
  if (!element) return

  const rect = element.getBoundingClientRect()
  const navBottom = document.querySelector('.landing-nav')?.getBoundingClientRect().bottom ?? 0
  const topInset = Math.max(24, navBottom + 20)
  const availableHeight = Math.max(0, (window.visualViewport?.height ?? window.innerHeight) - topInset - 24)
  const targetTop = topInset + Math.max(0, (availableHeight - rect.height) / 2)
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  focusTarget?.focus({ preventScroll: true })
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - targetTop), behavior })
}

const onExperienceEnter = () => {
  if (started.value) centerInViewport(storyEnd.value)
  else centerInViewport(storyCover.value, challengeButton.value)
}

const onStepEnter = () => {
  if (!scrollAfterStepEnter) return
  scrollAfterStepEnter = false
  centerInViewport(storyEnd.value)
}

const startExperience = () => {
  started.value = true
}

const validateChoice = () => {
  if (!pendingChoice.value || finished.value) return

  const step = currentStep.value
  const option = step.options.find((entry) => entry.id === pendingChoice.value)
  const nextAnswers = [...answers.value, pendingChoice.value]

  answers.value = nextAnswers
  chapters.value.push({
    id: step.id,
    title: step.title,
    context: step.eyebrow,
    answer: option.text,
    consequence: option.feedback,
    managerReaction: getContextualReaction(currentStepIndex.value, nextAnswers),
  })
  pendingChoice.value = ''

  if (currentStepIndex.value === negotiationSteps.length - 1) finished.value = true
  else currentStepIndex.value += 1

  scrollAfterStepEnter = true
}

const restart = () => {
  scrollAfterStepEnter = false
  started.value = false
  currentStepIndex.value = 0
  pendingChoice.value = ''
  answers.value = []
  chapters.value = []
  finished.value = false
}
</script>

<template>
  <section class="story-experience" aria-label="Simulation de négociation salariale">
    <Transition name="story-intro" mode="out-in" @after-enter="onExperienceEnter">
      <div v-if="!started" ref="storyCover" key="intro" class="story-cover">
        <div class="story-cover__copy">
          <span class="story-kicker">Une négociation, vos décisions</span>
          <h2 id="negotiation-story-title">Et vous, savez-vous déjà négocier&nbsp;?</h2>
          <p>Entrez dans la discussion et voyez jusqu’où vos choix peuvent vous mener.</p>
          <button ref="challengeButton" type="button" class="story-primary story-primary--large" @click="startExperience">
            Relevez le challenge
            <v-icon icon="mdi-arrow-right" size="20" />
          </button>
        </div>
        <div class="story-scene story-scene--practice" aria-hidden="true">
          <img src="/branding/negotiation-journey-scenes.png" alt="" />
        </div>
      </div>

      <div v-else key="story" class="story-thread">
        <header class="story-opening story-reveal">
          <div class="story-opening__copy">
            <span class="story-kicker">Le rendez-vous</span>
            <h3>Vous entrez dans la salle de réunion.</h3>
            <p>
              Vous travaillez dans l’entreprise depuis deux ans. Vos responsabilités ont augmenté, vos résultats sont
              bons et vous souhaitez maintenant demander une augmentation.
            </p>
          </div>
          <div class="story-scene story-scene--practice" aria-hidden="true">
            <img src="/branding/negotiation-journey-scenes.png" alt="" />
          </div>
        </header>

        <div class="story-line" aria-hidden="true"></div>

        <article v-for="(chapter, index) in chapters" :key="chapter.id" class="story-chapter story-reveal">
          <div class="story-marker"><span>{{ index + 1 }}</span></div>
          <div class="story-chapter__body">
            <div class="story-chapter__heading">
              <span>{{ chapter.context }}</span>
              <h4>{{ chapter.title }}</h4>
            </div>

            <div class="story-chapter__summary">
              <div class="story-choice-saved">
                <span>Votre décision</span>
                <p>{{ chapter.answer }}</p>
              </div>
              <div class="story-consequence">
                <v-icon icon="mdi-arrow-turn-down-right" size="19" />
                <p>{{ chapter.consequence }}</p>
              </div>
            </div>

            <div class="story-manager">
              <div class="story-avatar">RH</div>
              <div>
                <span>La responsable RH</span>
                <p>{{ chapter.managerReaction }}</p>
              </div>
            </div>
          </div>
        </article>

        <Transition name="story-next" mode="out-in" @after-enter="onStepEnter">
          <article v-if="!finished" :key="currentStep.id" ref="storyEnd" class="story-active" tabindex="-1">
            <div class="story-marker story-marker--active"><span>{{ currentStepIndex + 1 }}</span></div>
            <div class="story-active__body">
              <div class="story-active__top">
                <div>
                  <span class="story-kicker">{{ currentStep.eyebrow }}</span>
                  <h3>{{ currentStep.title }}</h3>
                </div>
                <div class="story-scene" :class="`story-scene--${currentStep.scene}`" aria-hidden="true">
                  <img src="/branding/negotiation-journey-scenes.png" alt="" />
                </div>
              </div>

              <div class="story-dialogue">
                <div class="story-avatar">RH</div>
                <p>{{ currentStep.situation }}</p>
              </div>

              <fieldset>
                <legend>Que répondez-vous&nbsp;?</legend>
                <label
                  v-for="option in currentStep.options"
                  :key="option.id"
                  class="story-option"
                  :class="{ 'story-option--selected': pendingChoice === option.id }"
                >
                  <input v-model="pendingChoice" type="radio" :value="option.id" />
                  <span class="story-option__letter">{{ option.id }}</span>
                  <span>{{ option.text }}</span>
                </label>
              </fieldset>

              <button type="button" class="story-primary" :disabled="!pendingChoice" @click="validateChoice">
                Valider ma réponse
                <v-icon icon="mdi-arrow-down" size="18" />
              </button>
            </div>
          </article>

          <article v-else ref="storyEnd" key="ending" class="story-ending story-reveal" tabindex="-1">
            <div class="story-marker story-marker--ending"><v-icon icon="mdi-flag-checkered" size="20" /></div>
            <div class="story-ending__body">
              <div class="story-scene story-scene--coach" aria-hidden="true">
                <img src="/branding/negotiation-journey-scenes.png" alt="" />
              </div>
              <div class="story-ending__copy">
                <span class="story-kicker">Le rendez-vous est terminé</span>
                <p class="story-ending__tone">{{ finalTone }}</p>
                <h3>Le rendez-vous est terminé. La suite se prépare maintenant.</h3>
                <h4>Chaque réponse a orienté la discussion.</h4>
                <strong>Entraînez-vous pour votre prochain échange.</strong>
                <p>
                  Apprenez à préparer vos arguments, à répondre aux objections et à défendre vos intérêts grâce à
                  notre méthode et à l’accompagnement de nos coachs.
                </p>
                <div class="story-ending__actions">
                  <v-btn :to="ROUTE_PATHS.login" rounded="pill" size="large" class="story-join">Rejoignez-nous</v-btn>
                  <button type="button" class="story-restart" @click="restart">Recommencer l’histoire</button>
                </div>
              </div>
            </div>
          </article>
        </Transition>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.story-experience {
  position: relative;
  width: 100%;
  max-width: 100%;
  color: #1f342f;
  overflow: clip;
}

.story-cover,
.story-thread { position: relative; z-index: 1; }

.story-cover {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: center;
  min-height: 500px;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  border: 1px solid rgba(31, 52, 47, 0.1);
  border-radius: 32px;
  background: linear-gradient(145deg, rgba(255, 253, 248, 0.94), rgba(244, 238, 226, 0.82));
  box-shadow: 0 22px 54px rgba(31, 52, 47, 0.08);
  overflow: hidden;
}

.story-cover h2 {
  max-width: 650px;
  margin: 0.55rem 0 1.2rem;
  font-family: 'Avenir Next', Avenir, Inter, sans-serif;
  font-size: clamp(2.35rem, 4.4vw, 4.25rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.035em;
}

.story-cover__copy > p { max-width: 38rem; color: rgba(31, 52, 47, 0.68); font-size: 1.08rem; line-height: 1.7; }
.story-kicker { color: #b55d3f; font-size: 0.8rem; font-weight: 800; }

.story-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 48px;
  margin-top: 1rem;
  padding: 0.72rem 1.2rem;
  border: 0;
  border-radius: 999px;
  color: #fffaf1;
  background: linear-gradient(135deg, #a94f35, #d57754);
  box-shadow: 0 16px 34px rgba(181, 93, 63, 0.24);
  cursor: pointer;
  font: inherit;
  font-weight: 850;
  transition: transform 400ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 320ms ease, opacity 220ms ease;
}

.story-primary--large { min-height: 56px; padding-inline: 1.55rem; }
.story-primary:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 22px 44px rgba(181, 93, 63, 0.3); }
.story-primary:disabled { cursor: not-allowed; opacity: 0.38; }

.story-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border: 5px solid rgba(255, 255, 255, 0.58);
  border-radius: 24px;
  background: #dfc5a5;
  box-shadow: 0 20px 48px rgba(31, 52, 47, 0.12);
  overflow: hidden;
  contain: layout paint;
}

.story-scene img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; max-width: 100%; object-fit: cover; }
.story-scene--learn img { transform: scale(2); transform-origin: top left; }
.story-scene--practice img { transform: scale(2); transform-origin: top right; }
.story-scene--coach img { transform: scale(2); transform-origin: bottom left; }
.story-scene--progress img { transform: scale(2); transform-origin: bottom right; }

.story-thread { width: 100%; max-width: 980px; min-width: 0; margin: 0 auto; padding: clamp(1rem, 2.5vw, 2rem); }
.story-opening { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(250px, 0.65fr); gap: 1.5rem; align-items: center; padding-bottom: 2.5rem; }
.story-opening h3,
.story-active h3,
.story-ending h3 { margin: 0.45rem 0 0.9rem; font-family: 'Avenir Next', Avenir, Inter, sans-serif; font-weight: 900; line-height: 1.02; letter-spacing: -0.025em; }
.story-opening h3 { font-size: clamp(1.75rem, 3vw, 2.65rem); }
.story-opening p { max-width: 41rem; margin: 0; color: rgba(31, 52, 47, 0.68); font-size: 1.02rem; line-height: 1.7; }

.story-line { position: absolute; top: 29rem; bottom: 6rem; left: clamp(2.8rem, 6.5vw, 5.1rem); width: 2px; background: repeating-linear-gradient(to bottom, rgba(181, 93, 63, 0.42) 0 5px, transparent 5px 13px); pointer-events: none; }
.story-chapter,
.story-active,
.story-ending { position: relative; display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: clamp(0.7rem, 2vw, 1.25rem); padding: 0.75rem 0 1.8rem; }
.story-chapter__body,
.story-active__body,
.story-ending__body { min-width: 0; }

.story-marker { position: relative; z-index: 2; display: grid; place-items: center; width: 44px; height: 44px; margin: 0.4rem auto 0; border: 7px solid #f8f3ea; border-radius: 50%; color: #fffaf1; background: #24443f; box-shadow: 0 10px 26px rgba(31, 52, 47, 0.16); font-size: 0.75rem; font-weight: 900; }
.story-marker--active { background: #b55d3f; box-shadow: 0 0 0 7px rgba(181, 93, 63, 0.1), 0 12px 28px rgba(181, 93, 63, 0.2); }
.story-marker--ending { background: linear-gradient(145deg, #24443f, #b55d3f); }

.story-chapter__body { padding: 1rem; border: 1px solid rgba(31, 52, 47, 0.08); border-radius: 18px; background: rgba(255, 255, 255, 0.46); }
.story-chapter__heading { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.story-chapter__heading > span { color: rgba(31, 52, 47, 0.47); font-size: 0.72rem; }
.story-chapter__heading h4 { margin: 0; color: #24443f; font-size: 1rem; }
.story-chapter__summary { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 0.8rem; margin-top: 0.85rem; }
.story-choice-saved,
.story-consequence { padding: 0.85rem 0.95rem; border-radius: 16px; }
.story-choice-saved { border: 1px solid rgba(181, 93, 63, 0.14); background: rgba(181, 93, 63, 0.075); }
.story-choice-saved span { color: #b55d3f; font-size: 0.68rem; font-weight: 850; }
.story-choice-saved p,
.story-consequence p { margin: 0.28rem 0 0; color: rgba(31, 52, 47, 0.76); font-size: 0.86rem; line-height: 1.5; }
.story-consequence { display: flex; gap: 0.5rem; color: #24443f; background: rgba(35, 71, 68, 0.055); }

.story-manager,
.story-dialogue { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 0.65rem; align-items: start; }
.story-manager { max-width: 690px; margin: 0.85rem 0 0 auto; }
.story-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; color: #fffaf1; background: linear-gradient(145deg, #40675f, #24443f); box-shadow: 0 8px 20px rgba(31, 52, 47, 0.14); font-size: 0.72rem; font-weight: 900; }
.story-manager span { color: rgba(31, 52, 47, 0.46); font-size: 0.68rem; font-weight: 750; }
.story-manager p,
.story-dialogue p { margin: 0.25rem 0 0; padding: 0.75rem 0.9rem; border-radius: 4px 15px 15px; color: rgba(31, 52, 47, 0.8); background: rgba(35, 71, 68, 0.07); line-height: 1.55; }

.story-active__body { padding: clamp(1rem, 2.5vw, 1.35rem); border: 1px solid rgba(181, 93, 63, 0.16); border-radius: 22px; background: linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(255, 247, 238, 0.68)); box-shadow: 0 20px 48px rgba(31, 52, 47, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92); }
.story-active__top { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(210px, 0.8fr); gap: 1.2rem; align-items: center; }
.story-active h3 { max-width: 620px; font-size: clamp(1.55rem, 2.7vw, 2.3rem); }
.story-active .story-scene { border-width: 4px; border-radius: 20px; }
.story-dialogue { max-width: 760px; margin: 1rem 0; }
.story-active fieldset { display: grid; gap: 0.7rem; margin: 1.3rem 0 0; padding: 0; border: 0; }
.story-active legend { margin-bottom: 0.65rem; color: rgba(31, 52, 47, 0.58); font-size: 0.82rem; font-weight: 800; }

.story-option { position: relative; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 0.75rem; align-items: start; padding: 0.9rem; border: 1px solid rgba(31, 52, 47, 0.1); border-radius: 17px; color: rgba(31, 52, 47, 0.8); background: rgba(255, 255, 255, 0.66); cursor: pointer; line-height: 1.5; transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), border-color 280ms ease, background 280ms ease, box-shadow 320ms ease; }
.story-option:hover { transform: translateX(5px); border-color: rgba(181, 93, 63, 0.4); box-shadow: 0 14px 30px rgba(31, 52, 47, 0.07); }
.story-option:focus-within { outline: 3px solid rgba(181, 93, 63, 0.2); outline-offset: 2px; }
.story-option input { position: absolute; opacity: 0; }
.story-option__letter { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: #24443f; background: rgba(35, 71, 68, 0.08); font-size: 0.76rem; font-weight: 900; }
.story-option--selected { transform: translateX(5px); border-color: rgba(181, 93, 63, 0.58); background: rgba(181, 93, 63, 0.1); box-shadow: 0 16px 34px rgba(181, 93, 63, 0.1); }
.story-option--selected .story-option__letter { color: #fffaf1; background: #b55d3f; }

.story-ending { padding-bottom: 0; }
.story-ending__body { display: grid; grid-template-columns: minmax(230px, 0.66fr) minmax(0, 1.34fr); gap: 1.4rem; align-items: center; padding: clamp(1rem, 2.5vw, 1.45rem); border: 1px solid rgba(31, 52, 47, 0.09); border-radius: 24px; background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(244, 238, 226, 0.72)); box-shadow: 0 22px 52px rgba(31, 52, 47, 0.09); }
.story-ending h3 { font-size: clamp(1.75rem, 3vw, 2.75rem); }
.story-ending h4 { margin: 0.4rem 0 0.8rem; color: #b55d3f; font-size: clamp(1.15rem, 2vw, 1.65rem); line-height: 1.2; }
.story-ending__tone { margin: 0.7rem 0 0; color: rgba(31, 52, 47, 0.53); font-size: 0.82rem; font-weight: 750; }
.story-ending__copy > strong { display: block; margin-top: 1rem; color: #24443f; font-size: 1.1rem; }
.story-ending__copy > p:last-of-type { color: rgba(31, 52, 47, 0.68); line-height: 1.65; }
.story-ending__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.9rem; margin-top: 1.2rem; }
.story-join { color: #fffaf1 !important; background: linear-gradient(135deg, #a94f35, #d57754) !important; font-weight: 850; box-shadow: 0 17px 36px rgba(181, 93, 63, 0.25); }
.story-restart { padding: 0.7rem; border: 0; color: rgba(31, 52, 47, 0.58); background: transparent; cursor: pointer; font: inherit; font-weight: 750; text-decoration: underline; text-underline-offset: 4px; }

.story-reveal { animation: story-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.story-intro-enter-active,
.story-intro-leave-active,
.story-next-enter-active,
.story-next-leave-active { transition: opacity 460ms ease, transform 560ms cubic-bezier(0.22, 1, 0.36, 1), filter 420ms ease; }
.story-intro-enter-from,
.story-next-enter-from { opacity: 0; filter: blur(3px); transform: translateY(18px); }
.story-intro-leave-to,
.story-next-leave-to { opacity: 0; filter: blur(2px); transform: translateY(-8px); }

@keyframes story-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 850px) {
  .story-cover,
  .story-opening,
  .story-ending__body { grid-template-columns: 1fr; }
  .story-cover { min-height: 0; }
  .story-cover__copy { order: 1; }
  .story-opening .story-scene,
  .story-ending__body > .story-scene { max-height: 360px; }
  .story-chapter__summary,
  .story-active__top { grid-template-columns: 1fr; }
  .story-active__top .story-scene { max-height: 330px; }
}

@media (max-width: 600px) {
  .story-experience { overflow: hidden; }
  .story-cover { min-height: 0; border-radius: 24px; }
  .story-cover,
  .story-thread { padding: 1rem; }
  .story-cover h2 { font-size: clamp(2.15rem, 10vw, 3rem); }
  .story-line { left: 2.28rem; top: 27rem; }
  .story-chapter,
  .story-active,
  .story-ending { grid-template-columns: 40px minmax(0, 1fr); gap: 0.55rem; }
  .story-marker { width: 36px; height: 36px; border-width: 5px; }
  .story-chapter__body,
  .story-active__body { padding: 0.9rem; border-radius: 20px; }
  .story-chapter__heading { display: block; }
  .story-chapter__heading h4 { margin-top: 0.25rem; }
  .story-manager,
  .story-dialogue { grid-template-columns: 32px minmax(0, 1fr); }
  .story-avatar { width: 32px; height: 32px; }
  .story-option { padding: 0.78rem; }
  .story-ending__body { padding: 0.9rem; border-radius: 22px; }
}

@media (prefers-reduced-motion: reduce) {
  .story-reveal { animation: none; }
  .story-intro-enter-active,
  .story-intro-leave-active,
  .story-next-enter-active,
  .story-next-leave-active,
  .story-primary,
  .story-option { transition: none; }
}
</style>

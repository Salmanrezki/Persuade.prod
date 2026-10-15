<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'
const props = defineProps({
  exercises: { type: Array, default: () => [] },
  loading: Boolean,
})
const emit = defineEmits(['saved'])
const tab = ref('exercises'),
  search = ref(''),
  history = ref([]),
  cursor = ref(null),
  historyLoading = ref(false),
  error = ref('')
const selected = ref(null),
  answers = ref([]),
  notes = ref(''),
  result = ref(null),
  saving = ref(false),
  requestId = ref(''),
  submittedPayload = ref(null)
function showHistory() {
  selected.value = null
  tab.value = 'history'
}
const filtered = computed(() =>
  props.exercises.filter((item) =>
    item.title.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const date = (value) =>
  new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
async function loadHistory(more = false) {
  if (historyLoading.value) return
  historyLoading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/exercise-attempts', {
      params: more && cursor.value ? { cursor: cursor.value } : {},
    })
    history.value = more ? [...history.value, ...data.items] : data.items
    cursor.value = data.nextCursor
  } catch {
    error.value = 'Impossible de charger l’historique. Réessayez.'
  } finally {
    historyLoading.value = false
  }
}
function start(exercise) {
  selected.value = exercise
  answers.value = []
  notes.value = ''
  result.value = null
  error.value = ''
  requestId.value = crypto.randomUUID()
  submittedPayload.value = null
}
async function submit() {
  const questions = selected.value.assessment?.questions || []
  if (questions.some((q, index) => !Number.isInteger(answers.value[index]))) {
    error.value = 'Répondez à toutes les questions.'
    return
  }
  saving.value = true
  error.value = ''
  // Reuse the same request and answers on retry if the first response was lost.
  submittedPayload.value ||= {
    requestId: requestId.value,
    revision: selected.value.revision || 1,
    answers: [...answers.value],
    notes: notes.value,
  }
  try {
    const { data } = await api.post(
      `/exercise-attempts/${selected.value.id}`,
      submittedPayload.value,
    )
    result.value = data
    await loadHistory()
    emit('saved')
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      'Enregistrement impossible. Réessayez pour conserver cette tentative.'
    if (err.response && err.response.status < 500) submittedPayload.value = null
  } finally {
    saving.value = false
  }
}
onMounted(() => loadHistory())
</script>
<template>
  <section class="exercises-workspace">
    <div class="tabs" role="tablist" aria-label="Exercices et résultats">
      <button
        :aria-selected="tab === 'exercises'"
        role="tab"
        :class="{ active: tab === 'exercises' }"
        @click="tab = 'exercises'"
      >
        Exercices</button
      ><button
        :aria-selected="tab === 'history'"
        role="tab"
        :class="{ active: tab === 'history' }"
        @click="tab = 'history'"
      >
        Historique et scores
      </button>
    </div>
    <v-alert v-if="error && !selected" type="error" variant="tonal" class="mb-4"
      >{{ error
      }}<v-btn variant="text" @click="loadHistory()">Réessayer</v-btn></v-alert
    >
    <template v-if="tab === 'exercises'">
      <v-text-field
        v-model="search"
        label="Rechercher un exercice"
        variant="outlined"
        density="compact"
        prepend-inner-icon="mdi-magnify"
        class="search"
      />
      <div class="cards">
        <article v-for="exercise in filtered" :key="exercise.id" class="panel exercise-card" :class="{ 'exercise-card--quiz': !!exercise.assessment }">
          <div class="card-heading">
            <span class="exercise-icon"><v-icon size="28">{{
              exercise.assessment ? 'mdi-list-status' : 'mdi-pencil-outline'
            }}</v-icon></span
            ><span class="tag">{{
              exercise.assessment ? 'QCM noté sur 100' : 'Pratique libre'
            }}</span>
          </div>
          <h2>{{ exercise.title }}</h2>
          <p class="description">{{ exercise.description }}</p>
          <small class="exercise-duration" v-if="exercise.duration"><v-icon size="15" aria-hidden="true">mdi-clock-outline</v-icon> {{ exercise.duration }}</small>
          <v-btn color="#24443f" variant="tonal" append-icon="mdi-arrow-right" @click="start(exercise)"
            >Commencer</v-btn
          >
        </article>
      </div>
      <div v-if="!loading && !filtered.length" class="empty practice-empty"><v-icon size="36" aria-hidden="true">mdi-notebook-outline</v-icon><p>
        {{
          search
            ? 'Aucun exercice trouvé.'
            : 'Les exercices publiés par les coachs apparaîtront ici.'
        }}
      </p></div>
    </template>
    <section v-else class="panel history-panel">
      <div class="card-heading">
        <div>
          <h2>Mes tentatives</h2>
          <p>
            Chaque réalisation est conservée. Les exercices libres ne sont pas
            notés.
          </p>
        </div>
        <v-btn variant="text" :loading="historyLoading" @click="loadHistory()"
          >Actualiser</v-btn
        >
      </div>
      <v-progress-linear v-if="historyLoading" indeterminate />
      <article v-for="attempt in history" :key="attempt.id" class="attempt">
        <div class="card-heading">
          <div>
            <h3>{{ attempt.exerciseTitle }}</h3>
            <small
              >{{ date(attempt.createdAt) }} · Version
              {{ attempt.revision }}</small
            >
          </div>
          <strong>{{
            attempt.score === null ? 'Réalisé' : `${attempt.score}/100`
          }}</strong>
        </div>
        <p v-if="attempt.totalQuestions">
          {{ attempt.correctCount }} / {{ attempt.totalQuestions }} bonnes
          réponses
        </p>
        <v-progress-linear v-if="attempt.score !== null" :model-value="attempt.score" color="#695483" bg-color="#e9e3f2" height="6" rounded :aria-label="`Score : ${attempt.score} sur 100`" class="score-progress" />
        <details v-if="attempt.notes || attempt.answers?.length">
          <summary>Voir ma tentative</summary>
          <p v-if="attempt.notes" class="notes">{{ attempt.notes }}</p>
          <p
            v-for="answer in attempt.answers"
            :key="answer.questionId"
            class="answer"
          >
            {{ answer.prompt }}<br />{{ answer.selectedAnswer }} —
            {{ answer.correct ? 'Correct' : 'À revoir' }}
          </p>
        </details>
      </article>
      <p v-if="!historyLoading && !history.length && !error" class="empty">
        Votre première tentative apparaîtra ici une fois enregistrée.
      </p>
      <v-btn
        v-if="cursor"
        variant="outlined"
        :loading="historyLoading"
        @click="loadHistory(true)"
        >Voir les tentatives précédentes</v-btn
      >
    </section>
    <v-dialog
      :model-value="!!selected"
      max-width="720"
      :persistent="saving"
      @update:model-value="
        (value) => {
          if (!value) selected = null
        }
      "
      ><v-card v-if="selected" class="editor"
        ><div class="card-heading">
          <h2>{{ selected.title }}</h2>
          <v-btn
            variant="text"
            icon="mdi-close"
            aria-label="Fermer"
            :disabled="saving"
            @click="selected = null"
          />
        </div>
        <template v-if="result"
          ><v-alert type="success" variant="tonal">{{
            result.score === null
              ? 'Exercice enregistré dans votre historique.'
              : `Score : ${result.score}/100 — ${result.correctCount}/${result.totalQuestions} bonnes réponses.`
          }}</v-alert>
          <p class="mt-4">
            Vous pouvez retrouver cette tentative dans « Historique et scores ».
          </p>
          <v-btn class="mt-4" color="#24443f" @click="showHistory"
            >Voir mon historique</v-btn
          ></template
        >
        <form v-else @submit.prevent="submit">
          <p class="notes my-5">{{ selected.instructions }}</p>
          <fieldset
            v-for="(question, index) in selected.assessment?.questions || []"
            :key="question.id"
            :disabled="saving || !!submittedPayload"
          >
            <legend>{{ index + 1 }}. {{ question.prompt }}</legend>
            <v-radio-group
              v-model="answers[index]"
              :disabled="saving || !!submittedPayload"
              ><v-radio
                v-for="(option, optionIndex) in question.options"
                :key="optionIndex"
                :label="option"
                :value="optionIndex"
            /></v-radio-group>
          </fieldset>
          <v-textarea
            v-model="notes"
            label="Mes notes sur cet exercice"
            variant="outlined"
            maxlength="5000"
            :disabled="saving || !!submittedPayload"
          /><v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{
            error
          }}</v-alert
          ><v-btn type="submit" color="#24443f" :loading="saving">{{
            submittedPayload
              ? 'Réessayer l’enregistrement'
              : selected.assessment
                ? 'Valider mes réponses'
                : 'Terminer et enregistrer'
          }}</v-btn>
        </form>
      </v-card></v-dialog
    >
  </section>
</template>
<style scoped>
.exercises-workspace .tabs { width: fit-content; max-width: 100%; gap: 6px; padding: 5px; background: #eae8df; border: 1px solid #24443f0d; border-radius: 12px; }
.exercises-workspace .tabs button { padding: 11px 18px; border: 0; border-radius: 8px; }.exercises-workspace .tabs .active { background: #fffdf8; color: #24443f; box-shadow: 0 2px 6px #24443f0b; }
.cards .exercise-card { overflow: hidden; transition: border-color .2s, box-shadow .2s; }.exercise-card:hover { border-color: #d4b599; box-shadow: 0 8px 24px #24443f0c; }
.exercise-card > .card-heading { margin: -24px -24px 0; padding: 24px; min-height: 110px; background: linear-gradient(125deg, #f6e4d4, #fbf2e8); }
.exercise-card--quiz > .card-heading { background: linear-gradient(125deg, #e9e2f2, #f5f0fa); }
.exercise-icon { width: 58px; height: 58px; display: grid; place-items: center; flex-shrink: 0; border-radius: 16px; background: #ffffffb3; color: #9b5037; }.exercise-card--quiz .exercise-icon { color: #695483; }
.exercise-card .tag { background: #ffffffb3; color: #704c33; }.exercise-card--quiz .tag { color: #695483; }.exercise-duration { display: flex; align-items: center; gap: 6px; }
.history-panel .attempt { padding: 20px; margin-bottom: 14px; border: 1px solid #e5ddec; border-radius: 12px; background: #f8f5fa; }.history-panel .attempt strong { color: #695483; background: #eee7f4; border-radius: 10px; padding: 8px 12px; white-space: nowrap; }.score-progress { margin-top: 14px; max-width: 360px; }.history-panel summary { color: #695483; font-size: 13px; font-weight: 600; }
.practice-empty { border: 1px dashed #d8c7b6; border-radius: 16px; background: #fffdf8b3; }.practice-empty > .v-icon { color: #9b5037; margin-bottom: 12px; }
@media(max-width: 600px) { .exercises-workspace .tabs button { font-size: 12px; padding-inline: 12px; } }
.tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #24443f22;
  margin-bottom: 24px;
}
.tabs button {
  padding: 12px 0;
  border-bottom: 3px solid transparent;
  font-size: 14px;
}
.tabs .active {
  color: #b55d3f;
  border-color: #b55d3f;
}
.search {
  max-width: 380px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.panel {
  padding: 24px;
  background: #fffdf8;
  border: 1px solid #24443f1a;
  border-radius: 16px;
}
.cards .panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.cards .v-btn {
  margin-top: auto;
}
.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
h2 {
  font-size: 18px;
}
h3 {
  font-size: 15px;
}
.description,
p,
small {
  color: #68736c;
  line-height: 1.6;
}
.description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tag {
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 12px;
  background: #edf0e9;
}
.attempt {
  border-top: 1px solid #24443f20;
  padding: 20px 0;
}
.attempt strong {
  color: #b55d3f;
  font-size: 22px;
}
.notes {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.empty {
  padding: 40px 16px;
  text-align: center;
}
.editor {
  padding: 24px;
  background: #fffdf8;
  color: #24443f;
}
fieldset {
  border: 1px solid #24443f20;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}
legend {
  padding: 0 6px;
}
summary {
  cursor: pointer;
  margin-top: 12px;
}
.answer {
  margin-top: 14px;
}
:deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
button:focus-visible,
summary:focus-visible {
  outline: 2px solid #b55d3f;
  outline-offset: 3px;
}
@media (max-width: 900px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>

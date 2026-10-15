export function normalizeAssessment(value) {
  if (value == null) return null
  if (
    !Array.isArray(value.questions) ||
    value.questions.length < 1 ||
    value.questions.length > 20
  )
    throw new Error('Ajoutez entre 1 et 20 questions.')
  return {
    questions: value.questions.map((question, index) => {
      if (
        typeof question.prompt !== 'string' ||
        !question.prompt.trim() ||
        question.prompt.length > 1000 ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        question.options.length > 6 ||
        question.options.some(
          (option) =>
            typeof option !== 'string' || !option.trim() || option.length > 500,
        ) ||
        !Number.isInteger(question.correctIndex) ||
        question.correctIndex < 0 ||
        question.correctIndex >= question.options.length
      )
        throw new Error(
          'Vérifiez les questions, les choix et les bonnes réponses.',
        )
      return {
        id: `q${index + 1}`,
        prompt: question.prompt.trim(),
        options: question.options.map((option) => option.trim()),
        correctIndex: question.correctIndex,
      }
    }),
  }
}
export function publicExercise(exercise) {
  const { assessment, ...rest } = exercise
  return {
    ...rest,
    revision: exercise.revision || 1,
    assessment: assessment
      ? {
          questions: assessment.questions.map(({ id, prompt, options }) => ({
            id,
            prompt,
            options,
          })),
        }
      : null,
  }
}
export function scoreAttempt(exercise, body) {
  if (body.revision !== (exercise.revision || 1)) {
    const error = new Error(
      'Cet exercice a été modifié. Actualisez-le avant de recommencer.',
    )
    error.status = 409
    throw error
  }
  if (typeof body.notes !== 'string' || body.notes.length > 5000)
    throw new Error('Les notes sont limitées à 5 000 caractères.')
  const questions = exercise.assessment?.questions
  if (!questions?.length)
    return {
      kind: 'practice',
      score: null,
      correctCount: null,
      totalQuestions: 0,
      answers: [],
      notes: body.notes.trim(),
    }
  if (!Array.isArray(body.answers) || body.answers.length !== questions.length)
    throw new Error('Répondez à toutes les questions.')
  let correctCount = 0
  const answers = questions.map((question, index) => {
    const selectedIndex = body.answers[index]
    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= question.options.length
    )
      throw new Error('Une réponse est invalide.')
    if (selectedIndex === question.correctIndex) correctCount++
    return {
      questionId: question.id,
      prompt: question.prompt,
      selectedAnswer: question.options[selectedIndex],
      correct: selectedIndex === question.correctIndex,
    }
  })
  return {
    kind: 'quiz',
    score: Math.round((correctCount / questions.length) * 100),
    correctCount,
    totalQuestions: questions.length,
    answers,
    notes: body.notes.trim(),
  }
}

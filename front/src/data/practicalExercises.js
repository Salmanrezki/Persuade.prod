export const situationalExercises = [
  {
    id: 'situation-objection-prix',
    title: 'Traiter une objection sur le prix',
    type: 'situation',
    tone: 'teal',
    difficulty: 'Intermediaire',
    duration: '12 min',
    category: 'Objections',
    context:
      'Un client estime votre proposition trop chere et menace de comparer avec un concurrent.',
    objective: 'Reformuler, justifier la valeur et obtenir une prochaine etape claire.',
    prompts: [
      'Commencez par reconnaitre la perception du client sans vous justifier trop tot.',
      'Isolez la vraie objection: prix, budget, priorite ou confiance.',
      'Concluez avec une question qui engage la suite.',
    ],
    successCriteria: [
      'Vous avez reformule l objection',
      'Vous avez apporte un argument de valeur concret',
      'Vous avez termine par une prochaine action claire',
    ],
  },
  {
    id: 'situation-silence-tension',
    title: 'Repondre a un silence en reunion',
    type: 'situation',
    tone: 'gold',
    difficulty: 'Debutant',
    duration: '8 min',
    category: 'Presence',
    context:
      'Apres une proposition importante, votre interlocuteur ne repond plus et laisse un silence s installer.',
    objective: 'Garder votre calme, reprendre le cadre et relancer sans casser la dynamique.',
    prompts: [
      'Notez ce que vous ne devez pas faire dans les 5 premieres secondes.',
      'Redigez une relance courte, sobre et ouverte.',
      'Choisissez un angle: clarification, priorite ou reserve.',
    ],
    successCriteria: [
      'Votre relance reste concise',
      'Vous ne remplissez pas le silence par de la surjustification',
      'Vous ouvrez l espace de reponse du client',
    ],
  },
  {
    id: 'situation-negociation-delai',
    title: 'Negocier un delai non realiste',
    type: 'situation',
    tone: 'coral',
    difficulty: 'Avance',
    duration: '15 min',
    category: 'Cadre',
    context:
      'Le client exige une livraison plus rapide que ce qui est faisable sans degrader la qualite.',
    objective: 'Poser une limite, proposer des options et proteger la relation.',
    prompts: [
      'Listez les risques si vous acceptez sans recadrer.',
      'Redigez une reponse en 3 temps: contrainte, option, choix.',
      'Preparez une alternative partielle acceptable.',
    ],
    successCriteria: [
      'Vous dites non sans rupture',
      'Vous proposez au moins deux options',
      'Vous gardez la discussion orientee solution',
    ],
  },
]

const normalizeTone = (index) => ['teal', 'gold', 'coral'][index % 3]

export const buildCourseLinkedExercises = (viewedCourses, allCourses) => {
  const coursesById = new Map(allCourses.map((course) => [course.id, course]))

  return viewedCourses.flatMap((viewedCourse, index) => {
    const course = coursesById.get(viewedCourse.id) || viewedCourse
    const tone = normalizeTone(index)
    const baseTitle = course.title || 'Cours'
    const category = course.category || 'Negociation'
    const level = course.level || 'Tous niveaux'
    const mode = course.coachingMode || 'video'

    return [
      {
        id: `course-reflex-${course.id}`,
        type: 'linked',
        tone,
        title: `Synthese active: ${baseTitle}`,
        difficulty: level,
        duration: '10 min',
        category,
        linkedCourseId: course.id,
        linkedCourseTitle: baseTitle,
        objective: 'Transformer ce que vous avez consulte en plan d action concret.',
        prompts: [
          'Identifiez les 3 idees les plus utiles retenues dans ce cours.',
          'Precisez une situation reelle ou vous allez appliquer ces idees cette semaine.',
          'Choisissez un indicateur simple pour verifier vos progres.',
        ],
        successCriteria: [
          '3 apprentissages cles notes',
          '1 situation reelle identifiee',
          '1 action concrete definie',
        ],
        context: `Exercice de consolidation lie au cours consulte: ${baseTitle}.`,
      },
      {
        id: `course-application-${course.id}`,
        type: 'linked',
        tone,
        title: `Application guidee: ${baseTitle}`,
        difficulty: level,
        duration: mode === 'one_to_one' ? '15 min' : '12 min',
        category,
        linkedCourseId: course.id,
        linkedCourseTitle: baseTitle,
        objective: 'Vous exercer sur un cas proche du contenu consulte sans quitter la plateforme.',
        prompts: [
          `Redigez une ouverture de conversation en reprenant le theme ${category.toLowerCase()}.`,
          'Listez une objection probable et votre reponse la plus sobre.',
          'Terminez par une question de progression ou de validation.',
        ],
        successCriteria: [
          'Une ouverture claire',
          'Une objection traitee',
          'Une prochaine etape formulee',
        ],
        context: `Mise en pratique inspiree du cours ${baseTitle}.`,
      },
    ]
  })
}

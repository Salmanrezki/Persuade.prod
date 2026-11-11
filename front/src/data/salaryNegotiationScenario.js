export const negotiationSteps = [
  {
    id: 'opening',
    eyebrow: 'Le rendez-vous commence',
    title: 'Comment ouvrez-vous la discussion ?',
    situation:
      'La responsable RH vous accueille : « Bonjour, installez-vous. Vous souhaitiez faire un point sur votre évolution. Je vous écoute. »',
    scene: 'practice',
    options: [
      {
        id: 'A',
        text: "Depuis deux ans, mes responsabilités ont augmenté et mes résultats sont bons. J’aimerais discuter d’une augmentation de 10 % qui reflète cette évolution.",
        feedback:
          'Votre demande est claire et repose sur votre contribution dans l’entreprise.',
        score: 2,
      },
      {
        id: 'B',
        text: 'Les salaires du marché sont plus élevés pour mon poste. Je souhaite donc une augmentation de 10 %.',
        feedback:
          'Le marché donne un repère, mais la responsable RH voudra aussi parler de votre contribution personnelle.',
        score: 1,
      },
      {
        id: 'C',
        text: 'Je pense mériter une augmentation. Qu’est-ce que vous pourriez me proposer ?',
        feedback:
          'Votre demande reste vague et laisse la responsable RH fixer seule le cadre de la discussion.',
        score: 0,
      },
    ],
  },
  {
    id: 'objection',
    eyebrow: 'La première objection',
    title: 'Comment répondez-vous à cette objection ?',
    situation:
      "La responsable RH répond : « Je comprends votre demande, mais nous avons actuellement des contraintes budgétaires. Je ne suis pas certaine que nous puissions envisager une telle augmentation cette année. »",
    scene: 'practice',
    options: [
      {
        id: 'A',
        text: 'Je comprends les contraintes. Pourrions-nous discuter des résultats ou objectifs qui permettraient de justifier cette augmentation ?',
        feedback:
          'Vous ne bloquez pas sur le refus. Vous cherchez ce qui permettrait de faire avancer la demande.',
        score: 2,
      },
      {
        id: 'B',
        text: "Pourtant, je sais que certaines personnes dans l'entreprise gagnent davantage que moi.",
        feedback:
          'La comparaison détourne la discussion. Revenez à vos résultats et à vos responsabilités.',
        score: 1,
      },
      {
        id: 'C',
        text: "Dans ce cas, je pense que je vais devoir envisager d'autres opportunités professionnelles.",
        feedback:
          'Cette pression ferme la discussion. Ne menacez de partir que si vous êtes prêt à le faire.',
        score: 0,
      },
    ],
  },
  {
    id: 'conclusion',
    eyebrow: 'La discussion touche à sa fin',
    title: 'Comment concluez-vous la négociation ?',
    situation:
      "La responsable RH explique : « Je ne peux pas vous confirmer une augmentation aujourd'hui. En revanche, nous pourrions refaire un point dans quelques mois. »",
    scene: 'progress',
    options: [
      {
        id: 'A',
        text: 'Pouvons-nous définir ensemble des objectifs précis, une échéance et les conditions qui permettraient de valider cette augmentation ?',
        feedback:
          'Vous obtenez une date, des critères et une prochaine étape claire.',
        score: 2,
      },
      {
        id: 'B',
        text: "D'accord, nous en reparlerons dans quelques mois.",
        feedback:
          'Sans date ni critères, le sujet peut facilement être repoussé une nouvelle fois.',
        score: 1,
      },
      {
        id: 'C',
        text: "Je préférerais obtenir une réponse définitive aujourd'hui.",
        feedback:
          'La responsable RH ne peut pas décider maintenant. Insister ne crée pas de nouvelle marge de manœuvre.',
        score: 0,
      },
    ],
  },
]

const openingContexts = {
  A: 'Votre entrée en matière est claire et appuyée par des résultats.',
  B: 'Votre référence au marché est entendue, mais votre contribution reste à démontrer.',
  C: 'Votre demande manque de précision et la responsable RH vous demande de la justifier.',
}

const objectionContexts = {
  A: 'Votre posture constructive maintient un dialogue ouvert.',
  B: 'La comparaison a rendu la responsable RH plus réservée.',
  C: 'La pression exercée a installé une tension dans la discussion.',
}

export const getContextualReaction = (stepIndex, answers) => {
  if (stepIndex === 0) {
    const outcomes = {
      A: 'La responsable RH prend note de vos résultats et vous demande de préciser vos attentes.',
      B: 'Elle reconnaît l’écart avec le marché, puis vous demande ce qui justifie cette évolution en interne.',
      C: 'Elle vous demande sur quels résultats précis repose votre demande.',
    }
    return outcomes[answers[0]]
  }

  if (stepIndex === 1) {
    const opening = openingContexts[answers[0]]
    const outcomes = {
      A: 'La responsable RH accepte d’examiner avec vous des critères de progression concrets.',
      B: 'Elle recentre la discussion sur votre contribution individuelle.',
      C: 'Elle vous demande si vous envisagez réellement de quitter l’entreprise.',
    }
    return `${opening} ${outcomes[answers[1]]}`
  }

  const opening = openingContexts[answers[0]]
  const objection = objectionContexts[answers[1]]
  const outcomes = {
    A: 'Vous repartez avec des objectifs et une date de suivi, mais sans augmentation confirmée aujourd’hui.',
    B: 'La discussion est reportée sans engagement précis ni date ferme.',
    C: 'La responsable RH maintient sa position et la discussion se termine avec une tension perceptible.',
  }
  return `${opening} ${objection} ${outcomes[answers[2]]}`
}

export const getFinalTone = (answers) => {
  const total = answers.reduce((score, answer, index) => {
    const option = negotiationSteps[index].options.find((entry) => entry.id === answer)
    return score + (option?.score || 0)
  }, 0)

  if (total >= 5) return 'Vous avez construit une discussion solide et obtenu une suite concrète.'
  if (total >= 3) return 'Vous avez maintenu le dialogue, mais plusieurs leviers restent à structurer.'
  return 'La discussion a manqué de méthode et aucun engagement concret n’a été obtenu.'
}

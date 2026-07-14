export const quizExercises = [
  {
    id: 'quiz-batna-fondamentaux',
    title: 'Quiz BATNA et marge de manoeuvre',
    type: 'quiz',
    tone: 'teal',
    difficulty: 'Intermediaire',
    duration: '9 min',
    timeboxSeconds: 420,
    category: 'Preparation',
    context:
      'Ce quiz verifie votre capacite a distinguer votre meilleure alternative, votre seuil d acceptation et la marge reelle de negociation.',
    objective: 'Clarifier ce que vous devez preparer avant d entrer dans une negociation.',
    successCriteria: [
      'Vous distinguez BATNA, objectif et seuil minimum',
      'Vous savez comparer une offre a votre alternative',
      'Vous identifiez les signaux d une mauvaise preparation',
    ],
    questions: [
      {
        id: 'batna-1',
        prompt: 'Le BATNA correspond a :',
        choices: [
          'votre meilleure alternative si aucun accord n est trouve',
          'la premiere offre que vous formulez',
          'le prix ideal que vous aimeriez obtenir',
        ],
        answerIndex: 0,
        explanation:
          'Le BATNA sert de point de comparaison si la negociation n aboutit pas. Il ne remplace ni votre objectif, ni votre premiere proposition.',
      },
      {
        id: 'batna-2',
        prompt: 'Pourquoi preparer son BATNA avant une discussion difficile ?',
        choices: [
          'pour parler plus longtemps',
          'pour eviter d accepter un accord moins bon que votre alternative',
          'pour montrer que vous etes plus agressif',
        ],
        answerIndex: 1,
        explanation:
          'Un BATNA clair vous protege contre les accords subis et vous aide a decider plus lucidement.',
      },
      {
        id: 'batna-3',
        prompt: 'Si votre seule alternative est floue, quel risque augmente ?',
        choices: [
          'vous survalorisez l accord propose',
          'vous ecoutez mieux l autre partie',
          'vous trouvez plus vite une solution creative',
        ],
        answerIndex: 0,
        explanation:
          'Sans alternative tangible, vous pouvez surevaluer l offre en face et negocier avec moins de recul.',
      },
    ],
  },
  {
    id: 'quiz-ancrage-premiere-offre',
    title: 'Quiz Ancrage et premiere offre',
    type: 'quiz',
    tone: 'gold',
    difficulty: 'Intermediaire',
    duration: '8 min',
    timeboxSeconds: 360,
    category: 'Influence',
    context:
      'Un premier chiffre pose souvent un repere mental. Ce quiz teste votre capacite a reconnaitre et recadrer cet effet.',
    objective: 'Savoir reagir a un ancrage trop agressif sans perdre le fil de la discussion.',
    successCriteria: [
      'Vous identifiez l effet d ancrage',
      'Vous savez recentrer sur des criteres',
      'Vous evitez de negocier uniquement autour du premier chiffre',
    ],
    questions: [
      {
        id: 'anchor-1',
        prompt: 'Dans une negociation, un ancrage designe surtout :',
        choices: [
          'une pause de quelques minutes',
          'un premier repere qui influence les jugements suivants',
          'une reformulation empathique',
        ],
        answerIndex: 1,
        explanation:
          'Le premier chiffre ou repere propose peut structurer toute la suite, meme si sa base est faible.',
      },
      {
        id: 'anchor-2',
        prompt: 'Face a une premiere offre tres basse, quelle reaction est la plus utile ?',
        choices: [
          'l accepter pour garder une bonne relation',
          'la contester sans argument',
          'revenir aux criteres, aux faits et a votre propre cadre',
        ],
        answerIndex: 2,
        explanation:
          'Le plus efficace est de sortir du seul chiffre et de reposer des criteres defensables.',
      },
      {
        id: 'anchor-3',
        prompt: 'Quel piege est frequent quand on subit un ancrage ?',
        choices: [
          'on ajuste trop peu loin du premier repere',
          'on coupe automatiquement la conversation',
          'on oublie de remercier son interlocuteur',
        ],
        answerIndex: 0,
        explanation:
          'Le risque classique est de rester psychologiquement trop proche du premier chiffre pose.',
      },
    ],
  },
  {
    id: 'quiz-ecoute-active',
    title: 'Quiz Ecoute active en negociation',
    type: 'quiz',
    tone: 'coral',
    difficulty: 'Debutant',
    duration: '7 min',
    timeboxSeconds: 300,
    category: 'Ecoute',
    context:
      'L ecoute active aide a faire baisser la tension et a comprendre les vrais enjeux de l autre partie.',
    objective: 'Verifier vos reflexes d ecoute avant une discussion sensible.',
    successCriteria: [
      'Vous reperez les bons comportements d ecoute',
      'Vous savez reformuler sans couper',
      'Vous distinguez ecouter de repondre trop vite',
    ],
    questions: [
      {
        id: 'listen-1',
        prompt: 'Quel comportement va dans le sens de l ecoute active ?',
        choices: [
          'preparer mentalement votre contre-argument pendant que l autre parle',
          'reformuler ce que vous avez compris avant de proposer une reponse',
          'changer de sujet pour reduire la tension',
        ],
        answerIndex: 1,
        explanation:
          'La reformulation permet de verifier la comprehension et de reduire les malentendus.',
      },
      {
        id: 'listen-2',
        prompt: 'Pourquoi l ecoute active est-elle utile dans une negociation tendue ?',
        choices: [
          'elle aide a faire baisser la defensivite et a clarifier les besoins',
          'elle remplace toute preparation',
          'elle garantit un accord rapide',
        ],
        answerIndex: 0,
        explanation:
          'Une bonne ecoute peut apaiser l echange et faire emerger des informations utiles pour la suite.',
      },
      {
        id: 'listen-3',
        prompt: 'Laquelle de ces formulations est la plus proche d une bonne reformulation ?',
        choices: [
          'Ce n est pas un vrai probleme.',
          'Si je vous suis bien, votre reserve porte surtout sur le delai et le risque.',
          'Oui mais vous n avez pas toutes les informations.',
        ],
        answerIndex: 1,
        explanation:
          'La reformulation reprend le fond du message sans le juger ni le contredire trop tot.',
      },
    ],
  },
  {
    id: 'quiz-concessions',
    title: 'Quiz Concessions et echanges',
    type: 'quiz',
    tone: 'teal',
    difficulty: 'Avance',
    duration: '10 min',
    timeboxSeconds: 480,
    category: 'Strategie',
    context:
      'Faire une concession trop vite peut fragiliser votre position. Ce quiz teste votre logique d echange.',
    objective: 'Verifier si vous savez conceder avec cadre, contrepartie et intention.',
    successCriteria: [
      'Vous savez demander une contrepartie',
      'Vous evitez les concessions gratuites',
      'Vous gardez la progression de l echange sous controle',
    ],
    questions: [
      {
        id: 'concession-1',
        prompt: 'Une bonne concession se fait idealement :',
        choices: [
          'sans rien demander pour montrer votre souplesse',
          'en l echange d une contrepartie ou d un engagement clair',
          'uniquement en fin de reunion',
        ],
        answerIndex: 1,
        explanation:
          'Une concession utile doit faire avancer l echange, pas seulement reduire votre marge.',
      },
      {
        id: 'concession-2',
        prompt: 'Quel signal donne une concession immediate et importante ?',
        choices: [
          'que votre position initiale etait peut-etre peu solide',
          'que l accord est deja finalise',
          'que votre interlocuteur a perdu son pouvoir',
        ],
        answerIndex: 0,
        explanation:
          'Une grosse concession trop rapide peut affaiblir votre credibilite ou pousser l autre a demander plus.',
      },
      {
        id: 'concession-3',
        prompt: 'Quelle formulation est la plus solide ?',
        choices: [
          'Bon, d accord, on baisse tout de suite.',
          'On peut avancer sur ce point si nous securisons aussi le calendrier et le volume.',
          'Je fais un effort, mais sans condition.',
        ],
        answerIndex: 1,
        explanation:
          'La concession est ici liee a un echange precis et a une avancee mesurable.',
      },
    ],
  },
]

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
    modelResponse:
      'Je comprends que le montant vous fasse reagir. Avant de parler du chiffre lui-meme, j aimerais verifier ce qui vous semble le plus sensible: le budget disponible, la comparaison avec d autres offres ou la valeur percue de notre proposition. Si nous devons ajuster quelque chose, je prefere le faire de facon utile pour vous et soutenable pour nous.',
    debriefPoints: [
      'Commencer par reconnaitre la perception du client',
      'Verifier la nature exacte de l objection avant d argumenter',
      'Recadrer la discussion sur la valeur et la suite',
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
    modelResponse:
      'Je vous laisse un instant. Ce qui m aiderait, c est de savoir si votre hesitation porte plutot sur la priorite du sujet, le niveau de risque ou un point que nous n avons pas encore clarifie.',
    debriefPoints: [
      'Ne pas casser le silence par nervosite',
      'Nommer un cadre simple pour faciliter la reprise',
      'Proposer des options de lecture plutot qu une interpretation unique',
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
    modelResponse:
      'Dans le delai que vous demandez, nous prenons un risque reel sur la qualite. Je vois deux options serieuses: soit nous gardons le niveau de qualite et adaptons la date, soit nous maintenons la date sur un perimetre plus restreint. Laquelle de ces options est la plus utile pour vous ?',
    debriefPoints: [
      'Nommer la contrainte sans agressivite',
      'Proposer plusieurs chemins au lieu d un refus sec',
      'Laisser a l interlocuteur un vrai choix de priorite',
    ],
  },
  {
    id: 'situation-achat-fournisseur',
    title: 'Renegocier avec un fournisseur sous tension',
    type: 'situation',
    tone: 'teal',
    difficulty: 'Avance',
    duration: '14 min',
    category: 'Achats',
    context:
      'Un fournisseur refuse toute baisse de prix mais souhaite securiser un volume sur plusieurs mois.',
    objective: 'Elargir la discussion au-dela du prix et construire un echange plus global.',
    prompts: [
      'Listez trois variables negociables autres que le prix.',
      'Preparez une question pour comprendre ce qui compte vraiment pour le fournisseur.',
      'Formulez une proposition paquet avec contreparties.',
    ],
    successCriteria: [
      'Vous ne restez pas bloques sur un seul variable',
      'Vous explorez les interets reels de l autre partie',
      'Vous proposez un echange structure',
    ],
    modelResponse:
      'Si le prix unitaire ne bouge pas, regardons ce qui peut creer de la valeur autrement: engagement de volume, delais de paiement, priorite de production ou niveau de service. Qu est-ce qui a le plus de poids pour vous dans les prochains mois ?',
    debriefPoints: [
      'Sortir du duel sur le prix',
      'Explorer les variables secondaires a forte valeur',
      'Construire une proposition paquet coherente',
    ],
  },
  {
    id: 'situation-recadrage-reunion',
    title: 'Recadrer une reunion qui part dans tous les sens',
    type: 'situation',
    tone: 'gold',
    difficulty: 'Intermediaire',
    duration: '11 min',
    category: 'Pilotage',
    context:
      'Plusieurs sujets s empilent, les interlocuteurs se coupent et la decision attendue disparait du radar.',
    objective: 'Reprendre le cadre sans braquer le groupe et faire revenir la discussion sur la decision utile.',
    prompts: [
      'Redigez une phrase de recadrage breve et neutre.',
      'Choisissez l ordre des points a traiter pour retrouver de la clarte.',
      'Terminez par une formulation qui engage une decision ou une suite.',
    ],
    successCriteria: [
      'Le recadrage reste ferme mais calme',
      'Vous redonnez une priorite claire',
      'La reunion retrouve une prochaine etape concrete',
    ],
    modelResponse:
      'Je vous propose que l on recentre cinq minutes sur la decision attendue aujourd hui. Si cela vous va, on traite d abord le point qui bloque la validation, puis on range les sujets secondaires pour la suite.',
    debriefPoints: [
      'Recadrer le temps et l objet de la reunion',
      'Nommer la priorite sans juger les personnes',
      'Transformer le flottement en sequence claire',
    ],
  },
  {
    id: 'situation-client-attentiste',
    title: 'Debloquer un client qui repousse toujours',
    type: 'situation',
    tone: 'coral',
    difficulty: 'Intermediaire',
    duration: '10 min',
    category: 'Closing',
    context:
      'Le prospect dit etre interesse mais reporte sans cesse la decision et demande encore du temps.',
    objective: 'Faire emerger le vrai frein et avancer vers un oui, un non ou un test concret.',
    prompts: [
      'Formulez une question qui fait apparaitre le vrai blocage.',
      'Preparez une relance qui propose un prochain pas a faible risque.',
      'Ecrivez une phrase qui clarifie le cout de l attente.',
    ],
    successCriteria: [
      'Vous ne confondez pas politesse et engagement reel',
      'Vous faites apparaitre le point de blocage',
      'Vous transformez le flou en decision ou en test',
    ],
    modelResponse:
      'J ai le sentiment que l interet est la, mais qu il reste un point qui bloque la decision. Pour etre utile plutot que de relancer dans le vide, qu est-ce qui manque concretement pour que vous puissiez soit avancer, soit me dire que le timing n est pas bon ?',
    debriefPoints: [
      'Nommer le flou avec tact',
      'Faire apparaitre le vrai frein',
      'Chercher une decision ou un test concret plutot qu une attente vague',
    ],
  },
]

const normalizeTone = (index) => ['teal', 'gold', 'coral'][index % 3]

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const inferCourseQuizTheme = (course = {}, index = 0) => {
  const fingerprint = `${course.title || ''} ${course.subtitle || ''} ${course.category || ''} ${course.description || ''}`.toLowerCase()

  if (
    fingerprint.includes('empath') ||
    fingerprint.includes('ecoute') ||
    fingerprint.includes('reformul') ||
    fingerprint.includes('communication')
  ) {
    return {
      category: 'Ecoute active',
      objective: 'Verifier votre capacite a ecouter, reformuler et faire progresser une conversation sensible.',
      context:
        'Vous venez de consulter une video orientee ecoute active et empathie tactique. Ce quiz vous aide a transformer ces principes en reflexes concrets.',
      successCriteria: [
        'Vous reperez les bons reflexes d ecoute',
        'Vous savez reformuler sans affaiblir votre cadre',
        'Vous gardez la conversation orientee clarification',
      ],
      questions: [
        {
          key: 'listen-main',
          prompt: 'Quel reflexe montre une empathie tactique utile en negociation ?',
          choices: [
            'reformuler la preoccupation de l autre avant de proposer votre solution',
            'corriger tout de suite son raisonnement',
            'multiplier les arguments pour reprendre le controle',
          ],
          answerIndex: 0,
          explanation:
            'L empathie tactique commence par une comprehension exprimee clairement, avant toute tentative de persuasion.',
        },
        {
          key: 'listen-objection',
          prompt: 'Quand une reserve apparait, quelle suite est la plus solide ?',
          choices: [
            'passer au point suivant pour garder le rythme',
            'demander ce qui cree exactement cette reserve',
            'faire une concession immediate',
          ],
          answerIndex: 1,
          explanation:
            'Une reserve bien clarifiee evite de repondre a cote et donne une base plus utile a la suite de l echange.',
        },
        {
          key: 'listen-posture',
          prompt: 'La meilleure reformulation ressemble plutot a :',
          choices: [
            'Si je vous suis bien, votre hesitation porte sur le risque et le delai.',
            'Vous avez tort de voir les choses comme ca.',
            'Je vais vous expliquer pourquoi ce n est pas un probleme.',
          ],
          answerIndex: 0,
          explanation:
            'Une bonne reformulation reprend le fond du message sans juger ni recadrer trop tot.',
        },
      ],
    }
  }

  if (
    fingerprint.includes('conflit') ||
    fingerprint.includes('compromis') ||
    fingerprint.includes('objection') ||
    fingerprint.includes('tension')
  ) {
    return {
      category: 'Gestion de tension',
      objective: 'Verifier vos reflexes pour traiter une tension sans sortir du cadre de negociation.',
      context:
        'Cette video abordait la gestion du conflit, des desaccords ou des objections. Le quiz teste vos choix de posture sous pression.',
      successCriteria: [
        'Vous evitez l escalade immediate',
        'Vous savez recentrer sur les interets utiles',
        'Vous cherchez un compromis praticable plutot qu un accord flou',
      ],
      questions: [
        {
          key: 'conflict-main',
          prompt: 'Face a un desaccord qui se durcit, quel premier geste est le plus utile ?',
          choices: [
            'revenir aux enjeux precis et aux points a clarifier',
            'forcer un compromis immediate',
            'rappeler que vous avez raison',
          ],
          answerIndex: 0,
          explanation:
            'Quand la tension monte, le plus utile est de redonner du cadre et de la clarte avant de pousser une solution.',
        },
        {
          key: 'conflict-compromise',
          prompt: 'Un compromis utile doit surtout etre :',
          choices: [
            'rapide, meme si personne ne sait comment l appliquer',
            'clair, realiste et acceptable pour les deux parties',
            'vague pour laisser de la souplesse',
          ],
          answerIndex: 1,
          explanation:
            'Un bon compromis n est pas juste un accord verbal: il doit etre concret et applicable.',
        },
        {
          key: 'conflict-objection',
          prompt: 'Que faire quand l autre formule une objection abrupte ?',
          choices: [
            'la prendre comme une attaque personnelle',
            'identifier ce qui bloque reellement avant de repondre',
            'proposer tout de suite une baisse de prix',
          ],
          answerIndex: 1,
          explanation:
            'Une objection est souvent un signal d information manquante, de risque percu ou de priorite differente.',
        },
      ],
    }
  }

  return {
    category: 'Preparation',
    objective: 'Verifier si vous savez preparer un echange avec cadre, objectif et prochaine action claire.',
    context:
      'Vous avez consulte une video de fondamentaux ou de preparation. Ce quiz valide les reperes de base avant une negociation.',
    successCriteria: [
      'Vous distinguez objectif, alternative et seuil',
      'Vous reperez les bons reflexes avant de negocier',
      'Vous savez relier une idee vue a une action concrete',
    ],
    questions: [
      {
        key: 'prep-main',
        prompt: 'Apres avoir vu ce cours, quel est le meilleur premier usage du contenu ?',
        choices: [
          'transformer une idee cle en action observable a tester',
          'attendre un contexte parfait pour l utiliser',
          'retenir seulement les definitions theoriques',
        ],
        answerIndex: 0,
        explanation:
          'Le contenu est vraiment appris quand il est transforme rapidement en comportement testable.',
      },
      {
        key: 'prep-batna',
        prompt: 'Avant une discussion importante, il est utile de clarifier :',
        choices: [
          'votre objectif, votre marge et votre alternative',
          'uniquement la premiere phrase a prononcer',
          'seulement les concessions que vous ferez',
        ],
        answerIndex: 0,
        explanation:
          'Une bonne preparation repose sur plusieurs reperes, pas uniquement sur l ouverture de discussion.',
      },
      {
        key: 'prep-next-step',
        prompt: 'En sortie de video, quel signe montre que l apprentissage est exploitable ?',
        choices: [
          'vous pouvez nommer une situation ou tester le contenu cette semaine',
          'vous avez regarde la video jusqu au bout',
          'vous etes d accord avec toutes les idees entendues',
        ],
        answerIndex: 0,
        explanation:
          'L apprentissage devient utile quand il est rattache a une situation concrete et proche.',
      },
    ],
  }
}

const buildViewedCourseQuiz = (course, index) => {
  const tone = normalizeTone(index)
  const theme = inferCourseQuizTheme(course, index)
  const baseTitle = course.title || 'Cours'
  const level = course.level || 'Tous niveaux'
  const courseSlug = slugify(course.id || baseTitle || `course-${index + 1}`)

  return {
    id: `recommended-video-quiz-${courseSlug}`,
    type: 'quiz',
    tone,
    title: `Quiz video: ${baseTitle}`,
    difficulty: level,
    duration: '7 min',
    timeboxSeconds: 300,
    category: theme.category,
    linkedCourseId: course.id,
    linkedCourseTitle: baseTitle,
    linkedCourseCategory: course.category || '',
    objective: theme.objective,
    context: `${theme.context} Video consultee: ${baseTitle}.`,
    successCriteria: theme.successCriteria,
    questions: theme.questions.map((question) => ({
      id: `${courseSlug}-${question.key}`,
      prompt: question.prompt,
      choices: question.choices,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    })),
  }
}

export const buildRecommendedVideoQuizzes = (viewedCourses, allCourses) => {
  const coursesById = new Map((allCourses || []).map((course) => [course.id, course]))

  return (viewedCourses || [])
    .slice(0, 3)
    .map((viewedCourse, index) => {
      const course = coursesById.get(viewedCourse.id) || viewedCourse
      return buildViewedCourseQuiz(course, index)
    })
}

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

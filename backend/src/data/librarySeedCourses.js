const buildSeedCourse = ({
  id,
  title,
  subtitle,
  description,
  level,
  duration,
  category,
  targetAudience,
  prerequisites,
  outcomes,
  bookingNotes,
  videoUrl,
  coverImage,
  order,
}) => ({
  id,
  title,
  subtitle,
  description,
  level,
  duration,
  category,
  language: 'Français',
  coachingMode: 'video',
  sessionCount: '3 modules guidés',
  price: 'Inclus',
  targetAudience,
  prerequisites,
  outcomes,
  bookingNotes,
  coverImage,
  videoUrl,
  meetingLink: '',
  featured: true,
  coachId: null,
  coachName: null,
  createdBy: 'seed-library',
  type: 'library',
  order,
  createdAt: `2026-01-${String(order).padStart(2, '0')}T09:00:00.000Z`,
})

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const wrapTitleLines = (value, maxLength = 26) => {
  const words = String(value || '').split(' ').filter(Boolean)
  const lines = []
  let currentLine = ''

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (nextLine.length <= maxLength || !currentLine) {
      currentLine = nextLine
      return
    }

    lines.push(currentLine)
    currentLine = word
  })

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.slice(0, 3)
}

const buildSeedCover = ({ title, category, accent, accentSoft }) => {
  const safeTitleLines = wrapTitleLines(title)
    .map(
      (line, index) =>
        `<tspan x="74" dy="${index === 0 ? 0 : 66}">${escapeXml(line)}</tspan>`
    )
    .join('')
  const safeCategory = escapeXml(category)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accentSoft}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#bg)" />
      <circle cx="1020" cy="120" r="140" fill="rgba(255,255,255,0.12)" />
      <circle cx="190" cy="620" r="180" fill="rgba(255,255,255,0.08)" />
      <rect x="74" y="76" width="238" height="42" rx="21" fill="rgba(255,255,255,0.18)" />
      <text x="104" y="103" fill="#f7fbfb" font-size="21" font-family="Arial, sans-serif">Cours pre-enregistre</text>
      <text x="74" y="230" fill="#ffffff" font-size="58" font-weight="700" font-family="Arial, sans-serif">${safeTitleLines}</text>
      <text x="74" y="432" fill="rgba(255,255,255,0.92)" font-size="29" font-family="Arial, sans-serif">${safeCategory}</text>
      <text x="74" y="612" fill="rgba(255,255,255,0.82)" font-size="24" font-family="Arial, sans-serif">Negotiation • Persuade</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const videoPlaylist = [
  'https://www.youtube.com/watch?v=90svIa07ilQ',
  'https://www.youtube.com/watch?v=q9-3STZ8q5A',
  'https://www.youtube.com/watch?v=uWD95n_86fA',
]

const coverPalette = [
  ['#0f4f50', '#2f8f83'],
  ['#5f3dc4', '#8b5cf6'],
  ['#9a3412', '#f97316'],
  ['#1d4ed8', '#38bdf8'],
  ['#7c2d12', '#fb7185'],
  ['#14532d', '#22c55e'],
  ['#3f3f46', '#71717a'],
  ['#164e63', '#06b6d4'],
  ['#854d0e', '#facc15'],
  ['#7f1d1d', '#ef4444'],
  ['#312e81', '#6366f1'],
  ['#134e4a', '#14b8a6'],
  ['#581c87', '#d946ef'],
]

const withSeedMedia = (course, index) => {
  const [accent, accentSoft] = coverPalette[index % coverPalette.length]

  return buildSeedCourse({
    ...course,
    videoUrl: course.videoUrl || videoPlaylist[index % videoPlaylist.length],
    coverImage:
      course.coverImage ||
      buildSeedCover({
        title: course.title,
        category: course.category,
        accent,
        accentSoft,
      }),
  })
}

export const librarySeedCourses = [
  withSeedMedia({
    id: 'seed-negociation-tactiques-fondamentaux',
    title: 'Les fondamentaux des tactiques de négociation',
    subtitle: 'Ancrage, silence, concessions et rythme de discussion',
    description:
      'Un cours d’entrée très concret pour comprendre les mécaniques qui structurent une négociation moderne. Vous découvrez comment poser le cadre, faire émerger les intérêts de l’autre partie et éviter les concessions trop rapides.',
    level: 'Débutant',
    duration: '18 min',
    category: 'Bases de la négociation',
    targetAudience: 'Professionnels, freelances, commerciaux et profils en reconversion',
    prerequisites: [
      'Aucun pré-requis technique',
      'Vouloir structurer ses échanges de manière plus stratégique',
    ],
    outcomes: [
      'Identifier les tactiques classiques utilisées en face de vous',
      'Savoir ouvrir une négociation avec un cadre clair',
      'Utiliser le silence et l’ancrage sans agressivité',
    ],
    bookingNotes:
      'Idéal comme premier module pour poser un vocabulaire commun avant d’aborder la persuasion, le traitement des objections et les négociations à enjeu.',
    order: 1,
  }, 0),
  withSeedMedia({
    id: 'seed-negociation-empathie-tactique',
    title: 'Empathie tactique et négociation à enjeu',
    subtitle: 'Mieux écouter, mieux reformuler, mieux conduire la discussion',
    description:
      'Ce cours vous aide à passer d’une négociation défensive à une négociation maîtrisée. Vous travaillez l’écoute active, le cadrage émotionnel et la reformulation stratégique pour créer davantage de confiance sans perdre votre position.',
    level: 'Intermédiaire',
    duration: '24 min',
    category: 'Communication persuasive',
    targetAudience: 'Managers, recruteurs, responsables de comptes et entrepreneurs',
    prerequisites: [
      'Être déjà confronté à des discussions importantes ou sensibles',
      'Souhaiter mieux gérer la relation autant que le résultat',
    ],
    outcomes: [
      'Adopter une posture plus calme et crédible sous pression',
      'Formuler des questions qui font progresser l’échange',
      'Utiliser l’empathie comme levier stratégique et non comme faiblesse',
    ],
    bookingNotes:
      'À suivre juste après les fondamentaux si vous voulez améliorer la qualité de vos conversations commerciales, salariales ou managériales.',
    order: 2,
  }, 1),
  withSeedMedia({
    id: 'seed-negociation-conflit-compromis',
    title: 'Gérer les conflits et trouver un compromis utile',
    subtitle: 'Transformer les désaccords en terrain de négociation',
    description:
      'Une formation pensée pour les situations où la tension monte, où les positions se figent et où le dialogue perd en qualité. Vous apprenez à reprendre le contrôle de la discussion, clarifier les enjeux et avancer vers un accord praticable.',
    level: 'Intermédiaire',
    duration: '16 min',
    category: 'Gestion de conflit',
    targetAudience: 'Managers, RH, chefs de projet et équipes commerciales',
    prerequisites: [
      'Avoir déjà vécu des échanges tendus ou bloqués',
      'Vouloir sortir du rapport de force stérile',
    ],
    outcomes: [
      'Repérer les points de friction avant qu’ils explosent',
      'Recentrer l’échange sur les intérêts communs',
      'Construire un compromis clair, réaliste et actionnable',
    ],
    bookingNotes:
      'Très utile pour les réunions sensibles, les discussions internes difficiles et les négociations où la relation doit être préservée.',
    order: 3,
  }, 2),
  withSeedMedia({
    id: 'seed-negociation-preparation-strategique',
    title: 'Préparer une négociation sans improviser',
    subtitle: 'Objectifs, BATNA, marges et signaux a clarifier avant l’entretien',
    description:
      'Ce module vous donne une trame de préparation simple et robuste pour arriver en discussion avec une ligne claire. Vous définissez vos objectifs, vos limites, vos alternatives et les points à faire émerger chez l’autre partie.',
    level: 'Débutant',
    duration: '14 min',
    category: 'Preparation strategique',
    targetAudience: 'Toute personne qui negocie des prix, delais, salaires ou conditions',
    prerequisites: [
      'Vouloir structurer son raisonnement en amont',
      'Avoir une prochaine negotiation a preparer',
    ],
    outcomes: [
      'Fixer une cible, un plancher et une zone d’accord',
      'Identifier vos leviers avant d’entrer en reunion',
      'Eviter les improvisations qui affaiblissent votre position',
    ],
    bookingNotes:
      'Un excellent point de depart avant une discussion commerciale, salariale ou fournisseur.',
    order: 4,
  }, 3),
  withSeedMedia({
    id: 'seed-negociation-objections-clients',
    title: 'Traiter les objections client avec calme',
    subtitle: 'Prix, delais, comparaison concurrente et hesitation finale',
    description:
      'Vous apprenez à répondre aux objections sans vous justifier excessivement. Le cours montre comment accueillir la résistance, recadrer les enjeux et ramener la discussion vers la valeur plutôt que le seul prix.',
    level: 'Intermédiaire',
    duration: '21 min',
    category: 'Negociation commerciale',
    targetAudience: 'Commerciaux, independants, dirigeants de petites structures',
    prerequisites: [
      'Faire face a des objections recurrentes en vente',
      'Vouloir repondre avec plus de methode',
    ],
    outcomes: [
      'Differencier une objection reelle d’un simple test',
      'Reformuler sans se mettre sur la defensive',
      'Conclure plus proprement sans brader votre offre',
    ],
    bookingNotes:
      'Particulierement utile pour les appels de vente, demos et propositions commerciales.',
    order: 5,
  }, 4),
  withSeedMedia({
    id: 'seed-negociation-salaire-augmentation',
    title: 'Négocier son salaire ou une augmentation',
    subtitle: 'Construire une demande solide et tenir la discussion jusqu’au bout',
    description:
      'Ce cours aide à préparer et conduire une discussion salariale avec plus de clarté. Vous apprenez à ancrer votre demande, justifier votre valeur et gérer les contre-arguments avec sérénité.',
    level: 'Intermédiaire',
    duration: '19 min',
    category: 'Negociation salariale',
    targetAudience: 'Salaries, managers, profils en mobilite interne ou externe',
    prerequisites: [
      'Avoir une evolution, une offre ou un entretien a venir',
      'Vouloir argumenter avec plus d’assurance',
    ],
    outcomes: [
      'Formuler une demande credibile et documentee',
      'Negocier au-dela du fixe quand c’est pertinent',
      'Conclure avec une prochaine etape claire',
    ],
    bookingNotes:
      'A utiliser avant un entretien annuel, une prise de poste ou une discussion de package.',
    order: 6,
  }, 5),
  withSeedMedia({
    id: 'seed-negociation-achat-fournisseurs',
    title: 'Négocier avec des fournisseurs sans casser la relation',
    subtitle: 'Prix, volume, delais et flexibilite contractuelle',
    description:
      'Le cours montre comment défendre vos contraintes économiques tout en préservant une relation durable. Vous travaillez la préparation, les concessions conditionnelles et la recherche de marges cachées.',
    level: 'Avancé',
    duration: '23 min',
    category: 'Achats et fournisseurs',
    targetAudience: 'Acheteurs, operations, responsables de comptes et dirigeants',
    prerequisites: [
      'Avoir deja conduit des discussions de prix ou de conditions',
      'Vouloir mieux gerer l’equilibre fermete-relation',
    ],
    outcomes: [
      'Construire des concessions liees a une contrepartie',
      'Negocier plus finement les delais et niveaux de service',
      'Eviter les accords rapides mais fragiles',
    ],
    bookingNotes:
      'Concu pour les relations fournisseurs recurrentes ou les renegociations sensibles.',
    order: 7,
  }, 6),
  withSeedMedia({
    id: 'seed-negociation-fermeture-accord',
    title: 'Faire aboutir un accord sans forcer',
    subtitle: 'Verifier l’adhesion, verrouiller les points et conclure proprement',
    description:
      'Beaucoup de négociations échouent au moment de conclure. Ce module vous aide à résumer les points d’accord, sécuriser l’engagement de l’autre partie et éviter les retours en arrière de dernière minute.',
    level: 'Intermédiaire',
    duration: '15 min',
    category: 'Closing et conclusion',
    targetAudience: 'Commerciaux, managers, freelances et porteurs de projet',
    prerequisites: [
      'Avoir deja des discussions qui avancent puis bloquent a la fin',
      'Vouloir mieux conclure sans pression inutile',
    ],
    outcomes: [
      'Repérer les signaux d’adhesion ou de flou',
      'Conclure avec des engagements concrets et dates claires',
      'Reduire les risques de desalignement apres accord',
    ],
    bookingNotes:
      'A suivre apres les modules sur objections et preparation pour renforcer votre taux de conversion.',
    order: 8,
  }, 7),
  withSeedMedia({
    id: 'seed-negociation-reunions-difficiles',
    title: 'Conduire des réunions difficiles avec méthode',
    subtitle: 'Desaccords internes, arbitrages et decisions sous tension',
    description:
      'Le cours vous donne une structure de dialogue utile pour les réunions sensibles. Vous apprenez à recadrer le débat, distribuer la parole et transformer un affrontement diffus en échange productif.',
    level: 'Intermédiaire',
    duration: '17 min',
    category: 'Management et influence',
    targetAudience: 'Managers, RH, chefs de projet et responsables transverses',
    prerequisites: [
      'Animer ou subir des reunions avec tensions',
      'Vouloir mieux tenir le cadre collectif',
    ],
    outcomes: [
      'Poser un cadre de discussion plus securisant',
      'Faire exprimer les interets reels plutot que les positions',
      'Sortir avec une decision ou une prochaine etape nette',
    ],
    bookingNotes:
      'Utile pour les arbitrages inter-equipes, retroactions complexes et comites de decision.',
    order: 9,
  }, 8),
  withSeedMedia({
    id: 'seed-negociation-distance-visio',
    title: 'Négocier à distance en visio ou par téléphone',
    subtitle: 'Clarte, presence et rythme quand le non-verbal est limite',
    description:
      'Les négociations à distance exigent plus de structure et de précision. Ce cours vous aide à garder la maîtrise du rythme, à compenser la perte de signaux faibles et à sécuriser les points importants.',
    level: 'Débutant',
    duration: '13 min',
    category: 'Negociation a distance',
    targetAudience: 'Equipes commerciales, managers, consultants et recruteurs',
    prerequisites: [
      'Participer a des negociations en visio ou telephone',
      'Vouloir gagner en impact sans presence physique',
    ],
    outcomes: [
      'Mieux preparer les sequences de discussion a distance',
      'Rendre vos reformulations plus nettes et plus utiles',
      'Conclure avec un recapitulatif qui evite les malentendus',
    ],
    bookingNotes:
      'Un module pratique pour les environnements hybrides et les discussions multi-sites.',
    order: 10,
  }, 9),
  withSeedMedia({
    id: 'seed-negociation-interculturelle',
    title: 'Négocier avec des interlocuteurs de cultures différentes',
    subtitle: 'Adapter le style, le rythme et les signes de confiance',
    description:
      'Ce module explore les écarts de perception qui compliquent les négociations interculturelles. Vous apprenez à ajuster votre communication, votre cadence et vos attentes sans caricaturer votre interlocuteur.',
    level: 'Avancé',
    duration: '22 min',
    category: 'Negociation interculturelle',
    targetAudience: 'Profils internationaux, export, achats, recrutement et partenariats',
    prerequisites: [
      'Echanger avec des interlocuteurs de contextes culturels varies',
      'Vouloir mieux lire les codes implicites',
    ],
    outcomes: [
      'Identifier les zones de malentendu les plus frequentes',
      'Adapter votre niveau de directivite et de formalisme',
      'Construire une confiance plus rapide malgre la distance culturelle',
    ],
    bookingNotes:
      'Tres utile pour les discussions internationales, partenariats et recrutements multi-pays.',
    order: 11,
  }, 10),
  withSeedMedia({
    id: 'seed-negociation-partenariats-b2b',
    title: 'Négocier un partenariat B2B durable',
    subtitle: 'Valeur partagee, gouvernance et engagement reciproque',
    description:
      'Le cours va au-delà de la simple transaction et montre comment construire un partenariat équilibré. Vous travaillez les attentes mutuelles, les garde-fous et la manière de faire grandir l’accord dans le temps.',
    level: 'Avancé',
    duration: '20 min',
    category: 'Partenariats et alliances',
    targetAudience: 'Business developers, dirigeants, responsables partenariat et account managers',
    prerequisites: [
      'Avoir a structurer un partenariat ou une collaboration recurrente',
      'Vouloir negocier des regles saines des le depart',
    ],
    outcomes: [
      'Clarifier roles, valeur et contreparties des deux cotes',
      'Anticiper les zones de friction futures',
      'Formaliser un accord plus stable et evolutif',
    ],
    bookingNotes:
      'Pertinent pour les accords commerciaux, de distribution, de co-construction ou de referral.',
    order: 12,
  }, 11),
  withSeedMedia({
    id: 'seed-negociation-prix-valeur',
    title: 'Défendre son prix par la valeur',
    subtitle: 'Sortir du rabais automatique et mieux argumenter votre proposition',
    description:
      'Ce module vous entraîne à parler prix sans gêne et sans vous affaiblir. Vous apprenez à relier votre tarification aux résultats, aux risques couverts et au coût de l’inaction pour l’autre partie.',
    level: 'Débutant',
    duration: '16 min',
    category: 'Prix et valeur',
    targetAudience: 'Freelances, consultants, agences, commerciaux et entrepreneurs',
    prerequisites: [
      'Vouloir moins subir la pression sur les tarifs',
      'Avoir besoin de mieux justifier une offre',
    ],
    outcomes: [
      'Presenter un prix avec plus de fermete et de coherence',
      'Recentrer la discussion sur les enjeux reels',
      'Eviter les remises reflexes qui degradent votre position',
    ],
    bookingNotes:
      'Un module cle pour les propositions commerciales, missions de conseil et ventes a forte valeur.',
    order: 13,
  }, 12),
]

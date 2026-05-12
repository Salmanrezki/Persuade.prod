const buildSeedMasterclass = ({
  id,
  title,
  subtitle,
  description,
  level,
  format,
  scheduleAt,
  registrationDeadline,
  duration,
  capacity,
  location,
  city,
  address,
  price,
  tags,
  targetAudience,
  prerequisites,
  agenda,
  takeaways,
  coverImage,
  meetingLink,
  replayAvailable,
  certificateAvailable,
  supportIncluded,
  speakerBio,
  featured,
  coachId,
  coachName,
  order,
}) => ({
  id,
  title,
  subtitle,
  description,
  level,
  format,
  language: 'Français',
  scheduleAt,
  registrationDeadline,
  duration,
  capacity,
  location,
  city,
  address,
  price,
  tags,
  targetAudience,
  prerequisites,
  agenda,
  takeaways,
  coverImage,
  meetingLink,
  replayAvailable,
  certificateAvailable,
  supportIncluded,
  speakerBio,
  featured,
  status: 'scheduled',
  coachId,
  coachName,
  order,
  createdAt: `2026-05-${String(order).padStart(2, '0')}T09:00:00.000Z`,
})

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const wrapTitleLines = (value, maxLength = 24) => {
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

const buildSeedCover = ({ title, coachName, accent, accentSoft }) => {
  const safeTitleLines = wrapTitleLines(title)
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 60}">${escapeXml(line)}</tspan>`
    )
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="${accentSoft}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" fill="url(#bg)" />
      <circle cx="1040" cy="130" r="150" fill="rgba(255,255,255,0.10)" />
      <circle cx="220" cy="620" r="190" fill="rgba(255,255,255,0.08)" />
      <rect x="72" y="76" width="182" height="42" rx="21" fill="rgba(255,255,255,0.18)" />
      <text x="101" y="103" fill="#f8fbfb" font-size="21" font-family="Arial, sans-serif">Masterclass</text>
      <text x="72" y="228" fill="#ffffff" font-size="54" font-weight="700" font-family="Arial, sans-serif">${safeTitleLines}</text>
      <text x="72" y="476" fill="rgba(255,255,255,0.92)" font-size="28" font-family="Arial, sans-serif">${escapeXml(
        coachName
      )}</text>
      <text x="72" y="614" fill="rgba(255,255,255,0.80)" font-size="24" font-family="Arial, sans-serif">Persuade • Negotiation</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const coverPalette = [
  ['#143f6b', '#2c74b3'],
  ['#0f4f50', '#2f8f83'],
  ['#7c2d12', '#ea580c'],
  ['#5b2a86', '#a855f7'],
  ['#134e4a', '#14b8a6'],
  ['#7f1d1d', '#ef4444'],
  ['#3f3f46', '#71717a'],
  ['#854d0e', '#facc15'],
]

const coachRoster = [
  {
    coachId: 'seed-coach-claire-dubois',
    coachName: 'Claire Dubois',
    speakerBio:
      'Claire Dubois accompagne depuis 12 ans des equipes commerciales et des managers sur les negociations complexes et la posture de conviction.',
  },
  {
    coachId: 'seed-coach-thomas-leroy',
    coachName: 'Thomas Leroy',
    speakerBio:
      'Thomas Leroy intervient sur les strategies d influence, la preparation de discussions sensibles et la defense de la valeur en B2B.',
  },
  {
    coachId: 'seed-coach-sarah-bensaid',
    coachName: 'Sarah Bensaid',
    speakerBio:
      'Sarah Bensaid forme des responsables RH, acheteurs et dirigeants a conduire des echanges fermes sans detruire la relation.',
  },
  {
    coachId: 'seed-coach-nicolas-martin',
    coachName: 'Nicolas Martin',
    speakerBio:
      'Nicolas Martin a pilote des negociations grands comptes et anime des masterclass sur la conclusion, les objections et les accords durables.',
  },
]

const withSeedMedia = (masterclass, index) => {
  const coach = coachRoster[index % coachRoster.length]
  const [accent, accentSoft] = coverPalette[index % coverPalette.length]

  return buildSeedMasterclass({
    ...masterclass,
    coachId: masterclass.coachId || coach.coachId,
    coachName: masterclass.coachName || coach.coachName,
    speakerBio: masterclass.speakerBio || coach.speakerBio,
    coverImage:
      masterclass.coverImage ||
      buildSeedCover({
        title: masterclass.title,
        coachName: masterclass.coachName || coach.coachName,
        accent,
        accentSoft,
      }),
  })
}

export const masterclassSeedData = [
  withSeedMedia(
    {
      id: 'seed-masterclass-negociation-salaire-juin',
      title: 'Negocier son salaire sans s affaiblir',
      subtitle: 'Une methode concrete pour preparer et tenir un entretien de remuneration',
      description:
        'Cette masterclass vous aide a preparer une discussion salariale, argumenter votre valeur et repondre aux objections sans perdre votre cap.',
      level: 'Intermédiaire',
      format: 'online',
      scheduleAt: '2026-06-18T18:30:00.000Z',
      registrationDeadline: '2026-06-16T21:00:00.000Z',
      duration: '90 min',
      capacity: 80,
      location: 'En ligne',
      city: 'Paris',
      address: '',
      price: 'Gratuit',
      tags: ['Salaire', 'Argumentation', 'Confiance'],
      targetAudience: 'Salariés, managers et profils en mobilité',
      prerequisites: ['Avoir un entretien salarial ou une evolution a venir'],
      agenda: [
        'Preparer sa fourchette et son point d ancrage',
        'Defendre sa valeur avec des preuves tangibles',
        'Conclure avec une prochaine etape claire',
      ],
      takeaways: [
        'Une trame de preparation reutilisable',
        'Des formulations plus credibles',
        'Une meilleure gestion des contre-arguments',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-1',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: true,
      featured: true,
      order: 1,
    },
    0
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-objections-b2b-juin',
      title: 'Traiter les objections en vente B2B',
      subtitle: 'Prix, timing et concurrence sans remise reflexe',
      description:
        'Une session orientee terrain pour apprendre a accueillir les objections, recadrer la discussion et revenir a la valeur plutot qu au rabais.',
      level: 'Débutant',
      format: 'online',
      scheduleAt: '2026-06-25T12:00:00.000Z',
      registrationDeadline: '2026-06-24T18:00:00.000Z',
      duration: '75 min',
      capacity: 120,
      location: 'En ligne',
      city: 'Lyon',
      address: '',
      price: 'Gratuit',
      tags: ['Vente B2B', 'Objections', 'Valeur'],
      targetAudience: 'Commerciaux, freelances et responsables de comptes',
      prerequisites: ['Etre confronte a des objections prix ou delai'],
      agenda: [
        'Reconnaître une objection reelle',
        'Reformuler sans se justifier',
        'Defendre son prix sans tension inutile',
      ],
      takeaways: [
        'Des reponses plus structurées',
        'Un cadre de qualification des objections',
        'Des formulations de closing plus nettes',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-2',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: true,
      featured: true,
      order: 2,
    },
    1
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-achats-juillet',
      title: 'Negocier avec des fournisseurs strategiques',
      subtitle: 'Prix, delais, services et contreparties sans casser la relation',
      description:
        'Cette masterclass couvre les leviers de preparation et les concessions conditionnelles pour renegocier plus finement avec des fournisseurs importants.',
      level: 'Avancé',
      format: 'hybrid',
      scheduleAt: '2026-07-02T17:00:00.000Z',
      registrationDeadline: '2026-06-30T18:00:00.000Z',
      duration: '105 min',
      capacity: 40,
      location: 'Hybride · Paris',
      city: 'Paris',
      address: 'Rue de Rivoli, Paris',
      price: '59 EUR',
      tags: ['Achats', 'Fournisseurs', 'Concessions'],
      targetAudience: 'Acheteurs, operations et responsables de comptes',
      prerequisites: ['Avoir deja participe a une renegociation fournisseur'],
      agenda: [
        'Preparer les marges de manoeuvre',
        'Structurer les concessions contre contreparties',
        'Verrouiller un accord durable',
      ],
      takeaways: [
        'Une methode de renegociation plus robuste',
        'Des reflexes pour proteger la relation',
        'Un modele de concessions utiles',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-3',
      replayAvailable: false,
      certificateAvailable: true,
      supportIncluded: true,
      featured: false,
      order: 3,
    },
    2
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-conclusion-juillet',
      title: 'Conclure un accord avec plus d impact',
      subtitle: 'Mieux verifier l adhesion et eviter les retours en arriere',
      description:
        'La session se concentre sur la derniere phase de la negociation: reformuler, tester l accord, confirmer les engagements et proteger l execution.',
      level: 'Intermédiaire',
      format: 'online',
      scheduleAt: '2026-07-09T18:00:00.000Z',
      registrationDeadline: '2026-07-07T20:00:00.000Z',
      duration: '80 min',
      capacity: 90,
      location: 'En ligne',
      city: 'Bordeaux',
      address: '',
      price: 'Gratuit',
      tags: ['Closing', 'Accord', 'Execution'],
      targetAudience: 'Commerciaux, managers et independants',
      prerequisites: ['Mener des discussions qui avancent mais se referment mal'],
      agenda: [
        'Verifier les signaux d adhesion',
        'Tester les points de friction restants',
        'Conclure avec un recapitulatif securisant',
      ],
      takeaways: [
        'Des formulations de conclusion plus propres',
        'Une check-list d accord exploitable',
        'Moins de flottement apres validation orale',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-4',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: true,
      featured: true,
      order: 4,
    },
    3
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-reunions-juillet',
      title: 'Desamorcer les reunions sous tension',
      subtitle: 'Recadrer un desaccord et retrouver un terrain de discussion utile',
      description:
        'Un format pratique pour les managers et chefs de projet qui doivent faire avancer des discussions sensibles sans alimenter le rapport de force.',
      level: 'Intermédiaire',
      format: 'online',
      scheduleAt: '2026-07-16T12:30:00.000Z',
      registrationDeadline: '2026-07-15T18:00:00.000Z',
      duration: '70 min',
      capacity: 70,
      location: 'En ligne',
      city: 'Lille',
      address: '',
      price: 'Gratuit',
      tags: ['Management', 'Conflit', 'Reunions'],
      targetAudience: 'Managers, RH, leads et responsables transverses',
      prerequisites: ['Animer des reunions avec des points de friction'],
      agenda: [
        'Nommer la tension sans l aggraver',
        'Faire exprimer les interets plutot que les positions',
        'Sortir avec une prochaine etape exploitable',
      ],
      takeaways: [
        'Une structure de reunions sensibles',
        'Des techniques de recadrage simples',
        'Moins d escalade emotionnelle',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-5',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: true,
      featured: false,
      order: 5,
    },
    4
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-visio-juillet',
      title: 'Negocier a distance en visio',
      subtitle: 'Rythme, clarte et impact quand le non-verbal est limite',
      description:
        'Cette masterclass traite les enjeux specifiques des discussions a distance: cadrage, reformulation, synthese et protection contre les malentendus.',
      level: 'Débutant',
      format: 'online',
      scheduleAt: '2026-07-23T18:30:00.000Z',
      registrationDeadline: '2026-07-22T18:00:00.000Z',
      duration: '60 min',
      capacity: 100,
      location: 'En ligne',
      city: 'Toulouse',
      address: '',
      price: 'Gratuit',
      tags: ['Visio', 'Distance', 'Communication'],
      targetAudience: 'Equipes hybrides, consultants et commerciaux',
      prerequisites: ['Conduire des discussions en visio ou au telephone'],
      agenda: [
        'Structurer le debut de reunion',
        'Ralentir pour mieux reformuler',
        'Conclure avec un recapitulatif clair',
      ],
      takeaways: [
        'Un cadre simple pour la visio',
        'Plus de clarte sur les points d accord',
        'Des routines utiles pour les equipes a distance',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-6',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: false,
      featured: false,
      order: 6,
    },
    5
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-partenariats-aout',
      title: 'Construire un partenariat B2B durable',
      subtitle: 'Definir la valeur partagee et les garde-fous des le depart',
      description:
        'Une masterclass orientee accords de cooperation, distribution ou referral pour negocier la gouvernance, les roles et les contreparties avec plus de clarte.',
      level: 'Avancé',
      format: 'hybrid',
      scheduleAt: '2026-08-06T17:30:00.000Z',
      registrationDeadline: '2026-08-04T18:00:00.000Z',
      duration: '100 min',
      capacity: 45,
      location: 'Hybride · Marseille',
      city: 'Marseille',
      address: 'La Canebiere, Marseille',
      price: '79 EUR',
      tags: ['Partenariat', 'B2B', 'Accord'],
      targetAudience: 'Business developers, dirigeants et account managers',
      prerequisites: ['Avoir un partenariat ou une alliance a structurer'],
      agenda: [
        'Clarifier la valeur et les attentes',
        'Negocier les roles et zones de responsabilite',
        'Poser les garde-fous contractuels utiles',
      ],
      takeaways: [
        'Une trame de discussion partenariat',
        'Des points de vigilance de gouvernance',
        'Une meilleure solidite d accord',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-7',
      replayAvailable: false,
      certificateAvailable: true,
      supportIncluded: true,
      featured: true,
      order: 7,
    },
    6
  ),
  withSeedMedia(
    {
      id: 'seed-masterclass-influence-aout',
      title: 'Influencer sans manipuler',
      subtitle: 'Questions, reformulation et cadrage pour faire avancer une decision',
      description:
        'La session montre comment augmenter votre impact dans une negociation sans tomber dans des techniques artificielles ou agressives.',
      level: 'Débutant',
      format: 'online',
      scheduleAt: '2026-08-20T18:00:00.000Z',
      registrationDeadline: '2026-08-18T20:00:00.000Z',
      duration: '75 min',
      capacity: 110,
      location: 'En ligne',
      city: 'Nantes',
      address: '',
      price: 'Gratuit',
      tags: ['Influence', 'Questions', 'Posture'],
      targetAudience: 'Professionnels, independants, managers et recruteurs',
      prerequisites: ['Vouloir gagner en impact dans ses echanges'],
      agenda: [
        'Poser un cadre d influence sain',
        'Faire avancer la reflexion par les questions',
        'Conclure sans forcer la decision',
      ],
      takeaways: [
        'Des techniques de questionnement utiles',
        'Une posture plus calme et plus nette',
        'Moins de pression inutile dans la discussion',
      ],
      meetingLink: 'https://meet.google.com/seed-masterclass-8',
      replayAvailable: true,
      certificateAvailable: false,
      supportIncluded: true,
      featured: false,
      order: 8,
    },
    7
  ),
]

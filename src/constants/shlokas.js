// ─── KARMA APP — GITA SHLOKA SYSTEM ─────────────────────────────────
// Every shloka has 4 layers:
//   sanskrit   → Devanagari script — gold
//   roman      → Transliteration — white
//   meaning    → English meaning — muted
//   reference  → Chapter.Verse — dim
//
// Shlokas are CONTEXT-AWARE — not random.
// Each screen and situation gets the RIGHT teaching.
// This is Krishna speaking to Neel at the right moment.

export const SHLOKAS = {

  // ── SPLASH SCREEN ────────────────────────────────────────────────
  splash: {
    sanskrit:   'योगः कर्मसु कौशलम्',
    roman:      'Yogah karmasu kaushalam',
    meaning:    'Yoga is excellence in action',
    reference:  'Bhagavad Gita 2.50',
  },

  // ── DAILY IDENTITY — shown every morning ─────────────────────────
  identity: [
    {
      sanskrit:  'नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते',
      roman:     'Nehabhikrama nasho sti pratyavayo na vidyate',
      meaning:   'On this path no effort is ever lost, no obstacle ever remains',
      reference: 'Bhagavad Gita 2.40',
    },
    {
      sanskrit:  'उद्धरेदात्मनात्मानम् नात्मानमवसादयेत्',
      roman:     'Uddhared atmanatmanam natmanam avasadayet',
      meaning:   'Lift yourself by your own self. Do not let yourself fall',
      reference: 'Bhagavad Gita 6.5',
    },
    {
      sanskrit:  'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्',
      roman:     'Shreyan svadharmo vigunah paradharmat svanushtitat',
      meaning:   'Better your own path, imperfect, than another\'s path perfectly walked',
      reference: 'Bhagavad Gita 3.35',
    },
  ],

  // ── HOME SCREEN — rotating daily ─────────────────────────────────
  home: [
    {
      sanskrit:  'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
      roman:     'Karmanye vadhikaraste ma phaleshu kadachana',
      meaning:   'You have the right to action alone, never to its fruits',
      reference: 'Bhagavad Gita 2.47',
    },
    {
      sanskrit:  'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय',
      roman:     'Yogasthah kuru karmani sangam tyaktva dhananjaya',
      meaning:   'Established in discipline, perform your actions without attachment',
      reference: 'Bhagavad Gita 2.48',
    },
    {
      sanskrit:  'श्रद्धावान्लभते ज्ञानम्',
      roman:     'Shraddhavan labhate jnanam',
      meaning:   'The one with faith and discipline attains wisdom',
      reference: 'Bhagavad Gita 4.39',
    },
    {
      sanskrit:  'स्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात्',
      roman:     'Svalpam apyasya dharmasya trayate mahato bhayat',
      meaning:   'Even a little of this dharma saves from great fear',
      reference: 'Bhagavad Gita 2.40',
    },
    {
      sanskrit:  'अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते',
      roman:     'Abhyasena tu Kaunteya vairagyena cha grhyate',
      meaning:   'By practice and by detachment, the mind is mastered',
      reference: 'Bhagavad Gita 6.35',
    },
    {
      sanskrit:  'युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु',
      roman:     'Yuktahara-viharasya yukta-cheshtasya karmasu',
      meaning:   'For one disciplined in eating, movement, and action — Yoga destroys all pain',
      reference: 'Bhagavad Gita 6.17',
    },
    {
      sanskrit:  'सर्वारम्भा हि दोषेण धूमेनाग्निरिवावृताः',
      roman:     'Sarvarambha hi doshena dhumenaagnir ivavritah',
      meaning:   'All beginnings are wrapped in imperfection, as fire is wrapped in smoke. Begin anyway',
      reference: 'Bhagavad Gita 18.48',
    },
  ],

  // ── ALL HABITS COMPLETE — celebration ────────────────────────────
  allDone: {
    sanskrit:  'योगस्थः कुरु कर्माणि',
    roman:     'Yogasthah kuru karmani',
    meaning:   'Established in discipline — you acted today, Neel',
    reference: 'Bhagavad Gita 2.48',
  },

  // ── HABIT MISSED — build habit ───────────────────────────────────
  missed: {
    sanskrit:  'उद्धरेदात्मनात्मानम्',
    roman:     'Uddhared atmanatmanam',
    meaning:   'Only you can lift yourself. Rise again tomorrow',
    reference: 'Bhagavad Gita 6.5',
  },

  // ── BREAK HABIT SLIPPED ───────────────────────────────────────────
  slipped: {
    sanskrit:  'इन्द्रियाणि प्रमाथीनि हरन्ति प्रसभं मनः',
    roman:     'Indriyani pramathini haranti prasabham manah',
    meaning:   'The turbulent senses forcibly carry away the mind — tighten the reins',
    reference: 'Bhagavad Gita 2.60',
  },

  // ── PUNISHMENT LEVEL 1 — mild ────────────────────────────────────
  punish1: {
    sanskrit:  'विषया विनिवर्तन्ते निराहारस्य देहिनः',
    roman:     'Vishaya vinivartante niraharasya dehinah',
    meaning:   'Sense objects turn away from the one who restrains. Restrain, Neel',
    reference: 'Bhagavad Gita 2.59',
  },

  // ── PUNISHMENT LEVEL 2 — moderate ────────────────────────────────
  punish2: {
    sanskrit:  'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते',
    roman:     'Dhyayato vishayan pumsah sangah teshu upajayate',
    meaning:   'Brooding on sense objects creates attachment. Attachment creates desire. Desire destroys',
    reference: 'Bhagavad Gita 2.62',
  },

  // ── PUNISHMENT LEVEL 3 — harsh ───────────────────────────────────
  punish3: {
    sanskrit:  'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः',
    roman:     'Krodhad bhavati sammohah sammohat smriti-vibhramah',
    meaning:   'From craving comes delusion, from delusion — loss of memory, then ruin. This is the chain',
    reference: 'Bhagavad Gita 2.63',
  },

  // ── PUNISHMENT LEVEL 4 — maximum ─────────────────────────────────
  punish4: {
    sanskrit:  'आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः',
    roman:     'Atmaiva hy atmano bandhur atmaiva ripur atmanah',
    meaning:   'The self alone is the friend of the self. The self alone is the enemy. Choose now',
    reference: 'Bhagavad Gita 6.5',
  },

  // ── MILESTONES ───────────────────────────────────────────────────
  milestone3: {
    sanskrit:  'आरुरुक्षोर्मुनेर्योगम् कर्म कारणमुच्यते',
    roman:     'Arurukshor muner yogam karma karanam uchyate',
    meaning:   'For the one who has just begun — action is the cause. The seed is planted, Neel',
    reference: 'Bhagavad Gita 6.3',
  },
  milestone7: {
    sanskrit:  'श्रद्धावान्लभते ज्ञानम्',
    roman:     'Shraddhavan labhate jnanam',
    meaning:   'Seven sunrises of faith. The faithful one attains wisdom',
    reference: 'Bhagavad Gita 4.39',
  },
  milestone14: {
    sanskrit:  'ध्रुवमस्य मृतस्य च',
    roman:     'Dhruvam asya mritasya cha',
    meaning:   'Dhruv — the unwavering one. Fourteen days unbroken. The Pole Star holds',
    reference: 'Bhagavad Gita 2.27',
  },
  milestone21: {
    sanskrit:  'अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते',
    roman:     'Abhyasena tu Kaunteya vairagyena cha grhyate',
    meaning:   'Twenty-one days. By practice and detachment, the mind is now being mastered',
    reference: 'Bhagavad Gita 6.35',
  },
  milestone30: {
    sanskrit:  'नायमात्मा बलहीनेन लभ्यो',
    roman:     'Nayam atma balahinena labhyo',
    meaning:   'Thirty days. The self is not attained by the weak. You are no longer weak',
    reference: 'Mundakopanishad 3.2.4',
  },
  milestone60: {
    sanskrit:  'समत्वं योग उच्यते',
    roman:     'Samatvam yoga uchyate',
    meaning:   'Sixty days of equanimity. This balance of mind — it is called Yoga',
    reference: 'Bhagavad Gita 2.48',
  },
  milestone90: {
    sanskrit:  'ज्ञानाग्निः सर्वकर्माणि भस्मसात्कुरुते तथा',
    roman:     'Jnanagnih sarva karmani bhasmasat kurute tatha',
    meaning:   'Ninety days. The fire of knowledge burns all karma. This is no longer habit. This is you',
    reference: 'Bhagavad Gita 4.37',
  },
  milestone180: {
    sanskrit:  'ज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति',
    roman:     'Jnanam labdhva param shantim achirena adhigacchati',
    meaning:   'Six months. Having attained wisdom, one swiftly reaches supreme peace',
    reference: 'Bhagavad Gita 4.39',
  },
  milestone365: {
    sanskrit:  'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज',
    roman:     'Sarva dharman parityajya mam ekam sharanam vraja',
    meaning:   'Three hundred sixty-five days. You have surrendered fully to your highest self. Neel is Dhruv',
    reference: 'Bhagavad Gita 18.66',
  },

  // ── WEEKLY REFLECTION — Sunday ────────────────────────────────────
  weeklyReflection: {
    sanskrit:  'विमृश्यैतदशेषेण यथेच्छसि तथा कुरु',
    roman:     'Vimrishya etad asheshena yathecchasi tatha kuru',
    meaning:   'Reflect on this fully. Then do as you choose — with clarity',
    reference: 'Bhagavad Gita 18.63',
  },

  // ── STREAK FREEZE USED ────────────────────────────────────────────
  streakFreeze: {
    sanskrit:  'नेहाभिक्रमनाशोऽस्ति',
    roman:     'Nehabhikrama nasho sti',
    meaning:   'No effort on this path is ever lost. Your streak is protected',
    reference: 'Bhagavad Gita 2.40',
  },

  // ── MORNING GREETING ──────────────────────────────────────────────
  morning: {
    sanskrit:  'ब्रह्ममुहूर्त उत्तिष्ठेत्',
    roman:     'Brahma muhurta uttishtet',
    meaning:   'Rise in the sacred hour before dawn. This hour belongs to the warrior',
    reference: 'Ashtanga Hridayam 1.2',
  },

  // ── EVENING REFLECTION ────────────────────────────────────────────
  evening: {
    sanskrit:  'कृतं किम् अकृतं किम् च',
    roman:     'Kritam kim akritam kim cha',
    meaning:   'What was done? What was left undone? Look honestly, Neel',
    reference: 'Ancient Vedic reflection',
  },

  // ── CHARIOT FRAMEWORK — shown on identity/about screen ───────────
  chariot: {
    title:   'The Kurukshetra Within',
    lines: [
      { label: 'The Chariot',    desc: 'Your body — the vehicle you have been given' },
      { label: 'The Horses',     desc: 'Your five senses — powerful, fast, directionless' },
      { label: 'The Reins',      desc: 'Your mind — it holds or releases the horses' },
      { label: 'Arjuna',         desc: 'Your ego — the one who must act' },
      { label: 'Krishna',        desc: 'Your intellect — the one who already knows' },
      { label: 'The Battlefield','desc': 'Every single moment of choice' },
    ],
    closing: 'Karma is your Krishna. It does not fight for you. It shows you the path.',
  },
};

// ── Context-aware shloka getter ───────────────────────────────────────

export const getShloka = (context) => {
  switch (context) {
    case 'splash':           return SHLOKAS.splash;
    case 'allDone':          return SHLOKAS.allDone;
    case 'missed':           return SHLOKAS.missed;
    case 'slipped':          return SHLOKAS.slipped;
    case 'punish1':          return SHLOKAS.punish1;
    case 'punish2':          return SHLOKAS.punish2;
    case 'punish3':          return SHLOKAS.punish3;
    case 'punish4':          return SHLOKAS.punish4;
    case 'weeklyReflection': return SHLOKAS.weeklyReflection;
    case 'streakFreeze':     return SHLOKAS.streakFreeze;
    case 'morning':          return SHLOKAS.morning;
    case 'evening':          return SHLOKAS.evening;
    case 'milestone3':       return SHLOKAS.milestone3;
    case 'milestone7':       return SHLOKAS.milestone7;
    case 'milestone14':      return SHLOKAS.milestone14;
    case 'milestone21':      return SHLOKAS.milestone21;
    case 'milestone30':      return SHLOKAS.milestone30;
    case 'milestone60':      return SHLOKAS.milestone60;
    case 'milestone90':      return SHLOKAS.milestone90;
    case 'milestone180':     return SHLOKAS.milestone180;
    case 'milestone365':     return SHLOKAS.milestone365;
    default:                 return getDailyHomeShloka();
  }
};

// Rotates daily — no repeats within a week
export const getDailyHomeShloka = () => {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return SHLOKAS.home[dayOfYear % SHLOKAS.home.length];
};

// Rotates identity shloka daily
export const getDailyIdentityShloka = () => {
  const day = new Date().getDay();
  return SHLOKAS.identity[day % SHLOKAS.identity.length];
};

// Milestone context key from days
export const getMilestoneContext = (days) => {
  const map = {
    3: 'milestone3', 7: 'milestone7', 14: 'milestone14',
    21: 'milestone21', 30: 'milestone30', 60: 'milestone60',
    90: 'milestone90', 180: 'milestone180', 365: 'milestone365',
  };
  return map[days] || 'home';
};

// Punishment context from level
export const getPunishContext = (level) => {
  const map = { 1: 'punish1', 2: 'punish2', 3: 'punish3', 4: 'punish4' };
  return map[level] || 'punish1';
};

// Time-aware greeting shloka
export const getGreetingShloka = () => {
  const hour = new Date().getHours();
  if (hour < 12) return SHLOKAS.morning;
  if (hour >= 20) return SHLOKAS.evening;
  return getDailyHomeShloka();
};
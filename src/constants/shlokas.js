// ─── KARMA APP — GITA SHLOKA SYSTEM ─────────────────────────────────
// Every shloka has 4 layers:
//   sanskrit   → Devanagari script — gold
//   roman      → Transliteration — white
//   meaning    → English meaning — muted
//   reference  → Chapter.Verse — dim
//
// Shlokas are CONTEXT-AWARE — not random.
// Each screen and situation gets the RIGHT teaching.
// This is Krishna speaking to Gagan at the right moment.

export const SHLOKAS = {

  // ── SPLASH SCREEN ────────────────────────────────────────────────
  splash: {
    sanskrit:   'योगः कर्मसु कौशलम्',
    roman:      'Yogah karmasu kaushalam',
    meaning:    'Yoga is excellence in action',
    reference:  'Bhagavad Gita 2.50',
  },

  // ── DAILY IDENTITY — shown every morning (7 = one per weekday) ───
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
    {
      sanskrit:  'प्रजहाति यदा कामान्सर्वान्पार्थ मनोगतान्',
      roman:     'Prajahati yada kaman sarvan partha mano-gatan',
      meaning:   'When all desires of the mind are completely abandoned, content in the Self alone — that is the direction of this day',
      reference: 'Bhagavad Gita 2.55',
    },
    {
      sanskrit:  'धृत्या यया धारयते मनःप्राणेन्द्रियक्रियाः',
      roman:     'Dhrtya yaya dharayate manah-pranendriya-kriyah',
      meaning:   'The resolve that holds the mind, the breath, and the senses in steady check — carry that resolve today',
      reference: 'Bhagavad Gita 18.33',
    },
    {
      sanskrit:  'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते',
      roman:     'Na hi jnanena sadrsam pavitram iha vidyate',
      meaning:   'In this world there is no purifier equal to self-knowledge. In time, the practitioner finds it within',
      reference: 'Bhagavad Gita 4.38',
    },
    {
      sanskrit:  'आत्मौपम्येन सर्वत्र समं पश्यति योऽर्जुन',
      roman:     'Atmaupamyena sarvatra samam pasyati yo rjuna',
      meaning:   'Who sees with equality everywhere — in pleasure and in pain — that yogi is considered supreme',
      reference: 'Bhagavad Gita 6.32',
    },
  ],

  // ── HOME SCREEN — rotating daily (21 = 3 weeks no repeat) ────────
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
    {
      sanskrit:  'तस्मादसक्तः सततं कार्यं कर्म समाचर',
      roman:     'Tasmad asaktah satatam karyam karma samachara',
      meaning:   'Without attachment, always perform the action that must be done',
      reference: 'Bhagavad Gita 3.19',
    },
    {
      sanskrit:  'नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः',
      roman:     'Niyatam kuru karma tvam karma jyayo hy akarmanah',
      meaning:   'Perform your prescribed duty. Action is greater than inaction',
      reference: 'Bhagavad Gita 3.8',
    },
    {
      sanskrit:  'बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते',
      roman:     'Buddhi-yukto jahatiha ubhe sukrita-duskrite',
      meaning:   'The wise man casts off both good and bad in this life. Yoga is the art of all work',
      reference: 'Bhagavad Gita 2.50',
    },
    {
      sanskrit:  'जितात्मनः प्रशान्तस्य परमात्मा समाहितः',
      roman:     'Jitatmanah prasantasya paramatma samahitah',
      meaning:   'For one who has conquered the mind — serene in heat and cold, honour and dishonour — the goal is already near',
      reference: 'Bhagavad Gita 6.7',
    },
    {
      sanskrit:  'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः',
      roman:     'Matra-sparsas tu kaunteya sitoshna-sukha-duhkha-dah',
      meaning:   'Cold, heat, pleasure, pain — they come and go. They are not permanent. Neither is difficulty. Endure them',
      reference: 'Bhagavad Gita 2.14',
    },
    {
      sanskrit:  'यतो यतो निश्चलति मनश्चञ्चलमस्थिरम्',
      roman:     'Yato yato nischalati manas chanchalam asthiram',
      meaning:   'Wherever the mind wanders, bring it back. Again and again. That is the whole practice',
      reference: 'Bhagavad Gita 6.26',
    },
    {
      sanskrit:  'स्वे स्वे कर्मण्यभिरतः संसिद्धिं लभते नरः',
      roman:     'Sve sve karmany abhiratah samsiddhim labhate narah',
      meaning:   'By devotion to one\'s own duty, every man attains perfection. Stay devoted',
      reference: 'Bhagavad Gita 18.45',
    },
    {
      sanskrit:  'कर्मण्यकर्म यः पश्येदकर्मणि च कर्म यः',
      roman:     'Karmany akarma yah pasyed akarmani cha karma yah',
      meaning:   'Who sees inaction in action and action in inaction — that man is wise among men',
      reference: 'Bhagavad Gita 4.18',
    },
    {
      sanskrit:  'योगयुक्तो विशुद्धात्मा विजितात्मा जितेन्द्रियः',
      roman:     'Yoga-yukto visuddhatma vijitma jitendriyah',
      meaning:   'One established in yoga, of pure soul, who has conquered the self and the senses — though acting, is never bound',
      reference: 'Bhagavad Gita 5.7',
    },
    {
      sanskrit:  'आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत्',
      roman:     'Apuryamanam acala-pratistham samudram apah pravisanti yadvat',
      meaning:   'As rivers flow into the ocean — full, unmoved, undisturbed — so all things enter the steady man. Be the ocean',
      reference: 'Bhagavad Gita 2.70',
    },
    {
      sanskrit:  'यदा हि नेन्द्रियार्थेषु न कर्मस्वनुषज्जते',
      roman:     'Yada hi nendriyarthesu na karmany anushajjate',
      meaning:   'When one has no attachment to sense objects or to actions — he is said to have risen to yoga',
      reference: 'Bhagavad Gita 6.4',
    },
    {
      sanskrit:  'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते',
      roman:     'Ananyaas chintayanto mam ye janah paryupasate',
      meaning:   'Those who practice with unwavering attention — I carry what they lack and preserve what they have',
      reference: 'Bhagavad Gita 9.22',
    },
    {
      sanskrit:  'अहङ्कारविमूढात्मा कर्ताहमिति मन्यते',
      roman:     'Ahankara-vimudhatma kartaham iti manyate',
      meaning:   'The ego-deluded soul thinks "I am the doer." The wise man acts — and lets it go',
      reference: 'Bhagavad Gita 3.27',
    },
    {
      sanskrit:  'श्रद्धामयोऽयं पुरुषो यो यच्छ्रद्धः स एव सः',
      roman:     'Sraddhāmayo yam purusho yo yac-chraddha sa eva sah',
      meaning:   'This person is made of their Shraddha — what they repeatedly honour. As your faith is, so you are',
      reference: 'Bhagavad Gita 17.3',
    },
  ],

  // ── ALL HABITS COMPLETE — celebration ────────────────────────────
  allDone: [
    {
      sanskrit:  'योगस्थः कुरु कर्माणि',
      roman:     'Yogasthah kuru karmani',
      meaning:   'Established in discipline — you acted today, Gagan',
      reference: 'Bhagavad Gita 2.48',
    },
    {
      sanskrit:  'स्वे स्वे कर्मण्यभिरतः संसिद्धिं लभते नरः',
      roman:     'Sve sve karmany abhiratah samsiddhim labhate narah',
      meaning:   'Devoted to his own duty, a man attains perfection. Today — perfection was attempted. That is enough',
      reference: 'Bhagavad Gita 18.45',
    },
    {
      sanskrit:  'तस्मादसक्तः सततं कार्यं कर्म समाचर',
      roman:     'Tasmad asaktah satatam karyam karma samachara',
      meaning:   'Without attachment, the action was performed. That is the highest discipline. That is today',
      reference: 'Bhagavad Gita 3.19',
    },
    {
      sanskrit:  'ज्ञानाग्निः सर्वकर्माणि भस्मसात्कुरुते तथा',
      roman:     'Jnanagnih sarva karmani bhasmasat kurute tatha',
      meaning:   'Every action done in awareness burns the weight of the past. Today was awareness. Well done',
      reference: 'Bhagavad Gita 4.37',
    },
    {
      sanskrit:  'यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्',
      roman:     'Yat karoshi yad asnasi yaj juhoshi dadasi yat',
      meaning:   'Whatever you do, whatever you offer — do it as an offering. Today\'s habits were an offering. They were enough',
      reference: 'Bhagavad Gita 9.27',
    },
  ],

  // ── HABIT MISSED — build habit ───────────────────────────────────
  missed: [
    {
      sanskrit:  'उद्धरेदात्मनात्मानम्',
      roman:     'Uddhared atmanatmanam',
      meaning:   'Only you can lift yourself. Rise again tomorrow',
      reference: 'Bhagavad Gita 6.5',
    },
    {
      sanskrit:  'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः',
      roman:     'Matra-sparsas tu kaunteya sitoshna-sukha-duhkha-dah',
      meaning:   'These things — cold, heat, pleasure, pain — come and go. This miss is temporary. What you build is not',
      reference: 'Bhagavad Gita 2.14',
    },
    {
      sanskrit:  'सहजं कर्म कौन्तेय सदोषमपि न त्यजेत्',
      roman:     'Sahajam karma kaunteya sa-dosham api na tyajet',
      meaning:   'Do not abandon your duty even if imperfect. All beginnings are flawed. Begin again',
      reference: 'Bhagavad Gita 18.48',
    },
    {
      sanskrit:  'अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते',
      roman:     'Abhyasena tu Kaunteya vairagyena cha grhyate',
      meaning:   'By practice and detachment, the mind is mastered. One miss does not erase the practice. Return',
      reference: 'Bhagavad Gita 6.35',
    },
  ],

  // ── BREAK HABIT SLIPPED ───────────────────────────────────────────
  slipped: [
    {
      sanskrit:  'इन्द्रियाणि प्रमाथीनि हरन्ति प्रसभं मनः',
      roman:     'Indriyani pramathini haranti prasabham manah',
      meaning:   'The turbulent senses forcibly carry away the mind — tighten the reins',
      reference: 'Bhagavad Gita 2.60',
    },
    {
      sanskrit:  'अथ केन प्रयुक्तोऽयं पापं चरति पूरुषः',
      roman:     'Atha kena prayukto yam papam charati purushah',
      meaning:   'By what is one driven to act against one\'s own will? By desire. Know the enemy. It is named',
      reference: 'Bhagavad Gita 3.36',
    },
    {
      sanskrit:  'एवं बुद्धेः परं बुद्ध्वा संस्तभ्यात्मानमात्मना',
      roman:     'Evam buddheh param buddhva samstabhyatmanam atmana',
      meaning:   'Knowing yourself to be beyond the mind and its urges — steady the lower self by the higher. You are not this slip',
      reference: 'Bhagavad Gita 3.43',
    },
  ],

  // ── PUNISHMENT LEVEL 1 — mild ────────────────────────────────────
  punish1: [
    {
      sanskrit:  'विषया विनिवर्तन्ते निराहारस्य देहिनः',
      roman:     'Vishaya vinivartante niraharasya dehinah',
      meaning:   'Sense objects turn away from the one who restrains. Restrain, Gagan',
      reference: 'Bhagavad Gita 2.59',
    },
    {
      sanskrit:  'यदा संहरते चायं कूर्मोऽङ्गानीव सर्वशः',
      roman:     'Yada samharate cayam kurmo nganiva sarvasah',
      meaning:   'As a tortoise draws its limbs within the shell — withdraw the senses from their objects. Wisdom then stands firm',
      reference: 'Bhagavad Gita 2.58',
    },
    {
      sanskrit:  'यतो यतो निश्चलति मनश्चञ्चलमस्थिरम्',
      roman:     'Yato yato nischalati manas chanchalam asthiram',
      meaning:   'Wherever the mind wanders, unsteady and restless — bring it back. The practice is the returning',
      reference: 'Bhagavad Gita 6.26',
    },
  ],

  // ── PUNISHMENT LEVEL 2 — moderate ────────────────────────────────
  punish2: [
    {
      sanskrit:  'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते',
      roman:     'Dhyayato vishayan pumsah sangah teshu upajayate',
      meaning:   'Brooding on sense objects creates attachment. Attachment creates desire. Desire destroys',
      reference: 'Bhagavad Gita 2.62',
    },
    {
      sanskrit:  'इन्द्रियस्येन्द्रियस्यार्थे रागद्वेषौ व्यवस्थितौ',
      roman:     'Indriyasyendriyasyarthe raga-dvesau vyavasthitau',
      meaning:   'Attachment and aversion are seated in the senses for their objects. Do not come under their sway — they are your enemies',
      reference: 'Bhagavad Gita 3.34',
    },
    {
      sanskrit:  'तानि सर्वाणि संयम्य युक्त आसीत मत्परः',
      roman:     'Tani sarvani samyamya yukta asita mat-parah',
      meaning:   'Restraining all the senses, sit firm, devoted to the Self. He whose senses are under control — his wisdom is steady',
      reference: 'Bhagavad Gita 2.61',
    },
  ],

  // ── PUNISHMENT LEVEL 3 — harsh ───────────────────────────────────
  punish3: [
    {
      sanskrit:  'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः',
      roman:     'Krodhad bhavati sammohah sammohat smriti-vibhramah',
      meaning:   'From craving comes delusion, from delusion — loss of memory, then ruin. This is the chain',
      reference: 'Bhagavad Gita 2.63',
    },
    {
      sanskrit:  'काम एष क्रोध एष रजोगुणसमुद्भवः',
      roman:     'Kama esha krodha esha rajo-guna-samudbhavah',
      meaning:   'It is desire. It is anger. Born of passion\'s quality. All-devouring, all-sinning. This is the named enemy',
      reference: 'Bhagavad Gita 3.37',
    },
    {
      sanskrit:  'त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः',
      roman:     'Tri-vidham narakasyedam dvaram nasanam atmanah',
      meaning:   'Three gates lead to self-destruction — lust, anger, and greed. You are standing at one. Step back',
      reference: 'Bhagavad Gita 16.21',
    },
  ],

  // ── PUNISHMENT LEVEL 4 — maximum ─────────────────────────────────
  punish4: [
    {
      sanskrit:  'आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः',
      roman:     'Atmaiva hy atmano bandhur atmaiva ripur atmanah',
      meaning:   'The self alone is the friend of the self. The self alone is the enemy. Choose now',
      reference: 'Bhagavad Gita 6.5',
    },
    {
      sanskrit:  'प्रजहाति यदा कामान्सर्वान्पार्थ मनोगतान्',
      roman:     'Prajahati yada kaman sarvan partha mano-gatan',
      meaning:   'When all desires of the mind are completely abandoned — then one knows peace. You know what must be abandoned. Do it',
      reference: 'Bhagavad Gita 2.55',
    },
    {
      sanskrit:  'एवं बुद्धेः परं बुद्ध्वा संस्तभ्यात्मानमात्मना',
      roman:     'Evam buddheh param buddhva samstabhyatmanam atmana',
      meaning:   'Know yourself to be higher than this. Steady the lower self with the higher. Conquer what keeps bringing you here',
      reference: 'Bhagavad Gita 3.43',
    },
  ],

  // ── MILESTONES ───────────────────────────────────────────────────
  milestone3: {
    sanskrit:  'आरुरुक्षोर्मुनेर्योगम् कर्म कारणमुच्यते',
    roman:     'Arurukshor muner yogam karma karanam uchyate',
    meaning:   'For the one who has just begun — action is the cause. The seed is planted, Gagan',
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
    meaning:   'Three hundred sixty-five days. You have surrendered fully to your highest self. Gagan is Jitendriya',
    reference: 'Bhagavad Gita 18.66',
  },

  // ── WEEKLY REFLECTION — Sunday ────────────────────────────────────
  weeklyReflection: [
    {
      sanskrit:  'विमृश्यैतदशेषेण यथेच्छसि तथा कुरु',
      roman:     'Vimrishya etad asheshena yathecchasi tatha kuru',
      meaning:   'Reflect on this fully. Then do as you choose — with clarity',
      reference: 'Bhagavad Gita 18.63',
    },
    {
      sanskrit:  'असंयतात्मना योगो दुष्प्राप इति मे मतिः',
      roman:     'Asamyatatmana yogo dusprapa iti me matih',
      meaning:   'For the uncontrolled mind, progress is difficult. But by proper means it is attainable. What did this week reveal about your self-control?',
      reference: 'Bhagavad Gita 6.36',
    },
    {
      sanskrit:  'असक्तबुद्धिः सर्वत्र जितात्मा विगतस्पृहः',
      roman:     'Asakta-buddhih sarvatra jitatma vigata-sprhah',
      meaning:   'Unattached intellect everywhere. Conquered self. Free from craving. Were you this, even partially, this week?',
      reference: 'Bhagavad Gita 18.49',
    },
    {
      sanskrit:  'अमानित्वमदम्भित्वमहिंसा क्षान्तिरार्जवम्',
      roman:     'Amanitvam adambhitvam ahimsa ksantir arjavam',
      meaning:   'Humility, non-pretension, patience, simplicity, steadiness, self-restraint — these are the marks of wisdom. How many did this week hold?',
      reference: 'Bhagavad Gita 13.7',
    },
  ],

  // ── STREAK FREEZE USED ────────────────────────────────────────────
  streakFreeze: [
    {
      sanskrit:  'नेहाभिक्रमनाशोऽस्ति',
      roman:     'Nehabhikrama nasho sti',
      meaning:   'No effort on this path is ever lost. Your streak is protected',
      reference: 'Bhagavad Gita 2.40',
    },
    {
      sanskrit:  'प्रयत्नाद्यतमानस्तु योगी संशुद्धकिल्बिषः',
      roman:     'Prayatnad yatamanas tu yogi samsuddha-kilbishah',
      meaning:   'With diligent effort, purified of impurities, the yogi perfects himself over time. One protected day does not end the journey',
      reference: 'Bhagavad Gita 6.45',
    },
    {
      sanskrit:  'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः',
      roman:     'Matra-sparsas tu kaunteya sitoshna-sukha-duhkha-dah',
      meaning:   'The difficulty was temporary. The streak continues. What passes does not define what you are building',
      reference: 'Bhagavad Gita 2.14',
    },
  ],

  // ── MORNING GREETING ──────────────────────────────────────────────
  morning: [
    {
      sanskrit:  'ब्रह्ममुहूर्त उत्तिष्ठेत्',
      roman:     'Brahma muhurta uttishtet',
      meaning:   'Rise in the sacred hour before dawn. This hour belongs to the warrior',
      reference: 'Ashtanga Hridayam 1.2',
    },
    {
      sanskrit:  'युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु',
      roman:     'Yuktahara-viharasya yukta-cheshtasya karmasu',
      meaning:   'Regulated in eating, rest, and action — for such a one, yoga dissolves all sorrow. Regulate this morning',
      reference: 'Bhagavad Gita 6.17',
    },
    {
      sanskrit:  'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
      roman:     'Karmanye vadhikaraste ma phaleshu kadachana',
      meaning:   'You have the right to this morning\'s action. Not to what it will bring. Show up. That is all',
      reference: 'Bhagavad Gita 2.47',
    },
    {
      sanskrit:  'यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्',
      roman:     'Yat karoshi yad asnasi yaj juhoshi dadasi yat',
      meaning:   'Whatever you do this morning — let it be an offering. Not performance. An offering',
      reference: 'Bhagavad Gita 9.27',
    },
    {
      sanskrit:  'नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः',
      roman:     'Niyatam kuru karma tvam karma jyayo hy akarmanah',
      meaning:   'Perform your prescribed duty. Action is greater than inaction. The body cannot sustain itself without work. Begin',
      reference: 'Bhagavad Gita 3.8',
    },
  ],

  // ── EVENING REFLECTION ────────────────────────────────────────────
  evening: [
    {
      sanskrit:  'कृतं किम् अकृतं किम् च',
      roman:     'Kritam kim akritam kim cha',
      meaning:   'What was done? What was left undone? Look honestly, Gagan',
      reference: 'Ancient Vedic reflection',
    },
    {
      sanskrit:  'विमृश्यैतदशेषेण यथेच्छसि तथा कुरु',
      roman:     'Vimrishya etad asheshena yathecchasi tatha kuru',
      meaning:   'Reflect on this fully. Then rest, knowing tomorrow you choose again with clarity',
      reference: 'Bhagavad Gita 18.63',
    },
    {
      sanskrit:  'उद्धरेदात्मनात्मानम् नात्मानमवसादयेत्',
      roman:     'Uddhared atmanatmanam natmanam avasadayet',
      meaning:   'Did today lift you? Be honest. Tomorrow begins where tonight ends',
      reference: 'Bhagavad Gita 6.5',
    },
    {
      sanskrit:  'बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते',
      roman:     'Buddhi-yukto jahatiha ubhe sukrita-duskrite',
      meaning:   'The wise man releases both good and bad actions at the day\'s end. The day is done. Release it completely',
      reference: 'Bhagavad Gita 2.50',
    },
    {
      sanskrit:  'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते',
      roman:     'Na hi jnanena sadrsam pavitram iha vidyate',
      meaning:   'Nothing purifies like self-knowledge. Tonight — know yourself honestly. What you did, what you avoided, and why',
      reference: 'Bhagavad Gita 4.38',
    },
  ],

  // ── CHARIOT FRAMEWORK — shown on identity/about screen ───────────
  chariot: {
    title:   'The Kurukshetra Within',
    lines: [
      { label: 'The Chariot',     desc: 'Your body — the vehicle you have been given' },
      { label: 'The Horses',      desc: 'Your five senses — powerful, fast, directionless' },
      { label: 'The Reins',       desc: 'Your mind — it holds or releases the horses' },
      { label: 'Arjuna',          desc: 'Your ego — the one who must act' },
      { label: 'Krishna',         desc: 'Your intellect — the one who already knows' },
      { label: 'The Battlefield', desc: 'Every single moment of choice' },
    ],
    closing: 'Karma is your Krishna. It does not fight for you. It shows you the path.',
  },
};

// ── Day-of-year picker — consistent within a day, rotates daily ───────
const _pick = (arr) => {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return arr[dayOfYear % arr.length];
};

// ── Context-aware shloka getter ───────────────────────────────────────
export const getShloka = (context) => {
  switch (context) {
    case 'splash':           return SHLOKAS.splash;
    case 'allDone':          return _pick(SHLOKAS.allDone);
    case 'missed':           return _pick(SHLOKAS.missed);
    case 'slipped':          return _pick(SHLOKAS.slipped);
    case 'punish1':          return _pick(SHLOKAS.punish1);
    case 'punish2':          return _pick(SHLOKAS.punish2);
    case 'punish3':          return _pick(SHLOKAS.punish3);
    case 'punish4':          return _pick(SHLOKAS.punish4);
    case 'weeklyReflection': return _pick(SHLOKAS.weeklyReflection);
    case 'streakFreeze':     return _pick(SHLOKAS.streakFreeze);
    case 'morning':          return _pick(SHLOKAS.morning);
    case 'evening':          return _pick(SHLOKAS.evening);
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

// Rotates daily — 21 shlokas = 3 weeks no repeat
export const getDailyHomeShloka = () => {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return SHLOKAS.home[dayOfYear % SHLOKAS.home.length];
};

// Rotates identity shloka daily — 7 shlokas = one per weekday
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
  if (hour < 12) return _pick(SHLOKAS.morning);
  if (hour >= 20) return _pick(SHLOKAS.evening);
  return getDailyHomeShloka();
};

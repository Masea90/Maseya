export type Language = 'en' | 'es' | 'fr';

export const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export const translations = {
  en: {
    // Brand
    tagline: 'Natural beauty, made personal.',
    
    // Common
    continue: 'Continue',
    skip: 'Skip',
    cancel: 'Cancel',
    save: 'Save',
    back: 'Back',
    of: 'of',
    all: 'All',
    search: 'Search',
    post: 'Post',
    members: 'members',
    womenOnly: 'Women only',
    everyone: 'Everyone',
    
    // Greetings
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    
    // Welcome
    welcomeTitle: 'Your natural beauty journey starts here',
    getStarted: 'Get Started',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    
    // Onboarding
    selectLanguage: 'Choose your language',
    languageSubtitle: 'You can change this later in settings',
    skinConcernsTitle: 'What are your skin concerns?',
    skinConcernsSubtitle: 'Select all that apply',
    hairTypeTitle: "What's your hair type?",
    hairTypeSubtitle: 'Select one',
    hairConcernsTitle: 'Any hair concerns?',
    hairConcernsSubtitle: 'Select all that apply',
    goalsTitle: 'What matters most to you?',
    goalsSubtitle: 'Select your top priorities',
    complete: 'Complete',
    
    // Skin concerns
    dryness: 'Dryness',
    acne: 'Acne & Breakouts',
    aging: 'Fine Lines & Aging',
    sensitivity: 'Sensitivity',
    oiliness: 'Oily Skin',
    hyperpigmentation: 'Dark Spots',
    dullness: 'Dull Skin',
    pores: 'Large Pores',
    
    // Hair types
    straight: 'Straight',
    wavy: 'Wavy',
    curly: 'Curly',
    coily: 'Coily',
    
    // Hair concerns
    dryBrittle: 'Dry & Brittle',
    frizz: 'Frizz',
    hairfall: 'Hair Fall',
    dandruff: 'Dandruff',
    oilyScalp: 'Oily Scalp',
    thinning: 'Thinning',
    damage: 'Damage',
    
    // Goals
    clearSkin: 'Clear, Glowing Skin',
    healthyHair: 'Healthy, Strong Hair',
    natural: 'All-Natural Products',
    nutrition: 'Better Nutrition',
    routine: 'Simple Routines',
    community: 'Community Support',
    hydration: 'Deep Hydration',
    antiAging: 'Anti-Aging',
    hairGrowth: 'Hair Growth',
    
    // Premium
    choosePlan: 'Choose Your Plan',
    free: 'Free',
    freeSubtitle: 'Great to start',
    startFree: 'Start Free',
    premium: 'Premium',
    unlockPremium: 'Unlock Premium',
    unlockMaseyaPremium: 'Unlock MASEYA Premium',
    perMonth: '/ month',
    cancelAnytime: 'Cancel anytime.',
    everythingInFree: 'Everything in Free, plus:',
    
    // Premium features
    freeFeature1: 'Personalized skin & hair profile',
    freeFeature2: 'Daily beauty tips',
    freeFeature3: 'Natural remedy library',
    freeFeature4: 'Community access',
    freeFeature5: 'Points & rewards',
    premiumFeature1: 'Personalized skin & hair insights',
    premiumFeature2: 'Advanced product recommendations',
    premiumFeature3: 'Full routine history & progress',
    premiumFeature4: 'Skin & Hair Scan (coming soon)',
    
    // Scan paywall
    premiumFeature: 'Premium Feature',
    scanPaywallTitle: 'Skin & Hair Scan is available for Premium members only.',
    scanPaywallDescription: 'Upgrade to get personalized analysis and long-term tracking.',
    
    // Home
    streak: 'streak',
    keepItUp: 'Keep it up!',
    points: 'points',
    yourGlowScore: 'Your Glow Score',
    improvement: 'improvement this week',
    quickActions: 'Quick Actions',
    startRoutine: 'Start Routine',
    morningCare: 'Morning care',
    skinScan: 'Skin Scan',
    aiAnalysis: 'AI Analysis',
    
    // Glow score
    skin: 'Skin',
    hair: 'Hair',
    
    // Today cards
    skinToday: 'Skin Today',
    hairToday: 'Hair Today',
    nutritionTip: 'Nutrition Tip',
    hydrationFocus: 'Hydration focus',
    scalpCareDay: 'Scalp care day',
    boostYourGlow: 'Boost your glow',
    skinTodayDesc: 'Your skin looks a bit dehydrated. Try adding hyaluronic acid to your routine today.',
    hairTodayDesc: "It's been 7 days since your last scalp treatment. Consider a gentle exfoliation!",
    nutritionTipDesc: 'Vitamin C boosts collagen production. Add some citrus or bell peppers to your meals.',
    
    // Ingredients
    ingredientAlerts: 'Ingredient Alerts',
    ingredientAlertsSubtitle: 'Ingredients to avoid based on your profile',
    avoidFragrance: 'Avoid Fragrance',
    fragranceReason: 'Can cause irritation for sensitive skin types',
    avoidSulfates: 'Avoid Sulfates',
    sulfatesReason: 'May strip natural oils from your hair type',
    avoidParabens: 'Avoid Parabens',
    parabensReason: 'Matches your preference for clean beauty',
    
    // Navigation
    home: 'Home',
    discover: 'Discover',
    routineNav: 'Routine',
    communityNav: 'Community',
    profile: 'Profile',
    
    // Profile
    memberSince: 'Member since',
    editProfile: 'Edit Profile',
    tier: 'Tier',
    rewards: 'Rewards',
    upgradeToPremium: 'Upgrade to Premium',
    unlockAiScans: 'Unlock AI scans & more',
    mySkinHairProfile: 'My Skin & Hair Profile',
    rewardsStore: 'Rewards Store',
    scanHistory: 'Scan History',
    notifications: 'Notifications',
    privacy: 'Privacy',
    helpSupport: 'Help & Support',
    language: 'Language',
    logOut: 'Log Out',
    nickname: 'Nickname',
    enterNickname: 'Enter your nickname',
    
    // Tiers
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    ptsTo: 'pts to',
    
    // Chat
    chatbotName: 'Mira',
    chatbotSubtitle: 'Your beauty assistant',
    chatbotGreeting: "Hi there! 👋 I'm Mira, your personal beauty assistant. How can I help you today?",
    askAnything: 'Ask me anything...',
    
    // Quick replies
    bestForDrySkin: 'Best products for dry skin',
    howToReduceAcne: 'How to reduce acne?',
    hairGrowthTips: 'Hair growth tips',
    whatUsersLikeMeUse: 'What users like me use?',
    
    // Scan
    aiScanner: 'AI Scanner',
    aiSkinHairScanner: 'AI Skin & Hair Scanner',
    readyToScan: 'Ready to Scan',
    positionFace: 'Position your face in good lighting for the best results',
    scanSkin: 'Scan Skin',
    scanHair: 'Scan Hair',
    skinAnalysis: 'Skin Analysis',
    skinAnalysisDesc: 'Hydration, texture, pores, and personalized recommendations',
    hairAnalysis: 'Hair Analysis',
    hairAnalysisDesc: 'Scalp health, damage level, porosity, and care tips',
    
    // Daily quotes
    quote1: 'Glow from within, the rest will follow 🌸',
    quote2: 'Your skin is a reflection of your inner health ✨',
    quote3: 'Nature knows best — trust the process 🌿',
    quote4: 'Small steps today, radiant tomorrow 💫',
    
    // Discover page
    searchPlaceholder: 'Search products, ingredients...',
    match: 'match',
    
    // Routine page
    morning: 'Morning',
    night: 'Night',
    dayStreak: 'day streak',
    steps: 'steps',
    pointsEarned: 'points earned! Great job completing your routine',
    morningRoutine: 'Morning Routine',
    nightRoutine: 'Night Routine',
    earnPointsPerStep: 'Earn points for each step',
    perStepBonus: '+5 per step, +15 bonus for completing all!',
    
    // Routine steps - Morning
    stepCleanser: 'Cleanser',
    stepToner: 'Toner',
    stepSerum: 'Serum',
    stepMoisturizer: 'Moisturizer',
    stepSunscreen: 'Sunscreen',
    productGentleCleanser: 'Gentle Hydrating Cleanser',
    productRoseWaterToner: 'Rose Water Toner',
    productVitaminCSerum: 'Vitamin C Serum',
    productDailyHydratingCream: 'Daily Hydrating Cream',
    productSpf50Mineral: 'SPF 50 Mineral',
    
    // Routine steps - Night
    stepOilCleanser: 'Oil Cleanser',
    stepWaterCleanser: 'Water Cleanser',
    stepTreatment: 'Treatment',
    stepEyeCream: 'Eye Cream',
    stepNightCream: 'Night Cream',
    productCleansingBalm: 'Cleansing Balm',
    productGentleFoamCleanser: 'Gentle Foam Cleanser',
    productHydratingEssence: 'Hydrating Essence',
    productRetinolSerum: 'Retinol Serum',
    productPeptideEyeCream: 'Peptide Eye Cream',
    productRepairNightMask: 'Repair Night Mask',
    
    // Duration
    duration1Min: '1 min',
    duration2Min: '2 min',
    duration30Sec: '30 sec',
    
    // Community page
    verified: 'verified',
    communityPostPlaceholder: 'Share your beauty journey...',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    
    // Community post content
    communityPost1: 'Finally found a routine that works for my sensitive skin! The key was switching to fragrance-free everything. 🌿',
    communityPost2: 'Rice water rinse results after 4 weeks! My hair has never been shinier ✨',
    communityPost3: 'PSA: Vitamin C serum should be applied BEFORE moisturizer, not after! Game changer for absorption 💡',
    communityPost4: 'Made the honey oatmeal mask from the app today - my skin feels so soft! Highly recommend for dry winter skin 🍯',
    
    // Community tags
    communitySensitiveSkin: 'sensitive skin',
    communityHairCare: 'hair care',
    communityRiceWater: 'rice water',
    communityTips: 'tips',
    communityVitaminC: 'vitamin c',
    communityDiy: 'diy',
    communityMask: 'mask',
    
    // Remedies page
    naturalRemedies: 'Natural Remedies',
    allNaturalRemedies: 'All-natural remedies using ingredients you can find at home',
    skinCategory: 'Skin',
    hairCategory: 'Hair',
    nutritionCategory: 'Nutrition',
    
    // Language settings
    languageSettings: 'Language',
    selectYourLanguage: 'Select your preferred language',
    
    // Product recommendations
    recommendedForYou: 'Recommended for You',
    basedOnProfile: 'Based on your profile',
    topPickForYou: 'Your Top Pick Today',
    topPickSubtitle: 'Our #1 recommendation based on your unique profile',
    becauseOfProfile: 'Because of Your Profile',
    becauseOfProfileSubtitle: 'Curated for your skin & hair needs',
    popularInCommunity: 'Popular in the Community',
    popularSubtitle: 'Loved by MASEYA members like you',
    solvesYourConcern: 'Solves:',
    usersUsing: 'members use this',
    refreshesDaily: 'Refreshes daily',
    refreshesWeekly: 'New picks weekly',
    noProductsFound: 'No products match your search',
    viewProduct: 'View Product',
    usersLikeYouAlsoUse: 'Users with a similar profile also use this.',
    whyThisMatches: 'Why This Matches You',
    buyNow: 'Buy Now',
    about: 'About',
    keyIngredients: 'Key Ingredients',
    
    // Product tags
    tagBio: 'Bio',
    tagNatural: 'Natural',
    tagVegan: 'Vegan',
    tagCrueltyFree: 'Cruelty-Free',
    tagOrganic: 'Organic',
    
    // Match reasons
    reasonGoodForSensitive: 'Good for sensitive skin',
    reasonHydratesDrySkin: 'Hydrates dry skin',
    reasonControlsOil: 'Controls excess oil',
    reasonHelpsWithAcne: 'Helps with acne-prone skin',
    reasonAntiAging: 'Anti-aging benefits',
    reasonPerfectForCurls: 'Perfect for curly hair',
    reasonEnhancesWaves: 'Enhances natural waves',
    reasonMatchesHairType: 'Matches your hair type',
    reasonNourishesHair: 'Nourishes and repairs hair',
    reasonAllNatural: 'All-natural ingredients',
    reasonGentleFormula: 'Gentle, clean formula',
    
    // Profile completion prompts
    completeProfileTitle: 'Tell us about you',
    completeProfileDesc: 'Complete your profile to get personalized product recommendations based on your skin type, hair type, and beauty goals.',
    completeProfile: 'Complete My Profile',
    
    // Onboarding guide
    guideStep1Title: 'What is MASEYA',
    guideStep1Desc: 'MASEYA is your personal guide for natural skin, hair and self-care.',
    guideStep2Title: 'How it works',
    guideStep2Desc: 'We personalize recommendations based on your skin, hair and goals.',
    guideStep3Title: 'Join our community',
    guideStep3Desc: 'Share tips, discover what works for others, and grow together with women like you.',
    guideStep4Title: 'What to do first',
    guideStep4Desc: 'Complete your profile, follow your routine and discover products made for you.',
    guideStart: 'Start my journey',
    guideNext: 'Next',
    guideSkip: 'Skip',
    
    // Product descriptions - Real products
    weledaSkinFoodDesc: 'Iconic intensive moisturizer with plant extracts and essential oils. Nourishes and protects very dry, rough skin.',
    paiRosehipDesc: 'Award-winning organic rosehip oil with CO2 extraction. Reduces scars, fine lines, and evens skin tone naturally.',
    ordinaryNiacinamideDesc: 'High-strength vitamin and mineral formula to reduce the appearance of blemishes and balance oil production.',
    olaplexOilDesc: 'Weightless, reparative styling oil that dramatically increases shine, softness, and color vibrancy.',
    ceraveCleanserDesc: 'Dermatologist-developed gentle cleanser with ceramides and hyaluronic acid. Non-foaming formula for dry to normal skin.',
    kloraneHairMaskDesc: 'Intense nourishing mask with mango butter for dry hair. Repairs and softens without weighing hair down.',
    nuxeOilDesc: 'Cult-favorite dry oil for face, body, and hair. Made with 98.1% natural ingredients including precious botanical oils.',
    renTonicDesc: 'Daily AHA tonic with lactic acid and willow bark. Gently exfoliates for brighter, more radiant skin.',
    moroccanoilDesc: 'The original argan oil-infused hair treatment. Conditions, detangles, and speeds up drying time.',
    realProductNote: 'This is a real product available on the market.',
    
    // Profile edit - additional
    profilePhoto: 'Profile Photo',
    addPhotoHint: 'Add a photo to personalize your profile',
    ageRange: 'Age Range',
    ageRangeHint: 'Helps us recommend age-appropriate products',
    sensitivitiesExclusions: 'Sensitivities & Exclusions',
    sensitivitiesHint: 'We\'ll filter out products with these ingredients',
    locationClimate: 'Location & Climate',
    climateHint: 'Climate affects skin and hair care needs',
    detectMyLocation: 'Detect My Location',
    detecting: 'Detecting...',
    orSelectManually: 'or select manually',
    countryLabel: 'Country',
    countryPlaceholder: 'e.g. France, USA, Morocco',
    climateTypeLabel: 'Climate Type',
    locationDetected: 'Location detected!',
    locationFailed: 'Could not detect location. Please select manually.',
    profileComplete: 'Complete',
    completeProfileForRecommendations: 'Complete your profile for better personalized recommendations',
    maxGoalsAllowed: 'Maximum 3 goals allowed',
    
    // Sensitivities
    fragranceFree: 'Fragrance-free',
    sulfateFree: 'Sulfate-free',
    parabenFree: 'Paraben-free',
    vegan: 'Vegan',
    crueltyFree: 'Cruelty-free',
    alcoholFree: 'Alcohol-free',
    siliconeFree: 'Silicone-free',
    
    // Climate options
    climateTropical: 'Tropical (hot & humid)',
    climateDry: 'Dry / Arid',
    climateTemperate: 'Temperate (mild)',
    climateContinental: 'Continental (hot summers, cold winters)',
    climateMediterranean: 'Mediterranean',
    
    // Chatbot AI
    chatbotError: 'Sorry, I couldn\'t connect right now. Please try again in a moment. 🌸',
    chatbotRateLimit: 'I\'m getting a lot of questions right now! Please wait a moment before sending another message. 💫',
    chatbotTyping: 'Thinking...',

    // Community translation
    seeOriginal: 'See original',
    seeTranslation: 'See translation',
    translatedFrom: 'Translated from',
  },
  es: {
    // Brand
    tagline: 'Belleza natural, hecha personal.',
    
    // Common
    continue: 'Continuar',
    skip: 'Omitir',
    cancel: 'Cancelar',
    save: 'Guardar',
    back: 'Atrás',
    of: 'de',
    all: 'Todo',
    search: 'Buscar',
    post: 'Publicar',
    members: 'miembros',
    womenOnly: 'Solo mujeres',
    everyone: 'Todos',
    
    // Greetings
    goodMorning: 'Buenos días',
    goodAfternoon: 'Buenas tardes',
    goodEvening: 'Buenas noches',
    
    // Welcome
    welcomeTitle: 'Tu viaje de belleza natural comienza aquí',
    getStarted: 'Empezar',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    signIn: 'Iniciar sesión',
    
    // Onboarding
    selectLanguage: 'Elige tu idioma',
    languageSubtitle: 'Puedes cambiarlo luego en ajustes',
    skinConcernsTitle: '¿Cuáles son tus preocupaciones de piel?',
    skinConcernsSubtitle: 'Selecciona todas las que apliquen',
    hairTypeTitle: '¿Cuál es tu tipo de cabello?',
    hairTypeSubtitle: 'Selecciona uno',
    hairConcernsTitle: '¿Alguna preocupación con tu cabello?',
    hairConcernsSubtitle: 'Selecciona todas las que apliquen',
    goalsTitle: '¿Qué es lo más importante para ti?',
    goalsSubtitle: 'Selecciona tus prioridades',
    complete: 'Completar',
    
    // Skin concerns
    dryness: 'Sequedad',
    acne: 'Acné y brotes',
    aging: 'Líneas finas y envejecimiento',
    sensitivity: 'Sensibilidad',
    oiliness: 'Piel grasa',
    hyperpigmentation: 'Manchas oscuras',
    dullness: 'Piel apagada',
    pores: 'Poros grandes',
    
    // Hair types
    straight: 'Liso',
    wavy: 'Ondulado',
    curly: 'Rizado',
    coily: 'Afro',
    
    // Hair concerns
    dryBrittle: 'Seco y quebradizo',
    frizz: 'Frizz',
    hairfall: 'Caída del cabello',
    dandruff: 'Caspa',
    oilyScalp: 'Cuero cabelludo graso',
    thinning: 'Adelgazamiento',
    damage: 'Daño',
    
    // Goals
    clearSkin: 'Piel clara y radiante',
    healthyHair: 'Cabello sano y fuerte',
    natural: 'Productos 100% naturales',
    nutrition: 'Mejor nutrición',
    routine: 'Rutinas simples',
    community: 'Apoyo de la comunidad',
    hydration: 'Hidratación profunda',
    antiAging: 'Antienvejecimiento',
    hairGrowth: 'Crecimiento capilar',
    
    // Premium
    choosePlan: 'Elige tu plan',
    free: 'Gratis',
    freeSubtitle: 'Ideal para empezar',
    startFree: 'Empezar gratis',
    premium: 'Premium',
    unlockPremium: 'Desbloquear Premium',
    unlockMaseyaPremium: 'Desbloquear MASEYA Premium',
    perMonth: '/ mes',
    cancelAnytime: 'Cancela cuando quieras.',
    everythingInFree: 'Todo lo de Gratis, más:',
    
    // Premium features
    freeFeature1: 'Perfil personalizado de piel y cabello',
    freeFeature2: 'Consejos de belleza diarios',
    freeFeature3: 'Biblioteca de remedios naturales',
    freeFeature4: 'Acceso a la comunidad',
    freeFeature5: 'Puntos y recompensas',
    premiumFeature1: 'Información personalizada de piel y cabello',
    premiumFeature2: 'Recomendaciones avanzadas de productos',
    premiumFeature3: 'Historial completo de rutinas y progreso',
    premiumFeature4: 'Escaneo de Piel y Cabello (próximamente)',
    
    // Scan paywall
    premiumFeature: 'Función Premium',
    scanPaywallTitle: 'El escaneo de Piel y Cabello está disponible solo para miembros Premium.',
    scanPaywallDescription: 'Actualiza para obtener análisis personalizado y seguimiento a largo plazo.',
    
    // Home
    streak: 'racha',
    keepItUp: '¡Sigue así!',
    points: 'puntos',
    yourGlowScore: 'Tu Puntuación Glow',
    improvement: 'de mejora esta semana',
    quickActions: 'Acciones rápidas',
    startRoutine: 'Iniciar rutina',
    morningCare: 'Cuidado matutino',
    skinScan: 'Escaneo de piel',
    aiAnalysis: 'Análisis IA',
    
    // Glow score
    skin: 'Piel',
    hair: 'Cabello',
    
    // Today cards
    skinToday: 'Piel hoy',
    hairToday: 'Cabello hoy',
    nutritionTip: 'Consejo nutricional',
    hydrationFocus: 'Enfoque en hidratación',
    scalpCareDay: 'Día de cuidado del cuero cabelludo',
    boostYourGlow: 'Potencia tu brillo',
    skinTodayDesc: 'Tu piel luce un poco deshidratada. Prueba añadir ácido hialurónico a tu rutina hoy.',
    hairTodayDesc: 'Han pasado 7 días desde tu último tratamiento de cuero cabelludo. ¡Considera una exfoliación suave!',
    nutritionTipDesc: 'La vitamina C estimula la producción de colágeno. Añade cítricos o pimientos a tus comidas.',
    
    // Ingredients
    ingredientAlerts: 'Alertas de ingredientes',
    ingredientAlertsSubtitle: 'Ingredientes a evitar según tu perfil',
    avoidFragrance: 'Evitar fragancias',
    fragranceReason: 'Puede causar irritación en pieles sensibles',
    avoidSulfates: 'Evitar sulfatos',
    sulfatesReason: 'Puede eliminar los aceites naturales de tu tipo de cabello',
    avoidParabens: 'Evitar parabenos',
    parabensReason: 'Coincide con tu preferencia por la belleza limpia',
    
    // Navigation
    home: 'Inicio',
    discover: 'Descubrir',
    routineNav: 'Rutina',
    communityNav: 'Comunidad',
    profile: 'Perfil',
    
    // Profile
    memberSince: 'Miembro desde',
    editProfile: 'Editar perfil',
    tier: 'Nivel',
    rewards: 'Recompensas',
    upgradeToPremium: 'Mejorar a Premium',
    unlockAiScans: 'Desbloquea escaneos IA y más',
    mySkinHairProfile: 'Mi perfil de piel y cabello',
    rewardsStore: 'Tienda de recompensas',
    scanHistory: 'Historial de escaneos',
    notifications: 'Notificaciones',
    privacy: 'Privacidad',
    helpSupport: 'Ayuda y soporte',
    language: 'Idioma',
    logOut: 'Cerrar sesión',
    nickname: 'Apodo',
    enterNickname: 'Escribe tu apodo',
    
    // Tiers
    bronze: 'Bronce',
    silver: 'Plata',
    gold: 'Oro',
    ptsTo: 'pts para',
    
    // Chat
    chatbotName: 'Mira',
    chatbotSubtitle: 'Tu asistente de belleza',
    chatbotGreeting: '¡Hola! 👋 Soy Mira, tu asistente personal de belleza. ¿En qué puedo ayudarte hoy?',
    askAnything: 'Pregúntame lo que quieras...',
    
    // Quick replies
    bestForDrySkin: 'Mejores productos para piel seca',
    howToReduceAcne: '¿Cómo reducir el acné?',
    hairGrowthTips: 'Consejos para el crecimiento del cabello',
    whatUsersLikeMeUse: '¿Qué usan usuarias como yo?',
    
    // Scan
    aiScanner: 'Escáner IA',
    aiSkinHairScanner: 'Escáner IA de Piel y Cabello',
    readyToScan: 'Listo para escanear',
    positionFace: 'Coloca tu rostro con buena iluminación para mejores resultados',
    scanSkin: 'Escanear piel',
    scanHair: 'Escanear cabello',
    skinAnalysis: 'Análisis de piel',
    skinAnalysisDesc: 'Hidratación, textura, poros y recomendaciones personalizadas',
    hairAnalysis: 'Análisis de cabello',
    hairAnalysisDesc: 'Salud del cuero cabelludo, nivel de daño, porosidad y consejos de cuidado',
    
    // Daily quotes
    quote1: 'Brilla desde dentro, lo demás seguirá 🌸',
    quote2: 'Tu piel es el reflejo de tu salud interior ✨',
    quote3: 'La naturaleza sabe — confía en el proceso 🌿',
    quote4: 'Pequeños pasos hoy, radiante mañana 💫',
    
    // Discover page
    searchPlaceholder: 'Buscar productos, ingredientes...',
    match: 'coincidencia',
    
    // Routine page
    morning: 'Mañana',
    night: 'Noche',
    dayStreak: 'días de racha',
    steps: 'pasos',
    pointsEarned: '¡puntos ganados! Excelente trabajo completando tu rutina',
    morningRoutine: 'Rutina de Mañana',
    nightRoutine: 'Rutina de Noche',
    earnPointsPerStep: 'Gana puntos por cada paso',
    perStepBonus: '+5 por paso, +15 de bonificación por completar todo',
    
    // Routine steps - Morning
    stepCleanser: 'Limpiador',
    stepToner: 'Tónico',
    stepSerum: 'Sérum',
    stepMoisturizer: 'Hidratante',
    stepSunscreen: 'Protector solar',
    productGentleCleanser: 'Limpiador Hidratante Suave',
    productRoseWaterToner: 'Tónico de Agua de Rosas',
    productVitaminCSerum: 'Sérum de Vitamina C',
    productDailyHydratingCream: 'Crema Hidratante Diaria',
    productSpf50Mineral: 'SPF 50 Mineral',
    
    // Routine steps - Night
    stepOilCleanser: 'Limpiador en aceite',
    stepWaterCleanser: 'Limpiador al agua',
    stepTreatment: 'Tratamiento',
    stepEyeCream: 'Crema de ojos',
    stepNightCream: 'Crema de noche',
    productCleansingBalm: 'Bálsamo Limpiador',
    productGentleFoamCleanser: 'Limpiador de Espuma Suave',
    productHydratingEssence: 'Esencia Hidratante',
    productRetinolSerum: 'Sérum de Retinol',
    productPeptideEyeCream: 'Crema de Ojos con Péptidos',
    productRepairNightMask: 'Mascarilla Reparadora de Noche',
    
    // Duration
    duration1Min: '1 min',
    duration2Min: '2 min',
    duration30Sec: '30 seg',
    
    // Community page
    verified: 'verificada',
    communityPostPlaceholder: 'Comparte tu experiencia de belleza...',
    like: 'Me gusta',
    comment: 'Comentar',
    share: 'Compartir',
    
    // Community post content
    communityPost1: '¡Por fin encontré una rutina que funciona para mi piel sensible! La clave fue cambiar a productos sin fragancia. 🌿',
    communityPost2: '¡Resultados del enjuague de agua de arroz después de 4 semanas! Mi cabello nunca había brillado tanto ✨',
    communityPost3: 'Consejo: ¡El sérum de vitamina C debe aplicarse ANTES de la crema hidratante, no después! Cambia todo para la absorción 💡',
    communityPost4: 'Hice la mascarilla de miel y avena de la app hoy - ¡mi piel está súper suave! Muy recomendada para la piel seca del invierno 🍯',
    
    // Community tags
    communitySensitiveSkin: 'piel sensible',
    communityHairCare: 'cuidado capilar',
    communityRiceWater: 'agua de arroz',
    communityTips: 'consejos',
    communityVitaminC: 'vitamina c',
    communityDiy: 'hazlo tú misma',
    communityMask: 'mascarilla',
    
    // Remedies page
    naturalRemedies: 'Remedios Naturales',
    allNaturalRemedies: 'Remedios naturales con ingredientes que puedes encontrar en casa',
    skinCategory: 'Piel',
    hairCategory: 'Cabello',
    nutritionCategory: 'Nutrición',
    
    // Language settings
    languageSettings: 'Idioma',
    selectYourLanguage: 'Selecciona tu idioma preferido',
    
    // Product recommendations
    recommendedForYou: 'Recomendado para ti',
    basedOnProfile: 'Basado en tu perfil',
    topPickForYou: 'Tu elección del día',
    topPickSubtitle: 'Nuestra recomendación #1 según tu perfil único',
    becauseOfProfile: 'Según tu perfil',
    becauseOfProfileSubtitle: 'Seleccionado para tus necesidades de piel y cabello',
    popularInCommunity: 'Popular en la comunidad',
    popularSubtitle: 'Amado por miembros de MASEYA como tú',
    solvesYourConcern: 'Resuelve:',
    usersUsing: 'miembros lo usan',
    refreshesDaily: 'Se actualiza diariamente',
    refreshesWeekly: 'Nuevas opciones cada semana',
    noProductsFound: 'No hay productos que coincidan con tu búsqueda',
    viewProduct: 'Ver producto',
    usersLikeYouAlsoUse: 'Usuarias con un perfil similar también usan esto.',
    whyThisMatches: 'Por qué te encaja',
    buyNow: 'Comprar ahora',
    about: 'Acerca de',
    keyIngredients: 'Ingredientes clave',
    
    // Product tags
    tagBio: 'Bio',
    tagNatural: 'Natural',
    tagVegan: 'Vegano',
    tagCrueltyFree: 'Sin crueldad',
    tagOrganic: 'Orgánico',
    
    // Match reasons
    reasonGoodForSensitive: 'Bueno para pieles sensibles',
    reasonHydratesDrySkin: 'Hidrata la piel seca',
    reasonControlsOil: 'Controla el exceso de grasa',
    reasonHelpsWithAcne: 'Ayuda con la piel con acné',
    reasonAntiAging: 'Beneficios antienvejecimiento',
    reasonPerfectForCurls: 'Perfecto para rizos',
    reasonEnhancesWaves: 'Realza las ondas naturales',
    reasonMatchesHairType: 'Se adapta a tu tipo de cabello',
    reasonNourishesHair: 'Nutre y repara el cabello',
    reasonAllNatural: 'Ingredientes 100% naturales',
    reasonGentleFormula: 'Fórmula suave y limpia',
    
    // Profile completion prompts
    completeProfileTitle: 'Cuéntanos sobre ti',
    completeProfileDesc: 'Completa tu perfil para obtener recomendaciones personalizadas basadas en tu tipo de piel, cabello y objetivos de belleza.',
    completeProfile: 'Completar mi perfil',
    
    // Onboarding guide
    guideStep1Title: '¿Qué es MASEYA?',
    guideStep1Desc: 'MASEYA es tu guía personal para el cuidado natural de tu piel, cabello y bienestar.',
    guideStep2Title: 'Cómo funciona',
    guideStep2Desc: 'Personalizamos las recomendaciones según tu piel, cabello y objetivos.',
    guideStep3Title: 'Únete a nuestra comunidad',
    guideStep3Desc: 'Comparte consejos, descubre lo que funciona para otras y crece junto a mujeres como tú.',
    guideStep4Title: 'Por dónde empezar',
    guideStep4Desc: 'Completa tu perfil, sigue tu rutina y descubre productos hechos para ti.',
    guideStart: 'Comenzar mi viaje',
    guideNext: 'Siguiente',
    guideSkip: 'Omitir',
    
    // Product descriptions - Real products
    weledaSkinFoodDesc: 'Hidratante intensivo icónico con extractos vegetales y aceites esenciales. Nutre y protege la piel muy seca.',
    paiRosehipDesc: 'Aceite de rosa mosqueta orgánico premiado con extracción CO2. Reduce cicatrices, líneas finas y unifica el tono.',
    ordinaryNiacinamideDesc: 'Fórmula de vitaminas y minerales de alta concentración para reducir imperfecciones y equilibrar la producción de grasa.',
    olaplexOilDesc: 'Aceite reparador ultraligero que aumenta drásticamente el brillo, la suavidad y la vitalidad del color.',
    ceraveCleanserDesc: 'Limpiador suave desarrollado por dermatólogos con ceramidas y ácido hialurónico. Fórmula sin espuma para piel seca.',
    kloraneHairMaskDesc: 'Mascarilla nutritiva intensa con manteca de mango para cabello seco. Repara y suaviza sin apelmazar.',
    nuxeOilDesc: 'Aceite seco de culto para rostro, cuerpo y cabello. Elaborado con 98,1% de ingredientes naturales y aceites botánicos preciosos.',
    renTonicDesc: 'Tónico AHA diario con ácido láctico y corteza de sauce. Exfolia suavemente para una piel más luminosa.',
    moroccanoilDesc: 'El tratamiento capilar original con aceite de argán. Acondiciona, desenreda y acelera el secado.',
    realProductNote: 'Este es un producto real disponible en el mercado.',
    
    // Profile edit - additional
    profilePhoto: 'Foto de Perfil',
    addPhotoHint: 'Añade una foto para personalizar tu perfil',
    ageRange: 'Rango de Edad',
    ageRangeHint: 'Nos ayuda a recomendar productos adecuados para tu edad',
    sensitivitiesExclusions: 'Sensibilidades y Exclusiones',
    sensitivitiesHint: 'Filtraremos productos con estos ingredientes',
    locationClimate: 'Ubicación y Clima',
    climateHint: 'El clima afecta las necesidades de cuidado de piel y cabello',
    detectMyLocation: 'Detectar mi ubicación',
    detecting: 'Detectando...',
    orSelectManually: 'o selecciona manualmente',
    countryLabel: 'País',
    countryPlaceholder: 'ej. España, México, Argentina',
    climateTypeLabel: 'Tipo de Clima',
    locationDetected: '¡Ubicación detectada!',
    locationFailed: 'No se pudo detectar la ubicación. Por favor, selecciona manualmente.',
    profileComplete: 'Completo',
    completeProfileForRecommendations: 'Completa tu perfil para mejores recomendaciones personalizadas',
    maxGoalsAllowed: 'Máximo 3 objetivos permitidos',
    
    // Sensitivities
    fragranceFree: 'Sin fragancia',
    sulfateFree: 'Sin sulfatos',
    parabenFree: 'Sin parabenos',
    vegan: 'Vegano',
    crueltyFree: 'Sin crueldad',
    alcoholFree: 'Sin alcohol',
    siliconeFree: 'Sin siliconas',
    
    // Climate options
    climateTropical: 'Tropical (caliente y húmedo)',
    climateDry: 'Seco / Árido',
    climateTemperate: 'Templado (suave)',
    climateContinental: 'Continental (veranos calientes, inviernos fríos)',
    climateMediterranean: 'Mediterráneo',
    
    // Chatbot AI
    chatbotError: 'Lo siento, no pude conectar en este momento. Inténtalo de nuevo en un momento. 🌸',
    chatbotRateLimit: '¡Estoy recibiendo muchas preguntas ahora mismo! Espera un momento antes de enviar otro mensaje. 💫',
    chatbotTyping: 'Pensando...',

    // Community translation
    seeOriginal: 'Ver original',
    seeTranslation: 'Ver traducción',
    translatedFrom: 'Traducido de',
  },
  fr: {
    // Brand
    tagline: 'Beauté naturelle, faite pour vous.',
    
    // Common
    continue: 'Continuer',
    skip: 'Passer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    back: 'Retour',
    of: 'sur',
    all: 'Tout',
    search: 'Rechercher',
    post: 'Publier',
    members: 'membres',
    womenOnly: 'Femmes uniquement',
    everyone: 'Tout le monde',
    
    // Greetings
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    
    // Welcome
    welcomeTitle: 'Votre voyage beauté naturelle commence ici',
    getStarted: 'Commencer',
    alreadyHaveAccount: 'Vous avez déjà un compte ?',
    signIn: 'Se connecter',
    
    // Onboarding
    selectLanguage: 'Choisissez votre langue',
    languageSubtitle: 'Vous pouvez changer cela plus tard dans les paramètres',
    skinConcernsTitle: 'Quelles sont vos préoccupations de peau ?',
    skinConcernsSubtitle: 'Sélectionnez toutes celles qui s\'appliquent',
    hairTypeTitle: 'Quel est votre type de cheveux ?',
    hairTypeSubtitle: 'Sélectionnez-en un',
    hairConcernsTitle: 'Des préoccupations capillaires ?',
    hairConcernsSubtitle: 'Sélectionnez toutes celles qui s\'appliquent',
    goalsTitle: 'Qu\'est-ce qui compte le plus pour vous ?',
    goalsSubtitle: 'Sélectionnez vos priorités',
    complete: 'Terminer',
    
    // Skin concerns
    dryness: 'Sécheresse',
    acne: 'Acné et imperfections',
    aging: 'Ridules et vieillissement',
    sensitivity: 'Sensibilité',
    oiliness: 'Peau grasse',
    hyperpigmentation: 'Taches sombres',
    dullness: 'Teint terne',
    pores: 'Pores dilatés',
    
    // Hair types
    straight: 'Lisses',
    wavy: 'Ondulés',
    curly: 'Bouclés',
    coily: 'Crépus',
    
    // Hair concerns
    dryBrittle: 'Secs et cassants',
    frizz: 'Frisottis',
    hairfall: 'Chute de cheveux',
    dandruff: 'Pellicules',
    oilyScalp: 'Cuir chevelu gras',
    thinning: 'Affinement',
    damage: 'Dommages',
    
    // Goals
    clearSkin: 'Peau nette et éclatante',
    healthyHair: 'Cheveux sains et forts',
    natural: 'Produits 100% naturels',
    nutrition: 'Meilleure nutrition',
    routine: 'Routines simples',
    community: 'Soutien de la communauté',
    hydration: 'Hydratation profonde',
    antiAging: 'Anti-âge',
    hairGrowth: 'Croissance capillaire',
    
    // Premium
    choosePlan: 'Choisissez votre plan',
    free: 'Gratuit',
    freeSubtitle: 'Idéal pour commencer',
    startFree: 'Commencer gratuitement',
    premium: 'Premium',
    unlockPremium: 'Débloquer Premium',
    unlockMaseyaPremium: 'Débloquer MASEYA Premium',
    perMonth: '/ mois',
    cancelAnytime: 'Annulez à tout moment.',
    everythingInFree: 'Tout de Gratuit, plus :',
    
    // Premium features
    freeFeature1: 'Profil personnalisé peau et cheveux',
    freeFeature2: 'Conseils beauté quotidiens',
    freeFeature3: 'Bibliothèque de remèdes naturels',
    freeFeature4: 'Accès à la communauté',
    freeFeature5: 'Points et récompenses',
    premiumFeature1: 'Informations personnalisées peau et cheveux',
    premiumFeature2: 'Recommandations de produits avancées',
    premiumFeature3: 'Historique complet des routines et progrès',
    premiumFeature4: 'Scan Peau et Cheveux (bientôt disponible)',
    
    // Scan paywall
    premiumFeature: 'Fonctionnalité Premium',
    scanPaywallTitle: 'Le scan Peau et Cheveux est réservé aux membres Premium.',
    scanPaywallDescription: 'Passez à Premium pour obtenir une analyse personnalisée et un suivi à long terme.',
    
    // Home
    streak: 'jours de suite',
    keepItUp: 'Continuez comme ça !',
    points: 'points',
    yourGlowScore: 'Votre Score Éclat',
    improvement: 'd\'amélioration cette semaine',
    quickActions: 'Actions rapides',
    startRoutine: 'Démarrer la routine',
    morningCare: 'Soins du matin',
    skinScan: 'Scan de peau',
    aiAnalysis: 'Analyse IA',
    
    // Glow score
    skin: 'Peau',
    hair: 'Cheveux',
    
    // Today cards
    skinToday: 'Peau aujourd\'hui',
    hairToday: 'Cheveux aujourd\'hui',
    nutritionTip: 'Conseil nutrition',
    hydrationFocus: 'Focus hydratation',
    scalpCareDay: 'Jour soins du cuir chevelu',
    boostYourGlow: 'Boostez votre éclat',
    skinTodayDesc: 'Votre peau semble un peu déshydratée. Essayez d\'ajouter de l\'acide hyaluronique à votre routine aujourd\'hui.',
    hairTodayDesc: 'Cela fait 7 jours depuis votre dernier traitement du cuir chevelu. Pensez à une exfoliation douce !',
    nutritionTipDesc: 'La vitamine C stimule la production de collagène. Ajoutez des agrumes ou des poivrons à vos repas.',
    
    // Ingredients
    ingredientAlerts: 'Alertes ingrédients',
    ingredientAlertsSubtitle: 'Ingrédients à éviter selon votre profil',
    avoidFragrance: 'Éviter les parfums',
    fragranceReason: 'Peut irriter les peaux sensibles',
    avoidSulfates: 'Éviter les sulfates',
    sulfatesReason: 'Peut éliminer les huiles naturelles de vos cheveux',
    avoidParabens: 'Éviter les parabènes',
    parabensReason: 'Correspond à votre préférence pour la beauté propre',
    
    // Navigation
    home: 'Accueil',
    discover: 'Découvrir',
    routineNav: 'Routine',
    communityNav: 'Communauté',
    profile: 'Profil',
    
    // Profile
    memberSince: 'Membre depuis',
    editProfile: 'Modifier le profil',
    tier: 'Niveau',
    rewards: 'Récompenses',
    upgradeToPremium: 'Passer à Premium',
    unlockAiScans: 'Débloquez les scans IA et plus',
    mySkinHairProfile: 'Mon profil peau et cheveux',
    rewardsStore: 'Boutique de récompenses',
    scanHistory: 'Historique des scans',
    notifications: 'Notifications',
    privacy: 'Confidentialité',
    helpSupport: 'Aide et support',
    language: 'Langue',
    logOut: 'Déconnexion',
    nickname: 'Surnom',
    enterNickname: 'Entrez votre surnom',
    
    // Tiers
    bronze: 'Bronze',
    silver: 'Argent',
    gold: 'Or',
    ptsTo: 'pts pour',
    
    // Chat
    chatbotName: 'Mira',
    chatbotSubtitle: 'Votre assistante beauté',
    chatbotGreeting: 'Bonjour ! 👋 Je suis Mira, votre assistante beauté personnelle. Comment puis-je vous aider aujourd\'hui ?',
    askAnything: 'Posez-moi vos questions...',
    
    // Quick replies
    bestForDrySkin: 'Meilleurs produits pour peau sèche',
    howToReduceAcne: 'Comment réduire l\'acné ?',
    hairGrowthTips: 'Conseils pour la pousse des cheveux',
    whatUsersLikeMeUse: 'Qu\'utilisent les utilisatrices comme moi ?',
    
    // Scan
    aiScanner: 'Scanner IA',
    aiSkinHairScanner: 'Scanner IA Peau et Cheveux',
    readyToScan: 'Prêt à scanner',
    positionFace: 'Placez votre visage dans une bonne lumière pour de meilleurs résultats',
    scanSkin: 'Scanner la peau',
    scanHair: 'Scanner les cheveux',
    skinAnalysis: 'Analyse de peau',
    skinAnalysisDesc: 'Hydratation, texture, pores et recommandations personnalisées',
    hairAnalysis: 'Analyse capillaire',
    hairAnalysisDesc: 'Santé du cuir chevelu, niveau de dommages, porosité et conseils de soins',
    
    // Daily quotes
    quote1: 'Rayonnez de l\'intérieur, le reste suivra 🌸',
    quote2: 'Votre peau est le reflet de votre santé intérieure ✨',
    quote3: 'La nature sait mieux — faites confiance au processus 🌿',
    quote4: 'Petits pas aujourd\'hui, radieuse demain 💫',
    
    // Discover page
    searchPlaceholder: 'Rechercher produits, ingrédients...',
    match: 'correspondance',
    
    // Routine page
    morning: 'Matin',
    night: 'Nuit',
    dayStreak: 'jours consécutifs',
    steps: 'étapes',
    pointsEarned: 'points gagnés ! Excellent travail pour avoir terminé votre routine',
    morningRoutine: 'Routine du Matin',
    nightRoutine: 'Routine du Soir',
    earnPointsPerStep: 'Gagnez des points pour chaque étape',
    perStepBonus: '+5 par étape, +15 bonus pour tout compléter !',
    
    // Routine steps - Morning
    stepCleanser: 'Nettoyant',
    stepToner: 'Tonique',
    stepSerum: 'Sérum',
    stepMoisturizer: 'Hydratant',
    stepSunscreen: 'Crème solaire',
    productGentleCleanser: 'Nettoyant Hydratant Doux',
    productRoseWaterToner: 'Tonique à l\'Eau de Rose',
    productVitaminCSerum: 'Sérum Vitamine C',
    productDailyHydratingCream: 'Crème Hydratante Quotidienne',
    productSpf50Mineral: 'SPF 50 Minéral',
    
    // Routine steps - Night
    stepOilCleanser: 'Nettoyant huileux',
    stepWaterCleanser: 'Nettoyant aqueux',
    stepTreatment: 'Traitement',
    stepEyeCream: 'Crème contour des yeux',
    stepNightCream: 'Crème de nuit',
    productCleansingBalm: 'Baume Nettoyant',
    productGentleFoamCleanser: 'Nettoyant Mousse Douce',
    productHydratingEssence: 'Essence Hydratante',
    productRetinolSerum: 'Sérum au Rétinol',
    productPeptideEyeCream: 'Crème Yeux aux Peptides',
    productRepairNightMask: 'Masque Réparateur de Nuit',
    
    // Duration
    duration1Min: '1 min',
    duration2Min: '2 min',
    duration30Sec: '30 sec',
    
    // Community page
    verified: 'vérifiée',
    communityPostPlaceholder: 'Partagez votre parcours beauté...',
    like: 'J\'aime',
    comment: 'Commenter',
    share: 'Partager',
    
    // Community post content
    communityPost1: 'J\'ai enfin trouvé une routine qui fonctionne pour ma peau sensible ! La clé était de passer à des produits sans parfum. 🌿',
    communityPost2: 'Résultats du rinçage à l\'eau de riz après 4 semaines ! Mes cheveux n\'ont jamais été aussi brillants ✨',
    communityPost3: 'Astuce : Le sérum vitamine C doit être appliqué AVANT la crème hydratante, pas après ! Ça change tout pour l\'absorption 💡',
    communityPost4: 'J\'ai fait le masque miel-flocons d\'avoine de l\'appli aujourd\'hui - ma peau est tellement douce ! Je recommande pour les peaux sèches en hiver 🍯',
    
    // Community tags
    communitySensitiveSkin: 'peau sensible',
    communityHairCare: 'soins capillaires',
    communityRiceWater: 'eau de riz',
    communityTips: 'astuces',
    communityVitaminC: 'vitamine c',
    communityDiy: 'fait maison',
    communityMask: 'masque',
    
    // Remedies page
    naturalRemedies: 'Remèdes Naturels',
    allNaturalRemedies: 'Remèdes naturels avec des ingrédients que vous pouvez trouver chez vous',
    skinCategory: 'Peau',
    hairCategory: 'Cheveux',
    nutritionCategory: 'Nutrition',
    
    // Language settings
    languageSettings: 'Langue',
    selectYourLanguage: 'Sélectionnez votre langue préférée',
    
    // Product recommendations
    recommendedForYou: 'Recommandé pour vous',
    basedOnProfile: 'Basé sur votre profil',
    topPickForYou: 'Votre choix du jour',
    topPickSubtitle: 'Notre recommandation n°1 selon votre profil unique',
    becauseOfProfile: 'Selon votre profil',
    becauseOfProfileSubtitle: 'Sélectionné pour vos besoins peau et cheveux',
    popularInCommunity: 'Populaire dans la communauté',
    popularSubtitle: 'Adoré par les membres MASEYA comme vous',
    solvesYourConcern: 'Résout :',
    usersUsing: 'membres l\'utilisent',
    refreshesDaily: 'Mis à jour quotidiennement',
    refreshesWeekly: 'Nouvelles sélections chaque semaine',
    noProductsFound: 'Aucun produit ne correspond à votre recherche',
    viewProduct: 'Voir le produit',
    usersLikeYouAlsoUse: 'Les utilisatrices avec un profil similaire utilisent aussi ceci.',
    whyThisMatches: 'Pourquoi ça vous correspond',
    buyNow: 'Acheter',
    about: 'À propos',
    keyIngredients: 'Ingrédients clés',
    
    // Product tags
    tagBio: 'Bio',
    tagNatural: 'Naturel',
    tagVegan: 'Végan',
    tagCrueltyFree: 'Sans cruauté',
    tagOrganic: 'Biologique',
    
    // Match reasons
    reasonGoodForSensitive: 'Bon pour les peaux sensibles',
    reasonHydratesDrySkin: 'Hydrate les peaux sèches',
    reasonControlsOil: 'Contrôle l\'excès de sébum',
    reasonHelpsWithAcne: 'Aide les peaux à tendance acnéique',
    reasonAntiAging: 'Bienfaits anti-âge',
    reasonPerfectForCurls: 'Parfait pour les boucles',
    reasonEnhancesWaves: 'Sublime les ondulations naturelles',
    reasonMatchesHairType: 'Correspond à votre type de cheveux',
    reasonNourishesHair: 'Nourrit et répare les cheveux',
    reasonAllNatural: 'Ingrédients 100% naturels',
    reasonGentleFormula: 'Formule douce et clean',
    
    // Profile completion prompts
    completeProfileTitle: 'Parlez-nous de vous',
    completeProfileDesc: 'Complétez votre profil pour obtenir des recommandations personnalisées basées sur votre type de peau, cheveux et objectifs beauté.',
    completeProfile: 'Compléter mon profil',
    
    // Onboarding guide
    guideStep1Title: 'Qu\'est-ce que MASEYA',
    guideStep1Desc: 'MASEYA est votre guide personnel pour le soin naturel de la peau, des cheveux et du bien-être.',
    guideStep2Title: 'Comment ça marche',
    guideStep2Desc: 'Nous personnalisons les recommandations selon votre peau, vos cheveux et vos objectifs.',
    guideStep3Title: 'Rejoignez notre communauté',
    guideStep3Desc: 'Partagez des conseils, découvrez ce qui fonctionne pour d\'autres et grandissez avec des femmes comme vous.',
    guideStep4Title: 'Par où commencer',
    guideStep4Desc: 'Complétez votre profil, suivez votre routine et découvrez des produits faits pour vous.',
    guideStart: 'Commencer mon voyage',
    guideNext: 'Suivant',
    guideSkip: 'Passer',
    
    // Product descriptions - Real products
    weledaSkinFoodDesc: 'Hydratant intensif emblématique aux extraits de plantes et huiles essentielles. Nourrit et protège les peaux très sèches.',
    paiRosehipDesc: 'Huile de rose musquée bio primée avec extraction CO2. Réduit les cicatrices, ridules et unifie le teint.',
    ordinaryNiacinamideDesc: 'Formule haute concentration de vitamines et minéraux pour réduire les imperfections et équilibrer le sébum.',
    olaplexOilDesc: 'Huile coiffante réparatrice ultra-légère qui augmente brillance, douceur et éclat de la couleur.',
    ceraveCleanserDesc: 'Nettoyant doux développé par des dermatologues avec céramides et acide hyaluronique. Sans mousse pour peaux sèches.',
    kloraneHairMaskDesc: 'Masque nourrissant intense au beurre de mangue pour cheveux secs. Répare et adoucit sans alourdir.',
    nuxeOilDesc: 'Huile sèche culte pour visage, corps et cheveux. 98,1% d\'ingrédients naturels dont des huiles botaniques précieuses.',
    renTonicDesc: 'Tonique AHA quotidien à l\'acide lactique et écorce de saule. Exfolie en douceur pour une peau plus lumineuse.',
    moroccanoilDesc: 'Le soin capillaire original à l\'huile d\'argan. Conditionne, démêle et accélère le séchage.',
    realProductNote: 'Ceci est un produit réel disponible sur le marché.',
    
    // Profile edit - additional
    profilePhoto: 'Photo de profil',
    addPhotoHint: 'Ajoutez une photo pour personnaliser votre profil',
    ageRange: 'Tranche d\'âge',
    ageRangeHint: 'Nous aide à recommander des produits adaptés à votre âge',
    sensitivitiesExclusions: 'Sensibilités et exclusions',
    sensitivitiesHint: 'Nous filtrerons les produits contenant ces ingrédients',
    locationClimate: 'Localisation et climat',
    climateHint: 'Le climat affecte les besoins de soins peau et cheveux',
    detectMyLocation: 'Détecter ma position',
    detecting: 'Détection...',
    orSelectManually: 'ou sélectionnez manuellement',
    countryLabel: 'Pays',
    countryPlaceholder: 'ex. France, Maroc, Canada',
    climateTypeLabel: 'Type de climat',
    locationDetected: 'Position détectée !',
    locationFailed: 'Impossible de détecter la position. Veuillez sélectionner manuellement.',
    profileComplete: 'Complété',
    completeProfileForRecommendations: 'Complétez votre profil pour de meilleures recommandations personnalisées',
    maxGoalsAllowed: 'Maximum 3 objectifs autorisés',
    
    // Sensitivities
    fragranceFree: 'Sans parfum',
    sulfateFree: 'Sans sulfates',
    parabenFree: 'Sans parabènes',
    vegan: 'Végan',
    crueltyFree: 'Sans cruauté',
    alcoholFree: 'Sans alcool',
    siliconeFree: 'Sans silicones',
    
    // Climate options
    climateTropical: 'Tropical (chaud et humide)',
    climateDry: 'Sec / Aride',
    climateTemperate: 'Tempéré (doux)',
    climateContinental: 'Continental (étés chauds, hivers froids)',
    climateMediterranean: 'Méditerranéen',
    
    // Chatbot AI
    chatbotError: 'Désolée, je n\'ai pas pu me connecter pour le moment. Réessayez dans un instant. 🌸',
    chatbotRateLimit: 'Je reçois beaucoup de questions en ce moment ! Veuillez patienter un instant avant d\'envoyer un autre message. 💫',
    chatbotTyping: 'Réflexion...',

    // Community translation
    seeOriginal: 'Voir l\'original',
    seeTranslation: 'Voir la traduction',
    translatedFrom: 'Traduit de',
  },
};

export type TranslationKey = keyof typeof translations.en;

export const getTranslation = (lang: Language, key: TranslationKey): string => {
  // First try the selected language
  const translation = translations[lang]?.[key];
  if (translation) return translation;
  
  // For Spanish, don't fall back to English immediately - this ensures Spanish stays consistent
  if (lang === 'es') {
    return translations.es[key] || key;
  }
  
  // Fall back to English, then to the key itself
  return translations.en[key] || key;
};

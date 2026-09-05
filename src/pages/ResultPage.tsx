import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Sparkles, Loader2, Camera, Info, Lock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { lookupProduct, ProductData } from '@/lib/productLookup';
import { toSlimProductData } from '@/lib/slimProduct';
import {
  flagIngredients, calculateScoreBreakdown, calculatePersonalScoreBreakdown, scoreLabel, naturalness, personalAlerts, loadOnboarding,
  isNutritionalData, evaluateDataConfidence, isSupplement, isAlcoholicFood,
  FlaggedIngredient, PersonalAlert,
} from '@/lib/scoring';
import { getVoiceLine } from '@/lib/voiceLines';
import { track } from '@/lib/analytics';
import { inciLabel } from '@/lib/inciLabels';
import { RegistrationSheet } from '@/components/auth/RegistrationSheet';
import { MiraAnalysis } from '@/components/result/MiraAnalysis';
import { Alternatives } from '@/components/result/Alternatives';
import { ScoreBreakdown } from '@/components/result/ScoreBreakdown';
import { NutritionFacts } from '@/components/result/NutritionFacts';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ThumbsFeedback } from '@/components/feedback/ThumbsFeedback';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { toast } from '@/hooks/use-toast';


import { hasHealthDataConsent, getStoredConsent, saveConsent } from '@/components/consent/ConsentModal';
import { buildActiveProfile } from '@/lib/activeProfile';
import { SignupInvite } from '@/components/onboarding/SignupInvite';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HeartPulse } from 'lucide-react';

const COPY = {
  es: {
    volver: 'Volver',
    verFotoGrande: 'Ver foto en grande',
    buscandoInfo: 'Buscando información del producto...',
    analizando: 'Analizando producto...',
    enrichingHint: 'Estamos consultando bases de datos internacionales para encontrar este producto.',
    fueraDeAmbito: 'Fuera de ámbito',
    noEstaEnBaseTitle: 'Este producto no está en nuestra base',
    noEstaEnBaseBody: 'Añádelo con unas fotos y lo analizamos al momento (y ayudas a quien lo escanee después).',
    fotografiarProducto: 'Fotografiar el producto',
    productoNoEncontrado: 'Producto no encontrado',
    fueraDeAmbitoBody: 'Maseya analiza alimentación y cosmética 📚 — este código corresponde a otro tipo de producto.',
    noInfoBody: 'No tenemos información de este producto en nuestras bases.',
    volverAEscanear: 'Volver a escanear',
    fotografiarIngredientes: 'Fotografiar ingredientes',
    fotografiarEtiqueta: 'Fotografiar etiqueta',
    fotografiarTabla: 'Fotografiar tabla nutricional',
    completarConFotos: 'Completar con fotos',
    complemento: 'Complemento alimenticio',
    bebidaAlcoholica: 'Bebida alcohólica',
    alimentacion: 'Alimentación',
    cosmetica: 'Cosmética',
    anadidoBaseDatos: 'Añadido a nuestra base de datos',
    guardadoDispositivo: 'Análisis guardado en tu dispositivo',
    sinNotaComplemento: 'Sin nota (complemento alimenticio)',
    sinNotaAlcohol: 'Sin nota (bebida alcohólica)',
    complementoWarning: 'Los complementos alimenticios no se evalúan con criterios de alimentos (Nutriscore no aplica). Consulta a un profesional sanitario antes de tomarlos.',
    alcoholWarning: 'Maseya no puntúa bebidas alcohólicas — el Nutri-Score no aplica a este tipo de producto.',
    ingredientesTitle: 'Ingredientes',
    esParaTi: '¿Es para ti?',
    ayudanosAnalizar: 'Ayúdanos a analizar este producto',
    ayudanosAnalizarBody: 'Este producto aún no tiene ingredientes en nuestra base de datos. Fotografía la etiqueta y Mira lo analizará al instante.',
    buscarMasTarde: 'También puedes buscar este producto más tarde cuando nuestra base de datos lo incluya.',
    general: 'General',
    paraTi: 'Para ti',
    bloqueoCtaCuenta: 'Crea tu cuenta gratis para ver tu nota personal',
    bloqueoCtaConsent: 'Activa la personalización para ver tu nota personal',
    comoCalculamos: '¿Cómo calculamos la puntuación?',
    generalExplainPre: 'La ',
    generalExplainBold: 'puntuación general',
    generalExplainPost: ' evalúa el producto para el público general (Nutriscore + ingredientes).',
    personalExplainPre: 'La ',
    personalExplainBold: 'puntuación personal',
    personalExplainPost: ' ajusta esa nota según tu perfil: piel, alergias, dieta y objetivos.',
    confAlta: 'Confianza alta',
    confMedia: 'Confianza media',
    confBaja: 'Confianza baja',
    faltaPrefix: 'Falta: ',
    ctaMissingIngredients: 'Nota provisional — fotografía la lista de ingredientes para completar el análisis',
    ctaFoodNutrition: 'Nota provisional — fotografía la tabla nutricional para desbloquear la nota completa',
    ctaCosmeticIngredients: 'Nota provisional — fotografía la lista de ingredientes completa para desbloquear la nota completa',
    fotografiar: 'Fotografiar',
    whyGeneral: '¿Por qué esta nota general?',
    whyPersonal: '¿Por qué tu nota personal?',
    incompleteBold: 'Análisis incompleto:',
    incompleteIngredientsRest: ' esta nota se basa solo en los valores nutricionales. Fotografía la lista de ingredientes para completarlo.',
    incompleteNutritionRest: ' falta la información nutricional. Fotografía la tabla nutricional para completarlo.',
    incompleteBothRest: ' faltan la lista de ingredientes y la información nutricional. Completa el análisis con fotos.',
    sinDatos: 'Sin datos',
    datosInsuficientes: 'Datos insuficientes',
    fotografiaParaPuntuacion: 'Fotografía la etiqueta para obtener tu puntuación personalizada.',
    ingredientesGenerales: 'Ingredientes generales',
    sinListaIngredientes: 'Sin lista de ingredientes disponible para este producto. Puedes fotografiar la etiqueta para un análisis completo.',
    esNatural: '¿Es natural?',
    datosInsuficientesNatural: 'Datos insuficientes — fotografía la etiqueta para calcular naturalidad',
    ingredientesLimpios: 'Ingredientes limpios',
    ingredientesOtroIdioma: 'Ingredientes en el idioma del envase original',
    bioOrganico: 'Bio / Orgánico',
    activaPersonalizacion: 'Activa la personalización para saber si este producto es adecuado para tu perfil.',
    activarPersonalizacion: 'Activar personalización',
    noIncompatibilidades: 'No hemos detectado incompatibilidades con tu perfil. Verifica siempre el etiquetado.',
    fotografiaParaTi: 'Fotografía la etiqueta para ver si este producto es adecuado para ti.',
    avisoBold: 'Aviso: ',
    avisoBody: 'Maseya ofrece información orientativa basada en datos públicos y en tu perfil. No sustituye el consejo de un médico, dermatólogo o nutricionista. Si tienes alergias graves, verifica siempre el etiquetado oficial del producto.',
    feedbackLink: '¿Algo no cuadra en este análisis? Cuéntanoslo',
    consentBody: 'Acepto el tratamiento de mis datos de salud (alergias, tipo de piel, embarazo) para personalizar los análisis.',
    consentNotePre: 'Sin este consentimiento la app sigue funcionando, pero solo con análisis generales. Puedes cambiarlo en cualquier momento.',
    politicaPrivacidad: 'Política de privacidad',
    ahoraNo: 'Ahora no',
    acepto: 'Acepto',
    nutritionRejected: 'No pudimos leer la tabla con seguridad — puedes reintentarlo desde el resultado.',
  },
  en: {
    volver: 'Back',
    verFotoGrande: 'View full-size photo',
    buscandoInfo: 'Looking up product information...',
    analizando: 'Analyzing product...',
    enrichingHint: "We're checking international databases to find this product.",
    fueraDeAmbito: 'Out of scope',
    noEstaEnBaseTitle: "This product isn't in our database",
    noEstaEnBaseBody: 'Add it with a few photos and we analyze it right away (and help whoever scans it next).',
    fotografiarProducto: 'Photograph the product',
    productoNoEncontrado: 'Product not found',
    fueraDeAmbitoBody: 'Maseya analyzes food and cosmetics 📚 — this barcode belongs to another type of product.',
    noInfoBody: "We don't have information on this product in our databases.",
    volverAEscanear: 'Scan again',
    fotografiarIngredientes: 'Photograph ingredients',
    fotografiarEtiqueta: 'Photograph label',
    fotografiarTabla: 'Photograph nutrition table',
    completarConFotos: 'Complete with photos',
    complemento: 'Dietary supplement',
    bebidaAlcoholica: 'Alcoholic drink',
    alimentacion: 'Food',
    cosmetica: 'Cosmetics',
    anadidoBaseDatos: 'Added to our database',
    guardadoDispositivo: 'Analysis saved on your device',
    sinNotaComplemento: 'No score (dietary supplement)',
    sinNotaAlcohol: 'No score (alcoholic drink)',
    complementoWarning: 'Dietary supplements are not evaluated with food criteria (Nutriscore does not apply). Consult a healthcare professional before taking them.',
    alcoholWarning: "Maseya doesn't score alcoholic drinks — Nutri-Score doesn't apply to this type of product.",
    ingredientesTitle: 'Ingredients',
    esParaTi: 'Is this for you?',
    ayudanosAnalizar: 'Help us analyze this product',
    ayudanosAnalizarBody: "This product doesn't have ingredients in our database yet. Photograph the label and Mira will analyze it instantly.",
    buscarMasTarde: 'You can also search for this product later once our database includes it.',
    general: 'General',
    paraTi: 'For you',
    bloqueoCtaCuenta: 'Create your free account to see your personal score',
    bloqueoCtaConsent: 'Turn on personalization to see your personal score',
    comoCalculamos: 'How do we calculate the score?',
    generalExplainPre: 'The ',
    generalExplainBold: 'general score',
    generalExplainPost: ' evaluates the product for the general public (Nutriscore + ingredients).',
    personalExplainPre: 'The ',
    personalExplainBold: 'personal score',
    personalExplainPost: ' adjusts that score to your profile: skin, allergies, diet and goals.',
    confAlta: 'High confidence',
    confMedia: 'Medium confidence',
    confBaja: 'Low confidence',
    faltaPrefix: 'Missing: ',
    ctaMissingIngredients: 'Provisional score — photograph the ingredient list to complete the analysis',
    ctaFoodNutrition: 'Provisional score — photograph the nutrition table to unlock the full score',
    ctaCosmeticIngredients: 'Provisional score — photograph the full ingredient list to unlock the full score',
    fotografiar: 'Photograph',
    whyGeneral: 'Why this general score?',
    whyPersonal: 'Why your personal score?',
    incompleteBold: 'Incomplete analysis:',
    incompleteIngredientsRest: ' this score is based only on nutrition values. Photograph the ingredient list to complete it.',
    incompleteNutritionRest: ' nutrition information is missing. Photograph the nutrition table to complete it.',
    incompleteBothRest: ' the ingredient list and nutrition information are missing. Complete the analysis with photos.',
    sinDatos: 'No data',
    datosInsuficientes: 'Insufficient data',
    fotografiaParaPuntuacion: 'Photograph the label to get your personalized score.',
    ingredientesGenerales: 'General ingredients',
    sinListaIngredientes: "No ingredient list available for this product. You can photograph the label for a complete analysis.",
    esNatural: 'Is it natural?',
    datosInsuficientesNatural: 'Insufficient data — photograph the label to calculate naturalness',
    ingredientesLimpios: 'Clean ingredients',
    ingredientesOtroIdioma: 'Ingredients in the language of the original packaging',
    bioOrganico: 'Organic',
    activaPersonalizacion: 'Turn on personalization to know if this product suits your profile.',
    activarPersonalizacion: 'Turn on personalization',
    noIncompatibilidades: "We haven't detected incompatibilities with your profile. Always check the label.",
    fotografiaParaTi: 'Photograph the label to see if this product suits you.',
    avisoBold: 'Notice: ',
    avisoBody: "Maseya offers guidance based on public data and your profile. It doesn't replace advice from a doctor, dermatologist or nutritionist. If you have severe allergies, always check the official product label.",
    feedbackLink: "Something off in this analysis? Tell us",
    consentBody: 'I agree to the processing of my health data (allergies, skin type, pregnancy) to personalize the analyses.',
    consentNotePre: 'Without this consent the app still works, but only with general analyses. You can change this at any time.',
    politicaPrivacidad: 'Privacy policy',
    ahoraNo: 'Not now',
    acepto: 'I agree',
    nutritionRejected: "We couldn't read the nutrition table reliably — you can try again from the result.",
  },
  fr: {
    volver: 'Retour',
    verFotoGrande: 'Voir la photo en grand',
    buscandoInfo: 'Recherche des informations du produit...',
    analizando: 'Analyse du produit...',
    enrichingHint: 'Nous consultons des bases de données internationales pour trouver ce produit.',
    fueraDeAmbito: 'Hors périmètre',
    noEstaEnBaseTitle: "Ce produit n'est pas dans notre base",
    noEstaEnBaseBody: "Ajoute-le avec quelques photos et on l'analyse tout de suite (et tu aides la prochaine personne qui le scanne).",
    fotografiarProducto: 'Photographier le produit',
    productoNoEncontrado: 'Produit non trouvé',
    fueraDeAmbitoBody: 'Maseya analyse l’alimentation et les cosmétiques 📚 — ce code correspond à un autre type de produit.',
    noInfoBody: "Nous n'avons pas d'informations sur ce produit dans nos bases.",
    volverAEscanear: 'Scanner à nouveau',
    fotografiarIngredientes: 'Photographier les ingrédients',
    fotografiarEtiqueta: "Photographier l'étiquette",
    fotografiarTabla: 'Photographier le tableau nutritionnel',
    completarConFotos: 'Compléter avec des photos',
    complemento: 'Complément alimentaire',
    bebidaAlcoholica: 'Boisson alcoolisée',
    alimentacion: 'Alimentation',
    cosmetica: 'Cosmétique',
    anadidoBaseDatos: 'Ajouté à notre base de données',
    guardadoDispositivo: 'Analyse enregistrée sur ton appareil',
    sinNotaComplemento: 'Sans note (complément alimentaire)',
    sinNotaAlcohol: 'Sans note (boisson alcoolisée)',
    complementoWarning: "Les compléments alimentaires ne sont pas évalués avec les critères des aliments (le Nutriscore ne s'applique pas). Consulte un professionnel de santé avant d'en prendre.",
    alcoholWarning: "Maseya ne note pas les boissons alcoolisées — le Nutri-Score ne s'applique pas à ce type de produit.",
    ingredientesTitle: 'Ingrédients',
    esParaTi: 'Est-ce fait pour toi ?',
    ayudanosAnalizar: 'Aide-nous à analyser ce produit',
    ayudanosAnalizarBody: "Ce produit n'a pas encore d'ingrédients dans notre base de données. Photographie l'étiquette et Mira l'analysera instantanément.",
    buscarMasTarde: "Tu peux aussi rechercher ce produit plus tard, une fois qu'il sera intégré à notre base de données.",
    general: 'Général',
    paraTi: 'Pour toi',
    bloqueoCtaCuenta: "Crée ton compte gratuit pour voir ta note personnelle",
    bloqueoCtaConsent: "Active la personnalisation pour voir ta note personnelle",
    comoCalculamos: 'Comment calculons-nous la note ?',
    generalExplainPre: 'La ',
    generalExplainBold: 'note générale',
    generalExplainPost: ' évalue le produit pour le grand public (Nutriscore + ingrédients).',
    personalExplainPre: 'La ',
    personalExplainBold: 'note personnelle',
    personalExplainPost: ' ajuste cette note selon ton profil : peau, allergies, régime et objectifs.',
    confAlta: 'Confiance élevée',
    confMedia: 'Confiance moyenne',
    confBaja: 'Confiance faible',
    faltaPrefix: 'Manque : ',
    ctaMissingIngredients: "Note provisoire — photographie la liste des ingrédients pour compléter l'analyse",
    ctaFoodNutrition: 'Note provisoire — photographie le tableau nutritionnel pour débloquer la note complète',
    ctaCosmeticIngredients: 'Note provisoire — photographie la liste complète des ingrédients pour débloquer la note complète',
    fotografiar: 'Photographier',
    whyGeneral: 'Pourquoi cette note générale ?',
    whyPersonal: 'Pourquoi ta note personnelle ?',
    incompleteBold: 'Analyse incomplète :',
    incompleteIngredientsRest: " cette note repose uniquement sur les valeurs nutritionnelles. Photographie la liste des ingrédients pour la compléter.",
    incompleteNutritionRest: " les informations nutritionnelles manquent. Photographie le tableau nutritionnel pour le compléter.",
    incompleteBothRest: " la liste des ingrédients et les informations nutritionnelles manquent. Complète l'analyse avec des photos.",
    sinDatos: 'Aucune donnée',
    datosInsuficientes: 'Données insuffisantes',
    fotografiaParaPuntuacion: "Photographie l'étiquette pour obtenir ta note personnalisée.",
    ingredientesGenerales: 'Ingrédients généraux',
    sinListaIngredientes: "Aucune liste d'ingrédients disponible pour ce produit. Tu peux photographier l'étiquette pour une analyse complète.",
    esNatural: 'Est-ce naturel ?',
    datosInsuficientesNatural: "Données insuffisantes — photographie l'étiquette pour calculer la naturalité",
    ingredientesLimpios: 'Ingrédients propres',
    ingredientesOtroIdioma: "Ingrédients dans la langue de l'emballage d'origine",
    bioOrganico: 'Bio / Biologique',
    activaPersonalizacion: 'Active la personnalisation pour savoir si ce produit convient à ton profil.',
    activarPersonalizacion: 'Activer la personnalisation',
    noIncompatibilidades: "Nous n'avons détecté aucune incompatibilité avec ton profil. Vérifie toujours l'étiquetage.",
    fotografiaParaTi: "Photographie l'étiquette pour voir si ce produit te convient.",
    avisoBold: 'Avis : ',
    avisoBody: "Maseya propose des informations indicatives basées sur des données publiques et ton profil. Cela ne remplace pas l'avis d'un médecin, dermatologue ou nutritionniste. En cas d'allergies graves, vérifie toujours l'étiquetage officiel du produit.",
    feedbackLink: 'Quelque chose ne va pas dans cette analyse ? Dis-le-nous',
    consentBody: "J'accepte le traitement de mes données de santé (allergies, type de peau, grossesse) pour personnaliser les analyses.",
    consentNotePre: "Sans ce consentement, l'application continue de fonctionner, mais uniquement avec des analyses générales. Tu peux le modifier à tout moment.",
    politicaPrivacidad: 'Politique de confidentialité',
    ahoraNo: 'Pas maintenant',
    acepto: "J'accepte",
    nutritionRejected: "Nous n'avons pas pu lire le tableau nutritionnel avec certitude — vous pouvez réessayer depuis le résultat.",
  },
};

/**
 * Locked "Para ti" circle for users without active personalization (no
 * account/profile, or no health-data consent). Shows a lock instead of a
 * number so the product page never implies personalization works when it
 * doesn't. Fires `personal_score_locked_view` once on mount.
 */
const LockedCircle = ({ label }: { label: string }) => {
  useEffect(() => {
    track('personal_score_locked_view');
  }, []);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-warm-lg ring-4 ring-muted-foreground/15 bg-muted/50 text-muted-foreground">
        <Lock className="w-10 h-10" aria-hidden />
      </div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    </div>
  );
};

/**
 * Neutral placeholder while the session/consent state is still resolving.
 * Never a lock and never a number: a freshly registered user must not see the
 * "create an account" lock for a few hundred milliseconds.
 */
const PendingCircle = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-muted/40 ring-4 ring-muted-foreground/10 animate-pulse" />
    <div className="text-xs font-semibold text-muted-foreground">{label}</div>
  </div>
);

const ResultPage = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const skipHistory = (location.state as { skipHistory?: boolean } | null)?.skipHistory === true;
  const { isAuthenticated, currentUser, consentReady } = useAuth();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  

  const [fromPhoto, setFromPhoto] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [healthConsent, setHealthConsent] = useState<boolean>(() => hasHealthDataConsent());
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  // Re-evaluate consent when auth hydrates (DB→localStorage sync from AuthContext)
  // or when the user grants it in another tab/component.
  useEffect(() => {
    const refresh = () => setHealthConsent(hasHealthDataConsent());
    refresh();
    window.addEventListener('maseya:consent-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('maseya:consent-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [currentUser?.id]);

  // Toast when arriving after a rejected nutrition-table extraction, so the
  // user knows why the confidence cap is still there.
  useEffect(() => {
    try {
      const flag = localStorage.getItem('maseya_nutrition_rejected');
      if (flag) {
        localStorage.removeItem('maseya_nutrition_rejected');
        toast({ description: c.nutritionRejected });
      }
    } catch {}
  }, [user.language]);



  const grantHealthConsent = async () => {
    const current = getStoredConsent();
    saveConsent({
      analytics: !!current?.analytics,
      personalization: current?.personalization ?? true,
      health_data: true,
      date: new Date().toISOString(),
    });
    setHealthConsent(true);
    setShowConsentDialog(false);
    if (currentUser?.id) {
      try {
        await supabase
          .from('profiles')
          .update({
            consent_analytics: !!current?.analytics,
            consent_personalization: current?.personalization ?? true,
            consent_health_data: true,
            consent_date: new Date().toISOString(),
          })
          .eq('user_id', currentUser.id);
      } catch (e) {
        console.error('[consent] db sync failed', e);
      }
    }
  };

  useEffect(() => {
    if (!currentUser?.id) {
      // Fallback to localStorage onboarding data
      try {
        const raw = localStorage.getItem('maseya_onboarding');
        if (raw) setHealthProfile(JSON.parse(raw));
      } catch {}
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setHealthProfile(buildActiveProfile(data as Record<string, unknown>));
      } else {
        try {
          const raw = localStorage.getItem('maseya_onboarding');
          if (raw) setHealthProfile(JSON.parse(raw));
        } catch {}
      }
    };
    load();
    // Reload when the user updates their profile in another screen — otherwise
    // an allergy change (e.g. lactose → gluten) doesn't take effect on a
    // ResultPage that's still mounted from a previous scan.
    const onUpdated = () => { load(); };
    window.addEventListener('maseya:profile-updated', onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('maseya:profile-updated', onUpdated);
    };
  }, [currentUser?.id]);


  useEffect(() => {
    // Clear the previous product BEFORE looking up the new barcode. Without
    // this, scanning a second code kept the previous sheet on screen while the
    // new lookup was in flight, which read as "this product has nothing to do
    // with what I scanned".
    setProduct(null);
    setNotFound(false);
    setEnriching(false);
    setFromPhoto(false);
    setPhotoSaved(false);
    setLoading(true);

    if (!barcode) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const loadFromPhotoLocalStorage = (matchBarcode?: string): boolean => {
      try {
        const raw = localStorage.getItem('maseya_photo_product');
        if (!raw) return false;
        const p = JSON.parse(raw);
        if (matchBarcode && p.barcode !== matchBarcode) return false;
        const cat: ProductData['category'] =
          p.category === 'food' ? 'food' : p.category === 'cosmetic' ? 'cosmetic' : 'unknown';
        const categoryTag = typeof p.category_tag === 'string' && /^en:[a-z0-9-]+$/.test(p.category_tag)
          ? p.category_tag
          : null;
        const rawObj: Record<string, unknown> = { ...p };
        if (categoryTag) rawObj.categories_tags = [categoryTag];
        if (p.nutriments && typeof p.nutriments === 'object') rawObj.nutriments = p.nutriments;
        setProduct({
          barcode: p.barcode,
          source: 'photo',
          name: p.product_name || 'Producto fotografiado',
          brand: p.brand || '',
          image: p.image || null,
          category: cat,
          nutriscore_grade: null,
          ingredients_text: p.ingredients_text || null,
          ingredients_tags: [],
          labels_tags: [],
          ingredients_analysis_tags: [],
          allergens_tags: [],
          traces_tags: [],
          raw: rawObj,
        });

        setFromPhoto(true);
        setPhotoSaved(p.saved === true);
        setLoading(false);

        return true;
      } catch (e) {
        console.error('[result] photo parse failed', e);
        return false;
      }
    };

    if (barcode === 'photo') {
      if (!loadFromPhotoLocalStorage()) {
        setNotFound(true);
        setLoading(false);
      }
      return;
    }

    // Out-of-scope barcodes: ISBN (978/979) and ISSN (977) are books/press.
    // Short-circuit BEFORE hitting the network so users get a clear message.
    if (/^97[789]/.test(barcode)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Freshly photographed data (ingredients / nutrition) for THIS barcode.
    // The public lookup can win the race and return a stale/incomplete entry,
    // which is why the user kept seeing "photograph the ingredients" right
    // after finishing the photo flow. Merge the fresh capture on top.
    const mergeFreshPhoto = (data: ProductData): ProductData => {
      try {
        const raw = localStorage.getItem('maseya_photo_product');
        if (!raw) return data;
        const p = JSON.parse(raw);
        if (!p || p.barcode !== data.barcode) return data;
        const freshIng = typeof p.ingredients_text === 'string' ? p.ingredients_text.trim() : '';
        const currentIng = (data.ingredients_text || '').trim();
        const rawObj: Record<string, unknown> = { ...data.raw };
        if (p.nutriments && typeof p.nutriments === 'object' && !rawObj.nutriments) {
          rawObj.nutriments = p.nutriments;
        }
        const useFresh = freshIng.length > currentIng.length;
        if (!useFresh && rawObj.nutriments === data.raw?.nutriments) return data;
        if (useFresh || (p.nutriments && typeof p.nutriments === 'object')) setFromPhoto(true);
        return {
          ...data,
          ingredients_text: useFresh ? freshIng : data.ingredients_text,
          image: data.image || p.image || null,
          raw: rawObj,
        };
      } catch (e) {
        console.error('[result] fresh photo merge failed', e);
        return data;
      }
    };

    let cancelled = false;
    (async () => {
      const data = await lookupProduct(barcode, user.language);
      if (cancelled) return;
      if (data) {
        track('scan_success', { barcode, source: data.source, category: data.category });
        setProduct(mergeFreshPhoto(data));
        setLoading(false);
        return;
      }

      // Lookup failed. Try local photo capture (race with server upsert) BEFORE
      // enriching — if the user just photographed this exact barcode we already
      // have everything we need in localStorage.
      if (loadFromPhotoLocalStorage(barcode)) return;
      // Real-time enrichment fallback.
      setEnriching(true);
      try {
        await supabase.functions.invoke('enrich-products', { body: { barcode } });
      } catch (e) {
        console.error('[result] enrich error', e);
      }
      if (cancelled) return;
      const retry = await lookupProduct(barcode, user.language);
      if (cancelled) return;
      setEnriching(false);
      if (!retry) {
        if (loadFromPhotoLocalStorage(barcode)) return;
        track('scan_not_found', { barcode });
        setNotFound(true);
        setLoading(false);
        return;
      }
      track('scan_success', { barcode, source: retry.source, category: retry.category });
      setProduct(mergeFreshPhoto(retry));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [barcode]);


  // Persist + soft paywall logic. Guarded so it only fires ONCE per product,
  // regardless of how many times deps like isAuthenticated/currentUser?.id
  // hydrate (previously this incremented the anon counter multiple times and
  // could also toggle showSheet back and forth on re-renders).
  // Anonymous usage event: a product sheet was rendered. No personal data.
  const viewTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product) return;
    const key = product.barcode || product.name;
    if (viewTrackedRef.current === key) return;
    viewTrackedRef.current = key;
    const conf = evaluateDataConfidence(product);
    const hasScore = product.category === 'cosmetic'
      ? !!product.ingredients_text
      : (!!product.nutriscore_grade || !!product.ingredients_text);
    track('result_view', { category: product.category, has_score: hasScore, confidence: conf.level });
  }, [product]);

  const persistedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product) return;
    if (skipHistory) return;
    // Wait until we know the auth state (avoids racing anon-vs-authed writes).
    if (isAuthenticated && !currentUser?.id) return;
    const key = `${product.barcode}::${isAuthenticated ? currentUser?.id : 'anon'}`;
    if (persistedRef.current === key) return;
    persistedRef.current = key;

    const flagged = flagIngredients(product);
    const score = calculateScoreBreakdown(product, flagged).score;
    if (product.barcode && product.barcode !== 'photo') {
      supabase.rpc('increment_product_scan_count', { p_barcode: product.barcode })
        .then(({ error }) => { if (error) console.warn('[scan_count]', error.message); });
    }

    if (isAuthenticated && currentUser?.id) {
      supabase.from('scan_history').insert([{
        user_id: currentUser.id,
        barcode: product.barcode,
        product_name: product.name,
        // Never persist base64 data URLs (they used to bloat the table).
        product_image: product.image && !product.image.startsWith('data:')
          ? product.image
          : null,
        category: product.category,
        source: product.source,
        product_data: JSON.parse(JSON.stringify(toSlimProductData(product))),
        scores: { global: score },
      }]).then(({ error }) => {
        if (error) console.error('[scan_history] insert', error);
      });
    } else {
      const ck = 'maseya_anon_scans';
      const count = Number(localStorage.getItem(ck) || '0') + 1;
      localStorage.setItem(ck, String(count));
      if (count >= 5) {
        const lastShown = Number(localStorage.getItem('maseya_regsheet_shown_at') || '0');
        const dayMs = 24 * 60 * 60 * 1000;
        if (Date.now() - lastShown > dayMs) {
          localStorage.setItem('maseya_regsheet_shown_at', String(Date.now()));
          setTimeout(() => setShowSheet(true), 400);
        }
      }
    }
  }, [product, isAuthenticated, currentUser?.id, skipHistory]);


  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {enriching ? c.buscandoInfo : c.analizando}
        </p>
        {enriching && (
          <p className="text-xs text-muted-foreground/80 max-w-xs">
            {c.enrichingHint}
          </p>
        )}
      </div>
    );
  }

  if (notFound || !product) {
    const isBookOrPress = !!barcode && /^97[789]/.test(barcode);
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pt-safe">
          <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))} aria-label={c.volver}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-semibold">
              {isBookOrPress ? c.fueraDeAmbito : c.noEstaEnBaseTitle}
            </h1>
          </div>
        </header>
        <div className="w-full sm:max-w-lg sm:mx-auto p-6 space-y-4 text-center">
          <p className="text-muted-foreground">
            {isBookOrPress
              ? c.fueraDeAmbitoBody
              : c.noEstaEnBaseBody}
          </p>
          {isBookOrPress ? (
            <Button onClick={() => navigate('/scan', { replace: true })} className="w-full h-12 rounded-2xl">
              {c.volverAEscanear}
            </Button>
          ) : (
            <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo', { replace: true })} className="w-full h-12 rounded-2xl">
              <Camera className="w-4 h-4 mr-2" />
              {c.fotografiarProducto}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const flagged = flagIngredients(product);
  const supplement = product.category === 'food' && isSupplement(product);
  const alcoholic = product.category === 'food' && !supplement && isAlcoholicFood(product);
  const nonScorable = supplement || alcoholic;
  const scoreBreakdown = nonScorable
    ? { score: 0, factors: [] as ReturnType<typeof calculateScoreBreakdown>['factors'] }
    : calculateScoreBreakdown(product, flagged);
  const score = scoreBreakdown.score;
  const sl = scoreLabel(score);
  const nat = naturalness(product, flagged);
  const dataConfidence = evaluateDataConfidence(product);
  // What's actually missing — drives the single "incomplete analysis" notice.
  // IMPORTANT: this must NOT be derived from dataConfidence.level. A product with
  // no ingredients and no nutrition returns level 'none' (cap 40), and a food with
  // a Nutri-Score grade but no per-100 g table returns level 'high' with an empty
  // `missing` list — both cases left the user without any photo CTA (real reports:
  // "Atún en aceite de girasol" 40/40, unnamed product 40/40).
  // Rule: if the ingredient list OR the nutrition table is missing, always warn.
  const rawNutriments = ((product.raw || {}) as Record<string, unknown>).nutriments;
  const nutrimentsObj = (rawNutriments && typeof rawNutriments === 'object')
    ? rawNutriments as Record<string, unknown>
    : {};
  const hasNutrimentValue = (...keys: string[]) =>
    keys.some(k => {
      const v = nutrimentsObj[k];
      const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
      return typeof n === 'number' && Number.isFinite(n);
    });
  const hasNutritionTable = hasNutrimentValue('energy-kcal_100g', 'energy-kj_100g')
    && hasNutrimentValue('saturated-fat_100g')
    && hasNutrimentValue('sugars_100g')
    && hasNutrimentValue('salt_100g', 'sodium_100g');
  const ingredientsRawText = (product.ingredients_text || '').trim();
  const missingIngredients = product.category === 'cosmetic'
    ? dataConfidence.level !== 'high'
    : !(ingredientsRawText.length > 0 && !isNutritionalData(ingredientsRawText));
  const missingNutrition = product.category === 'food' && !hasNutritionTable;
  const needsPhoto = missingIngredients || missingNutrition;
  const profile = loadOnboarding();
  // The personal layer is a registered-user feature. Anonymous users who already
  // had a local profile from before this gate keep working exactly as before.
  const personalAllowed = !!currentUser?.id || (Array.isArray((profile as { skin?: unknown } | null)?.skin) && ((profile as { skin?: unknown[] }).skin?.length ?? 0) > 0);
  const activeProfile = buildActiveProfile(healthProfile, profile as unknown as Record<string, unknown>, user.language);
  const alerts = healthConsent && personalAllowed ? personalAlerts(product, activeProfile) : [];
  const personalBreakdown = healthConsent && personalAllowed && !nonScorable
    ? calculatePersonalScoreBreakdown(product, flagged, activeProfile, score)
    : null;
  const personalScore = personalBreakdown ? personalBreakdown.score : score;
  const psl = scoreLabel(personalScore);
  // Personalization is active only when a real personal breakdown was computed
  // (consent + allowed profile). Otherwise the "Para ti" circle shows a lock.
  const personalizationActive = !!personalBreakdown;
  // Session/consent still resolving (or the health profile not loaded yet for a
  // signed-in user) → show a neutral placeholder instead of the lock.
  const personalizationPending = !personalizationActive
    && (!consentReady || (!!currentUser?.id && healthProfile === null));
  // Voice line: suppressed for supplements. For alcoholic we still want the
  // rotating one-liner (getVoiceLine already handles halal/pregnancy exclusions).
  const voiceLine = supplement ? null : getVoiceLine(
    product,
    score,
    healthConsent && personalBreakdown ? personalScore : null,
    healthConsent ? (healthProfile || loadOnboarding()) : null,
    user.language,
    dataConfidence.level === 'high' && dataConfidence.cap == null,
  );
  const rawText = (product.ingredients_text || '').trim();
  // Ingredient list shown in a language the user did not choose (OFF stores
  // the list per language and the generic field can be in any of them).
  const uiLang = (user.language || 'es').slice(0, 2).toLowerCase();
  const ingLang = (product.ingredients_lang || '').slice(0, 2).toLowerCase();
  const nonLatinScript = /[\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF\u3040-\u30FF\u0590-\u05FF]/.test(rawText);
  const ingredientsForeign = rawText.length > 0 && (nonLatinScript || (!!ingLang && ingLang !== uiLang));
  const hasIngredientData = product.category === 'cosmetic'
    ? flagged.length >= 3
    : (flagged.length >= 1 || (rawText.length > 0 && !isNutritionalData(rawText)));
  const hasNutriscore = product.category === 'food' && !!product.nutriscore_grade;
  const showScore = !nonScorable && (product.category === 'cosmetic'
    ? hasIngredientData
    : (hasNutriscore || hasIngredientData));

  // Best-effort first name for Mira personalization (only when consented).
  const firstName = (() => {
    const nick = (user.nickname || '').trim();
    if (nick) return nick.split(/\s+/)[0];
    const meta = (currentUser as { user_metadata?: Record<string, unknown> } | null)?.user_metadata;
    const full = typeof meta?.full_name === 'string' ? meta.full_name : (typeof meta?.name === 'string' ? meta.name : '');
    const first = full.trim().split(/\s+/)[0];
    return first || null;
  })();
  const topPersonalAlerts = alerts
    .filter(a => a.level === 'danger' || a.level === 'warn')
    .slice(0, 3)
    .map(a => a.text);

  const badgeVariant = (lvl: FlaggedIngredient['level']) =>
    lvl === 'avoid' ? 'bg-[#E63946] text-white'
      : lvl === 'caution' ? 'bg-[#F4A261] text-white'
      : 'bg-[#95D5B2] text-[#1B1B1B]';

  const alertColor = (lvl: PersonalAlert['level']) =>
    lvl === 'danger' ? 'bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]'
      : lvl === 'warn' ? 'bg-[#F4A261]/10 border-[#F4A261]/40 text-[#8a4a1e]'
      : 'bg-[#95D5B2]/15 border-[#2D6A4F]/30 text-[#2D6A4F]';

  const alertIcon = (lvl: PersonalAlert['level']) =>
    lvl === 'danger' ? '🚨' : lvl === 'warn' ? '⚠️' : '✅';

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pt-safe">
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))} aria-label={c.volver}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          
        </div>
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-card rounded-3xl p-5 border border-border flex gap-4">
          {product.image ? (
            <button
              type="button"
              onClick={() => setShowImageLightbox(true)}
              className="shrink-0 rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label={c.verFotoGrande}
            >
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="w-20 h-20 rounded-2xl object-cover bg-muted transition-transform active:scale-95"
              />
            </button>
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <span className="font-display font-bold text-primary text-2xl">
                {(product.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold leading-tight">{product.name}</p>
            {product.brand && <p className="text-xs text-muted-foreground mt-1 truncate">{product.brand}</p>}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
              {supplement ? c.complemento
                : alcoholic ? c.bebidaAlcoholica
                : (product.category === 'food' ? c.alimentacion : c.cosmetica)}
            </p>
            {fromPhoto && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {photoSaved ? (
                  <><span>✅</span><span>{c.anadidoBaseDatos}</span></>
                ) : (
                  <><span>📱</span><span>{c.guardadoDispositivo}</span></>
                )}
              </div>
            )}

          </div>
        </div>

        {nonScorable ? (
          <>
            <div className="rounded-2xl border border-[#F4A261]/50 bg-[#F4A261]/10 p-4 text-sm text-[#8a4a1e] leading-relaxed space-y-1">
              <p className="font-semibold">
                {supplement ? c.sinNotaComplemento : c.sinNotaAlcohol}
              </p>
              <p>
                {supplement
                  ? c.complementoWarning
                  : c.alcoholWarning}
              </p>
            </div>

            {voiceLine && (
              <p className="text-center text-xs italic text-muted-foreground">{voiceLine}</p>
            )}
            {hasIngredientData && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2">🧪 {c.ingredientesTitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {flagged.slice(0, 20).map((f, i) => {
                    const es = inciLabel(f.name);
                    return (
                      <Badge key={i} className={`${f.level === 'avoid' ? 'bg-[#E63946] text-white' : f.level === 'caution' ? 'bg-[#F4A261] text-white' : 'bg-[#95D5B2] text-[#1B1B1B]'} font-normal capitalize`}>
                        {f.name}{es ? ` (${es})` : ''}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            {healthConsent && alerts.length > 0 && (
              <div className="bg-card rounded-2xl border-2 border-primary/40 p-4 space-y-2">
                <p className="font-semibold flex items-center gap-2">👤 {c.esParaTi}</p>
                {alerts.map((a, i) => (
                  <div key={i} className={`flex gap-2 items-start p-3 rounded-xl border ${a.level === 'danger' ? 'bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]' : a.level === 'warn' ? 'bg-[#F4A261]/10 border-[#F4A261]/40 text-[#8a4a1e]' : 'bg-[#95D5B2]/15 border-[#2D6A4F]/30 text-[#2D6A4F]'}`}>
                    <span className="text-base leading-none">{a.level === 'danger' ? '🚨' : a.level === 'warn' ? '⚠️' : '✅'}</span>
                    <span className="text-sm flex-1">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Mira does not analyze supplements or alcoholic beverages:
                these are explicitly out of the Nutri-Score scope, and running
                the AI review here misleads users into thinking Maseya rates
                them like regular food/cosmetics. */}

          </>
        ) : product.category === 'cosmetic' && !hasIngredientData ? (
          <>
            <div className="bg-card rounded-3xl p-6 border border-border flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold">{c.ayudanosAnalizar}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {c.ayudanosAnalizarBody}
              </p>
              <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo', { replace: true })} className="w-full h-12 rounded-2xl">
                <Camera className="w-4 h-4 mr-2" />
                {c.fotografiarEtiqueta}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              {c.buscarMasTarde}
            </p>
          </>
        ) : (
          <>
            {/* Score */}
            <div className="flex flex-col items-center gap-3">
              {showScore ? (
                <>
                  <div className="flex items-end justify-center gap-4">
                    {/* General score (free) */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-warm"
                        style={{ backgroundColor: sl.bg, color: sl.color }}
                      >
                        <div className="text-3xl font-bold">{score}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-90">/ 100</div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">{c.general}</div>
                    </div>

                    {/* Personal score — real number when personalization is
                        active; otherwise a locked circle so the page never
                        implies personalization works without a profile. */}
                    {personalizationActive ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-warm-lg ring-4 ring-primary/40"
                          style={{ backgroundColor: psl.bg, color: psl.color }}
                        >
                          <div className="text-4xl font-bold">{personalScore}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-90">/ 100</div>
                        </div>
                        <div className="text-xs font-semibold text-primary">{c.paraTi}</div>
                      </div>
                    ) : personalizationPending ? (
                      <PendingCircle label={c.paraTi} />
                    ) : (
                      <LockedCircle label={c.paraTi} />
                    )}
                  </div>

                  {!personalizationActive && !personalizationPending && (
                    <button
                      type="button"
                      onClick={() => {
                        track('personal_score_locked_click');
                        document.getElementById('es-para-ti')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="text-xs text-primary underline underline-offset-2 text-center max-w-xs"
                    >
                      {!personalAllowed ? c.bloqueoCtaCuenta : c.bloqueoCtaConsent}
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <div className="font-display text-lg font-semibold" style={{ color: psl.bg }}>{psl.label}</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={c.comoCalculamos}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-sm" align="center">
                        <p className="font-display font-semibold mb-2">{c.comoCalculamos}</p>
                        <p className="text-muted-foreground leading-relaxed">
                          {c.generalExplainPre}<strong>{c.generalExplainBold}</strong>{c.generalExplainPost}
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          {c.personalExplainPre}<strong>{c.personalExplainBold}</strong>{c.personalExplainPost}
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Data confidence badge (Fase 1 motor V2) — siempre visible.
                     Con confianza baja/media la nota general va capada, así que
                     un producto sin datos completos nunca puede sacar 100. */}
                  {(() => {
                    if (dataConfidence.level === 'none') return null;
                    const map = {
                      high: { emoji: '🟢', label: c.confAlta, cls: 'bg-[#95D5B2]/20 border-[#2D6A4F]/30 text-[#2D6A4F]' },
                      medium: { emoji: '🟡', label: c.confMedia, cls: 'bg-[#F4D35E]/20 border-[#F4A261]/40 text-[#8a4a1e]' },
                      low: { emoji: '🟠', label: c.confBaja, cls: 'bg-[#F4A261]/20 border-[#F4A261]/50 text-[#8a4a1e]' },
                    } as const;
                    const m = map[dataConfidence.level];
                    // The badge is an indicator only — no CTA of its own. The single
                    // "incomplete analysis" notice below holds the only photo button.
                    return (
                      <div className="w-full max-w-sm flex flex-col items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${m.cls}`}
                          title={dataConfidence.missing.length ? `${c.faltaPrefix}${dataConfidence.missing.join(', ')}` : undefined}
                        >
                          <span aria-hidden>{m.emoji}</span>
                          <span>{m.label}</span>
                        </span>
                      </div>
                    );
                  })()}

                  {voiceLine && (
                    <p className="text-sm text-muted-foreground italic text-center px-4 leading-snug">
                      {voiceLine}
                    </p>
                  )}

                  {/* Score composition: helps users understand where the number comes from. */}
                  <div className="w-full flex flex-col items-center gap-2">
                    <ScoreBreakdown factors={scoreBreakdown.factors} title={c.whyGeneral} />
                    {personalBreakdown && (
                      <ScoreBreakdown factors={personalBreakdown.factors} title={c.whyPersonal} />
                    )}
                  </div>

                  {needsPhoto && (
                    <div className="w-full max-w-sm mt-1 rounded-2xl border border-[#F4A261]/50 bg-[#F4A261]/10 p-3 flex gap-2 items-start">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-[#8a4a1e] leading-relaxed">
                          <strong>{c.incompleteBold}</strong>
                          {missingIngredients && missingNutrition
                            ? c.incompleteBothRest
                            : missingNutrition
                              ? c.incompleteNutritionRest
                              : c.incompleteIngredientsRest}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const bc = barcode && barcode !== 'photo' ? barcode : (product.barcode !== 'photo' ? product.barcode : '');
                            // Nutrition-only gap → jump straight to the nutrition step.
                            if (missingNutrition && !missingIngredients && bc && !bc.startsWith('photo_')) {
                              navigate(`/scan/photo?step=nutrition&barcode=${bc}&name=${encodeURIComponent(product.name || '')}`);
                            } else {
                              navigate(bc ? `/scan/photo?barcode=${bc}` : '/scan/photo');
                            }
                          }}
                          className="rounded-xl h-8 text-xs border-[#F4A261]/60 bg-white/60 hover:bg-white"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" />
                          {missingIngredients && missingNutrition
                            ? c.completarConFotos
                            : missingNutrition
                              ? c.fotografiarTabla
                              : c.fotografiarIngredientes}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-36 h-36 rounded-full flex flex-col items-center justify-center bg-muted text-muted-foreground border border-border">
                    <div className="text-2xl">—</div>
                    <div className="text-[10px] uppercase tracking-wider mt-1">{c.sinDatos}</div>
                  </div>
                  <div className="font-display text-lg font-semibold text-muted-foreground">{c.datosInsuficientes}</div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    {c.fotografiaParaPuntuacion}
                  </p>
                  <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')} variant="outline" className="rounded-xl mt-1">
                    <Camera className="w-4 h-4 mr-2" />
                    {c.fotografiarEtiqueta}
                  </Button>
                </>
              )}
            </div>

            {/* Nutritional facts per 100g — food only, if payload has nutriments */}
            <NutritionFacts product={product} />

            {/* Cards */}
            <Collapsible defaultOpen>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-2">🔬 {c.ingredientesGenerales}</span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0">
                    {!hasIngredientData ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {c.sinListaIngredientes}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {flagged.slice(0, 20).map((f, i) => {
                          const es = inciLabel(f.name);
                          return (
                            <Badge key={i} className={`${badgeVariant(f.level)} font-normal capitalize`}>
                              {f.name}{es ? ` (${es})` : ''}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    {hasIngredientData && ingredientsForeign && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {c.ingredientesOtroIdioma}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible defaultOpen>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-2">🌿 {c.esNatural}</span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-3">
                    {!hasIngredientData ? (
                      <p className="text-sm text-muted-foreground">
                        {c.datosInsuficientesNatural}
                      </p>
                    ) : (
                      <>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{c.ingredientesLimpios}</span><span className="font-semibold">{nat.pct}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${nat.pct}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-primary/10 text-primary border border-primary/20">{nat.level}</Badge>
                          {nat.organic && <Badge className="bg-[#95D5B2] text-[#1B1B1B]">{c.bioOrganico}</Badge>}
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <Collapsible defaultOpen>
              <div id="es-para-ti" className="bg-card rounded-2xl border-2 border-primary/40 overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-2">👤 {c.esParaTi}</span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-2">
                    {personalizationPending ? (
                      <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
                    ) : !personalAllowed ? (
                      <SignupInvite compact />
                    ) : !healthConsent ? (

                      <div className="flex gap-3 items-start p-3 rounded-xl border border-primary/30 bg-primary/5">
                        <HeartPulse className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-foreground/90">
                            {c.activaPersonalizacion}
                          </p>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setShowConsentDialog(true)}
                          >
                            {c.activarPersonalizacion}
                          </Button>
                        </div>
                      </div>
                    ) : alerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {hasIngredientData
                          ? c.noIncompatibilidades
                          : c.fotografiaParaTi}
                      </p>
                    ) : (
                      alerts.map((a, i) => (
                        <div key={i} className={`flex gap-2 items-start p-3 rounded-xl border ${alertColor(a.level)}`}>
                          <span className="text-base leading-none">{alertIcon(a.level)}</span>
                          <span className="text-sm flex-1">{a.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Mira personalised analysis — free for everyone */}
            <MiraAnalysis
              product={{
                product_name: product.name,
                brand: product.brand || '',
                category: product.category,
                ingredients_text: product.ingredients_text || '',
                barcode: product.barcode,
              }}
              profile={healthConsent ? (healthProfile || profile) : null}
              score={score}
              hasIngredientData={hasIngredientData}
              firstName={healthConsent ? firstName : null}
              personalScore={healthConsent && personalBreakdown ? personalScore : null}
              flaggedIngredients={flagged.filter(f => f.level !== 'safe').map(f => f.name)}
              topAlerts={healthConsent ? topPersonalAlerts : []}

              factors={scoreBreakdown.factors.map(f => (
                f.delta != null ? `${f.label} (${f.delta > 0 ? '+' : ''}${f.delta})` : f.label
              ))}
              nutriments={(() => {
                const n = (product.raw as { nutriments?: Record<string, number> })?.nutriments;
                if (!n) return null;
                const keys: Array<[string, string, string]> = [
                  ['salt_100g', 'sal', 'g'],
                  ['sugars_100g', 'azúcares', 'g'],
                  ['saturated-fat_100g', 'grasas saturadas', 'g'],
                  ['fat_100g', 'grasas', 'g'],
                  ['fiber_100g', 'fibra', 'g'],
                  ['proteins_100g', 'proteínas', 'g'],
                  ['energy-kcal_100g', 'energía', 'kcal'],
                ];
                const parts = keys
                  .filter(([k]) => typeof n[k] === 'number')
                  .map(([k, label, unit]) => `${label} ${n[k]} ${unit}/100 g`);
                return parts.length ? parts.join('; ') : null;
              })()}
            />

            {/* Quick thumbs feedback on this analysis */}
            {product.barcode && product.barcode !== 'photo' && (
              <ThumbsFeedback
                barcode={product.barcode}
                productName={product.name}
                scoreGeneral={score}
                scorePersonal={personalScore}
              />
            )}

            {/* Alternatives */}
            <Alternatives
              current={product}
              currentScore={healthConsent ? personalScore : score}
              profile={healthConsent ? (activeProfile as unknown as Record<string, unknown>) : null}
              consent={healthConsent}
            />

          </>
        )}

        {/* PWA install prompt — shown after the first scan result renders */}
        <InstallPrompt />

        {/* Medical / legal disclaimer — always visible on results */}
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/80">{c.avisoBold}</span>
            {c.avisoBody}
          </p>
        </div>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setShowFeedbackDialog(true)}
            className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
          >
            {c.feedbackLink}
          </button>
        </div>
      </div>


      <RegistrationSheet open={showSheet} onOpenChange={setShowSheet} variant="soft" />

      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        extraContext={{
          barcode: product.barcode,
          product_name: product.name,
          score_general: nonScorable ? null : score,
          score_personal: nonScorable ? null : personalScore,
          from: 'result_page_link',
        }}
      />

      <Dialog open={showImageLightbox} onOpenChange={setShowImageLightbox}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-2xl p-0 bg-transparent border-none shadow-none"
          onClick={() => setShowImageLightbox(false)}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          {product.image && (
            <div className="w-full aspect-square max-h-[85vh] mx-auto overflow-hidden rounded-2xl bg-black/95 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-md mx-auto rounded-3xl">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center font-display">
              {c.activarPersonalizacion}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/90">
            <p>
              {c.consentBody}
            </p>
            <p className="text-xs text-muted-foreground">
              {c.consentNotePre}{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {c.politicaPrivacidad}
              </a>
              .
            </p>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowConsentDialog(false)}
            >
              {c.ahoraNo}
            </Button>
            <Button className="flex-1 rounded-xl" onClick={grantHealthConsent}>
              {c.acepto}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultPage;

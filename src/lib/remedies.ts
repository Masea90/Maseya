import { TranslationKey } from '@/lib/i18n';

export interface Remedy {
  id: number;
  titleKey: TranslationKey;
  category: 'Skin' | 'Hair' | 'Nutrition';
  timeKey: TranslationKey;
  image: string;
  ingredientKeys: TranslationKey[];
  benefitKeys: TranslationKey[];
  descriptionKey: TranslationKey;
  stepKeys: TranslationKey[];
}

export const remedies: Remedy[] = [
  {
    id: 1,
    titleKey: 'remedyHoneyOatmealTitle',
    category: 'Skin',
    timeKey: 'remedyTime15',
    image: '🍯',
    ingredientKeys: ['remedyHoneyOatmealIng1', 'remedyHoneyOatmealIng2', 'remedyHoneyOatmealIng3'],
    benefitKeys: ['remedyBenefitHydrating', 'remedyBenefitSoothing', 'remedyBenefitAntiInflammatory'],
    descriptionKey: 'remedyHoneyOatmealDesc',
    stepKeys: ['remedyHoneyOatmealStep1', 'remedyHoneyOatmealStep2', 'remedyHoneyOatmealStep3', 'remedyHoneyOatmealStep4', 'remedyHoneyOatmealStep5', 'remedyHoneyOatmealStep6'],
  },
  {
    id: 2,
    titleKey: 'remedyRosemaryOilTitle',
    category: 'Hair',
    timeKey: 'remedyTime30',
    image: '🌿',
    ingredientKeys: ['remedyRosemaryOilIng1', 'remedyRosemaryOilIng2', 'remedyRosemaryOilIng3'],
    benefitKeys: ['remedyBenefitGrowth', 'remedyBenefitStrengthening', 'remedyBenefitShine'],
    descriptionKey: 'remedyRosemaryOilDesc',
    stepKeys: ['remedyRosemaryOilStep1', 'remedyRosemaryOilStep2', 'remedyRosemaryOilStep3', 'remedyRosemaryOilStep4', 'remedyRosemaryOilStep5', 'remedyRosemaryOilStep6'],
  },
  {
    id: 3,
    titleKey: 'remedyRiceWaterTitle',
    category: 'Hair',
    timeKey: 'remedyTime20',
    image: '🍚',
    ingredientKeys: ['remedyRiceWaterIng1', 'remedyRiceWaterIng2', 'remedyRiceWaterIng3'],
    benefitKeys: ['remedyBenefitShine', 'remedyBenefitStrength', 'remedyBenefitDetangling'],
    descriptionKey: 'remedyRiceWaterDesc',
    stepKeys: ['remedyRiceWaterStep1', 'remedyRiceWaterStep2', 'remedyRiceWaterStep3', 'remedyRiceWaterStep4', 'remedyRiceWaterStep5', 'remedyRiceWaterStep6'],
  },
  {
    id: 4,
    titleKey: 'remedyGreenTeaTitle',
    category: 'Skin',
    timeKey: 'remedyTime10',
    image: '🍵',
    ingredientKeys: ['remedyGreenTeaIng1', 'remedyGreenTeaIng2', 'remedyGreenTeaIng3'],
    benefitKeys: ['remedyBenefitAntioxidant', 'remedyBenefitPoreRefining', 'remedyBenefitBrightening'],
    descriptionKey: 'remedyGreenTeaDesc',
    stepKeys: ['remedyGreenTeaStep1', 'remedyGreenTeaStep2', 'remedyGreenTeaStep3', 'remedyGreenTeaStep4', 'remedyGreenTeaStep5', 'remedyGreenTeaStep6'],
  },
  {
    id: 5,
    titleKey: 'remedyAvocadoMaskTitle',
    category: 'Hair',
    timeKey: 'remedyTime25',
    image: '🥑',
    ingredientKeys: ['remedyAvocadoMaskIng1', 'remedyAvocadoMaskIng2', 'remedyAvocadoMaskIng3'],
    benefitKeys: ['remedyBenefitDeepConditioning', 'remedyBenefitRepair', 'remedyBenefitMoisture'],
    descriptionKey: 'remedyAvocadoMaskDesc',
    stepKeys: ['remedyAvocadoMaskStep1', 'remedyAvocadoMaskStep2', 'remedyAvocadoMaskStep3', 'remedyAvocadoMaskStep4', 'remedyAvocadoMaskStep5', 'remedyAvocadoMaskStep6'],
  },
  {
    id: 6,
    titleKey: 'remedyCollagenSmoothieTitle',
    category: 'Nutrition',
    timeKey: 'remedyTime5',
    image: '🥤',
    ingredientKeys: ['remedyCollagenSmoothieIng1', 'remedyCollagenSmoothieIng2', 'remedyCollagenSmoothieIng3', 'remedyCollagenSmoothieIng4'],
    benefitKeys: ['remedyBenefitElasticity', 'remedyBenefitAntiAging', 'remedyBenefitGlow'],
    descriptionKey: 'remedyCollagenSmoothieDesc',
    stepKeys: ['remedyCollagenSmoothieStep1', 'remedyCollagenSmoothieStep2', 'remedyCollagenSmoothieStep3', 'remedyCollagenSmoothieStep4'],
  },
  {
    id: 7,
    titleKey: 'remedyTurmericMaskTitle',
    category: 'Skin',
    timeKey: 'remedyTime20',
    image: '✨',
    ingredientKeys: ['remedyTurmericMaskIng1', 'remedyTurmericMaskIng2', 'remedyTurmericMaskIng3'],
    benefitKeys: ['remedyBenefitBrightening', 'remedyBenefitAntiInflammatory', 'remedyBenefitEvenTone'],
    descriptionKey: 'remedyTurmericMaskDesc',
    stepKeys: ['remedyTurmericMaskStep1', 'remedyTurmericMaskStep2', 'remedyTurmericMaskStep3', 'remedyTurmericMaskStep4', 'remedyTurmericMaskStep5', 'remedyTurmericMaskStep6'],
  },
  {
    id: 8,
    titleKey: 'remedyBiotinBowlTitle',
    category: 'Nutrition',
    timeKey: 'remedyTime10',
    image: '🥣',
    ingredientKeys: ['remedyBiotinBowlIng1', 'remedyBiotinBowlIng2', 'remedyBiotinBowlIng3', 'remedyBiotinBowlIng4'],
    benefitKeys: ['remedyBenefitHairGrowth', 'remedyBenefitNailStrength', 'remedyBenefitEnergy'],
    descriptionKey: 'remedyBiotinBowlDesc',
    stepKeys: ['remedyBiotinBowlStep1', 'remedyBiotinBowlStep2', 'remedyBiotinBowlStep3', 'remedyBiotinBowlStep4'],
  },
];

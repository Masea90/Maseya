// Short Spanish clarifications for common INCI / ingredient names.
// Extensible: add lowercase INCI (or leading substring) → plain-Spanish label.
const INCI_MAP: Array<[RegExp, string]> = [
  [/^(parfum|fragrance|perfume)$/i, 'perfume'],
  [/^aqua$/i, 'agua'],
  [/^water$/i, 'agua'],
  [/^alcohol\s*denat(\.|urated)?$/i, 'alcohol desnaturalizado'],
  [/^sd\s*alcohol/i, 'alcohol desnaturalizado'],
  [/^ethanol$/i, 'alcohol'],
  [/^dimethicone$/i, 'silicona'],
  [/^cyclopentasiloxane$/i, 'silicona volátil'],
  [/^paraffinum\s*liquidum$/i, 'aceite mineral'],
  [/^mineral\s*oil$/i, 'aceite mineral'],
  [/^tocopherol$/i, 'vitamina E'],
  [/^tocopheryl\s*acetate$/i, 'vitamina E'],
  [/^sodium\s*laureth\s*sulfate$/i, 'sulfato, detergente'],
  [/^sodium\s*lauryl\s*sulfate$/i, 'sulfato, detergente'],
  [/^ammonium\s*lauryl\s*sulfate$/i, 'sulfato, detergente'],
  [/^glycerin$/i, 'glicerina'],
  [/^glycerol$/i, 'glicerina'],
  [/^hyaluronic\s*acid$/i, 'ácido hialurónico'],
  [/^niacinamide$/i, 'vitamina B3'],
  [/^retinol$/i, 'vitamina A'],
];

export function inciLabel(rawName: string): string | null {
  const name = rawName.trim();
  for (const [re, label] of INCI_MAP) {
    if (re.test(name)) return label;
  }
  return null;
}

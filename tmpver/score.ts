import { readFileSync } from 'fs';
import { flagIngredients, calculateScore } from '../src/lib/scoring';
const rows = JSON.parse(readFileSync('/tmp/cos.json','utf8'));
for (const r of rows) {
  const pd:any = { barcode:r.barcode, source:'maseya', category:r.category||'cosmetic', name:r.product_name, brand:r.brand, image:null, nutriscore_grade:null, ingredients_text:r.ingredients_text, ingredients_tags:[], labels_tags:[], ingredients_analysis_tags:[], allergens_tags:[], traces_tags:[], raw:{categories_tags:r.category_tag?[r.category_tag]:[]} };
  const f = flagIngredients(pd);
  console.log(r.barcode, String(r.product_name).slice(0,32), '| chips:', f.length, '| score:', calculateScore(pd,f));
}
const coke:any = { barcode:'5449000000996', source:'off', category:'food', name:'Coca-Cola', brand:'', image:null, nutriscore_grade:'e', ingredients_text:'Agua carbonatada, azucar, colorante E150d, acidulante E338, aroma natural, cafeina', ingredients_tags:[], labels_tags:[], ingredients_analysis_tags:[], allergens_tags:[], traces_tags:[], raw:{categories_tags:['en:sodas'],additives_tags:['en:e150d','en:e338'],nutriments:{}} };
console.log('COKE score:', calculateScore(coke, flagIngredients(coke)));

// AUTO-GENERATED from Open Food Facts additives taxonomy (ODbL).
// Only includes additives with EFSA overexposure risk = high | moderate.
// Regenerate by running the temporary build script; do not edit by hand.

export type AdditiveRiskLevel = 'high' | 'moderate';

export interface AdditiveRiskEntry {
  risk: AdditiveRiskLevel;
  name?: string;
  efsa_url?: string;
}

export const ADDITIVES_RISK: Record<string, AdditiveRiskEntry> = {
  "en:e131": { risk: 'moderate', name: "E131 - Azul patentado V", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2013.2818" },
  "en:e133": { risk: 'moderate', name: "E133 - Azul brillante FCF", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1853" },
  "en:e142": { risk: 'moderate', name: "E142 - Verde s", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2010.1851" },
  "en:e150c": { risk: 'moderate', name: "E150c - Caramelo amónico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2012.3030" },
  "en:e155": { risk: 'high', name: "E155 - Marrón ht", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2014.3719" },
  "en:e200": { risk: 'high', name: "E200 - Ácido sórbico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2015.4144" },
  "en:e202": { risk: 'high', name: "E202 - Sorbato potásico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2015.4144" },
  "en:e210": { risk: 'high', name: "E210 - Ácido benzoico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4433" },
  "en:e211": { risk: 'high', name: "E211 - Benzoato sódico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4433" },
  "en:e212": { risk: 'high', name: "E212 - Benzoato potásico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4433" },
  "en:e213": { risk: 'high', name: "E213 - Benzoato cálcico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4433" },
  "en:e220": { risk: 'high', name: "E220 - Dióxido de azufre", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e221": { risk: 'high', name: "E221 - Sulfito sódico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e222": { risk: 'high', name: "E222 - Sulfito ácido de sodio", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e223": { risk: 'high', name: "E223 - Metabisulfito sódico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e224": { risk: 'high', name: "E224 - Metabisulfito potásico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e226": { risk: 'high', name: "E226 - Sulfito cálcico", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e227": { risk: 'high', name: "E227 - Sulfito ácido de calcio", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e228": { risk: 'high', name: "E228 - Sulfito ácido de potasio", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4438" },
  "en:e250": { risk: 'high', name: "E250 - Nitrito sódico", efsa_url: "https://zenodo.org/record/1252752/files/EFSAOutputs_KJ_2018.xlsx" },
  "en:e251": { risk: 'high', name: "E251 - Nitrato sódico i.", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4787" },
  "en:e252": { risk: 'high', name: "E252 - Nitrato potásico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4787" },
  "en:e338": { risk: 'high', name: "E338 - Ácido fosfórico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e339": { risk: 'high', name: "E339 - Fosfatos de sodio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e340": { risk: 'high', name: "E340 - Fosfatos de potasio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e341": { risk: 'high', name: "E341 - Fosfatos de calcio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e343": { risk: 'high', name: "E343 - Fosfatos de magnesio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e407": { risk: 'high', name: "E407 - Carragenatos", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2018.5238" },
  "en:e407a": { risk: 'high', name: "E407a - Alga eucheuma transformada", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2018.5238" },
  "en:e432": { risk: 'moderate', name: "E432 - Monolaurato de sorbitán polioxietilenado", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4152" },
  "en:e433": { risk: 'moderate', name: "E433 - Monooleato de sorbitán polioxietilenado", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4152" },
  "en:e434": { risk: 'moderate', name: "E434 - Monopalmitato de sorbitán polioxietilenado", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4152" },
  "en:e435": { risk: 'moderate', name: "E435 - Monoestearato de sorbitán polioxietilenado", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4152" },
  "en:e436": { risk: 'moderate', name: "E436 - Triestearato de sorbitán polioxietilenado", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4152" },
  "en:e450": { risk: 'high', name: "E450 - Difosfatos", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e451": { risk: 'high', name: "E451 - Tripolifosfatos", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e452": { risk: 'high', name: "E452 - Polifosfatos", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5674" },
  "en:e459": { risk: 'high', name: "E459 - Beta-ciclodextrina", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2016.4628" },
  "en:e473": { risk: 'high', name: "E473 - Sucroésteres de ácidos grasos", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2018.5087" },
  "en:e481": { risk: 'high', name: "E481 - Estearoil-2-lactilato de sodio", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2013.3144" },
  "en:e482": { risk: 'high', name: "E482 - Estearoil-2-lactilato de calcio", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2013.3144" },
  "en:e491": { risk: 'high', name: "E491 - Monoestearato de sorbitano", efsa_url: "hhttps://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4788" },
  "en:e492": { risk: 'high', name: "E492 - Triestearato de sorbitano", efsa_url: "hhttps://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4788" },
  "en:e493": { risk: 'high', name: "E493 - Monolaurato de sorbitano", efsa_url: "hhttps://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4788" },
  "en:e494": { risk: 'high', name: "E494 - Sorbitan monooleate", efsa_url: "hhttps://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4788" },
  "en:e495": { risk: 'high', name: "E495 - Monopalmitato de sorbitano", efsa_url: "hhttps://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2017.4788" },
  "en:e507": { risk: 'moderate', name: "E507 - Ácido clorhídrico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5751" },
  "en:e508": { risk: 'moderate', name: "E508 - Cloruro de potasio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5751" },
  "en:e509": { risk: 'moderate', name: "E509 - Cloruro de calcio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5751" },
  "en:e511": { risk: 'moderate', name: "E511 - Cloruro de magnesio", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2019.5751" },
  "en:e621": { risk: 'high', name: "E621 - Glutamato monosódico", efsa_url: "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2017.4910" },
  "en:e960": { risk: 'moderate', name: "E960 - Glucósidos de esteviol", efsa_url: "http://dx.doi.org/10.2903/j.efsa.2015.4146" },
};

// --- Name synonyms (es/en/fr) -> E-code tag ---------------------------------
// Many Spanish labels list additives by name ("conservantes: sorbato potásico")
// instead of E-codes. This map only covers additives already present in
// ADDITIVES_RISK above; unknown codes are ignored at lookup time.
export const ADDITIVE_NAME_SYNONYMS: Record<string, string> = {
  // E200 / E202
  'acido sorbico': 'en:e200', 'sorbic acid': 'en:e200', 'acide sorbique': 'en:e200',
  'sorbato potasico': 'en:e202', 'sorbato de potasio': 'en:e202',
  'potassium sorbate': 'en:e202', 'sorbate de potassium': 'en:e202',
  // E210 / E211 / E212 / E213
  'acido benzoico': 'en:e210', 'benzoic acid': 'en:e210', 'acide benzoique': 'en:e210',
  'benzoato sodico': 'en:e211', 'benzoato de sodio': 'en:e211',
  'sodium benzoate': 'en:e211', 'benzoate de sodium': 'en:e211',
  'benzoato potasico': 'en:e212', 'potassium benzoate': 'en:e212',
  'benzoato calcico': 'en:e213', 'calcium benzoate': 'en:e213',
  // E220-E228 sulfites
  'dioxido de azufre': 'en:e220', 'sulfur dioxide': 'en:e220', 'sulphur dioxide': 'en:e220',
  'dioxyde de soufre': 'en:e220', 'anhidrido sulfuroso': 'en:e220',
  'sulfito sodico': 'en:e221', 'sulfito de sodio': 'en:e221', 'sodium sulphite': 'en:e221', 'sodium sulfite': 'en:e221',
  'metabisulfito sodico': 'en:e223', 'metabisulfito de sodio': 'en:e223',
  'sodium metabisulphite': 'en:e223', 'sodium metabisulfite': 'en:e223', 'metabisulfite de sodium': 'en:e223',
  'metabisulfito potasico': 'en:e224', 'metabisulfito de potasio': 'en:e224',
  'potassium metabisulphite': 'en:e224', 'potassium metabisulfite': 'en:e224',
  'sulfito calcico': 'en:e226', 'calcium sulphite': 'en:e226',
  // E250-E252 nitrites / nitrates
  'nitrito sodico': 'en:e250', 'nitrito de sodio': 'en:e250', 'sodium nitrite': 'en:e250', 'nitrite de sodium': 'en:e250',
  'nitrato sodico': 'en:e251', 'nitrato de sodio': 'en:e251', 'sodium nitrate': 'en:e251', 'nitrate de sodium': 'en:e251',
  'nitrato potasico': 'en:e252', 'nitrato de potasio': 'en:e252', 'potassium nitrate': 'en:e252', 'nitrate de potassium': 'en:e252',
  // E338-E343 phosphates
  'acido fosforico': 'en:e338', 'phosphoric acid': 'en:e338', 'acide phosphorique': 'en:e338',
  'fosfato sodico': 'en:e339', 'fosfatos de sodio': 'en:e339', 'sodium phosphate': 'en:e339', 'sodium phosphates': 'en:e339',
  'fosfato potasico': 'en:e340', 'fosfatos de potasio': 'en:e340', 'potassium phosphate': 'en:e340',
  'fosfato calcico': 'en:e341', 'fosfatos de calcio': 'en:e341', 'calcium phosphate': 'en:e341',
  'difosfatos': 'en:e450', 'diphosphates': 'en:e450',
  'trifosfatos': 'en:e451', 'tripolifosfatos': 'en:e451', 'triphosphates': 'en:e451',
  'polifosfatos': 'en:e452', 'polyphosphates': 'en:e452',
  // E621 glutamates
  'glutamato monosodico': 'en:e621', 'glutamato de sodio': 'en:e621',
  'monosodium glutamate': 'en:e621', 'glutamate monosodique': 'en:e621', 'msg': 'en:e621',
  // E407 carrageenan
  'carragenanos': 'en:e407', 'carragenatos': 'en:e407', 'carrageenan': 'en:e407', 'carraghenanes': 'en:e407',
  // E150c caramel
  'caramelo amonico': 'en:e150c', 'ammonia caramel': 'en:e150c',
  'caramelo sulfito amonico': 'en:e150d', 'sulphite ammonia caramel': 'en:e150d',
  // Sweeteners
  'glucosidos de esteviol': 'en:e960', 'steviol glycosides': 'en:e960',
};

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

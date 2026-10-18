/**
 * Approved Spanish legal copy, shared by the React pages and the build-time
 * prerender (so crawlers see the same text). Spanish only on purpose: legal
 * texts need legal review before being translated.
 */

export type LegalTable = {
  headers: string[];
  rows: string[][];
};

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  table?: LegalTable;
  note?: string;
  highlight?: boolean;
};

export const LEGAL_UPDATED = 'Última actualización: septiembre 2026.';

/* ------------------------------------------------------------------ */
/* Cookies                                                             */
/* ------------------------------------------------------------------ */

export const COOKIES_META = {
  title: 'Política de cookies — Maseya',
  description:
    'Qué guarda Maseya en tu navegador: almacenamiento necesario, personalización y medición de uso. Sin cookies publicitarias ni de terceros.',
};

export const COOKIES_INTRO =
  'Maseya funciona como aplicación web y guarda cierta información en el almacenamiento local de tu navegador. No usamos cookies publicitarias, ni de terceros, ni rastreadores de redes sociales. No hay publicidad en Maseya y no compartimos esta información con nadie.';

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    title: 'Estrictamente necesario — no requiere tu consentimiento',
    table: {
      headers: ['Qué se guarda', 'Para qué', 'Duración'],
      rows: [
        ['Sesión de usuario', 'Mantenerte identificada tras iniciar sesión', 'Hasta cerrar sesión'],
        ['Idioma seleccionado', 'Mostrar la app en tu idioma', 'Persistente'],
        ['Tu decisión sobre este aviso', 'No volver a preguntártelo', '12 meses'],
        ['Estado de la instalación', 'Recordar si ya has instalado la app', 'Persistente'],
      ],
    },
  },
  {
    title: 'Personalización — requiere tu consentimiento',
    table: {
      headers: ['Qué se guarda', 'Para qué', 'Duración'],
      rows: [
        [
          'Tu perfil de salud',
          'Calcular tu nota personal según tus alergias, dieta, piel, cabello y estado de embarazo',
          'Hasta que lo borres o cierres sesión',
        ],
      ],
    },
  },
  {
    title: 'Medición de uso — requiere tu consentimiento',
    table: {
      headers: ['Qué se guarda', 'Para qué', 'Duración'],
      rows: [
        [
          'Identificador aleatorio de sesión',
          'Saber cuánta gente usa Maseya y detectar fallos',
          '90 días',
        ],
      ],
    },
    note: 'Ese identificador es un número aleatorio generado en tu dispositivo. No permite identificarte, no se comparte con terceros y no se utiliza para publicidad ni para seguirte por otras webs. Solo genera estadísticas agregadas.',
  },
  {
    title: 'Datos de salud',
    paragraphs: [
      'Tu perfil de salud (alergias, intolerancias, tipo de piel y de cabello, embarazo o lactancia, dieta y objetivos) es una categoría especial de datos personales. Solo se trata si das tu consentimiento explícito y únicamente para calcular tu nota personal. Si no lo das, Maseya sigue funcionando con la nota general.',
    ],
  },
  {
    title: 'Cómo cambiar o retirar tu consentimiento',
    paragraphs: [
      'Puedes cambiar tu decisión en cualquier momento desde Perfil → Privacidad, tanto para la personalización con datos de salud como para la medición de uso. También puedes borrar el almacenamiento local desde los ajustes de tu navegador: en ese caso volveremos a preguntarte.',
      'Retirar el consentimiento no afecta a la licitud del tratamiento realizado antes de retirarlo.',
    ],
  },
  {
    title: 'Renovación',
    paragraphs: [
      'Tu decisión sobre este aviso se conserva 12 meses. Pasado ese plazo volveremos a preguntarte.',
    ],
  },
  {
    title: 'Contacto',
    paragraphs: ['Para cualquier duda sobre esta política, escríbenos a team@maseya.es.'],
  },
];

/* ------------------------------------------------------------------ */
/* Aviso legal                                                         */
/* ------------------------------------------------------------------ */

export const LEGAL_NOTICE_META = {
  title: 'Aviso legal — Maseya',
  description:
    'Titular, objeto del servicio, origen de los datos (Open Food Facts y Open Beauty Facts, ODbL), propiedad intelectual y condiciones de uso de Maseya.',
};

export const LEGAL_NOTICE_SECTIONS: LegalSection[] = [
  {
    title: 'Titular del sitio web',
    paragraphs: [
      'Asmae Oumanzou. Mollet del Vallès (08100), Barcelona, España. Contacto: team@maseya.es. Sitio web: https://maseya.es.',
      'Maseya es un proyecto independiente. No tiene publicidad, no vende productos y no mantiene ninguna relación de afiliación, patrocinio ni acuerdo comercial con las marcas o fabricantes cuyos productos se analizan.',
      'El tratamiento de datos personales se describe en la Política de privacidad.',
    ],
  },
  {
    title: 'Objeto del servicio',
    paragraphs: [
      'Maseya es una aplicación web que permite escanear productos de alimentación y cosmética y obtener información sobre su composición: una puntuación general basada en criterios científicos públicos y, si así lo decides, una puntuación personal calculada según el perfil que configures.',
      'El uso de Maseya es gratuito y voluntario. La aplicación se ofrece tal cual, y su disponibilidad puede verse interrumpida por mantenimiento o causas técnicas.',
    ],
  },
  {
    title: 'La información de Maseya no es asesoramiento médico',
    paragraphs: [
      'Maseya ofrece información orientativa para ayudarte a decidir. No sustituye el consejo de un profesional sanitario ni constituye un diagnóstico, un tratamiento ni una recomendación médica.',
    ],
    items: [
      'Alergias: si tienes una alergia grave, verifica siempre el etiquetado oficial del envase antes de consumir o usar un producto. La información del envase físico prevalece sobre la de la aplicación.',
      'Embarazo y lactancia: las indicaciones se apoyan en recomendaciones públicas de AESAN y deben contrastarse con tu matrona o tu médico.',
      'Condiciones médicas: si tienes una enfermedad diagnosticada o sigues un tratamiento, consulta con tu profesional sanitario antes de cambiar tu alimentación o tus productos.',
    ],
    highlight: true,
  },
  {
    title: 'Origen de los datos y atribución',
    paragraphs: [
      'Parte de la información de los productos procede de Open Food Facts y Open Beauty Facts, bases de datos colaborativas publicadas bajo la licencia Open Database License (ODbL). Maseya reconoce esta atribución y mantiene la información derivada bajo las condiciones de dicha licencia.',
      'Las imágenes de producto procedentes de Open Food Facts y Open Beauty Facts se publican bajo licencia Creative Commons Reconocimiento-CompartirIgual (CC-BY-SA).',
      'La puntuación general se apoya en el algoritmo Nutri-Score en su versión 2023, en las evaluaciones de aditivos alimentarios de la EFSA (Autoridad Europea de Seguridad Alimentaria) y en las recomendaciones públicas de AESAN (Agencia Española de Seguridad Alimentaria y Nutrición).',
      'Maseya no está afiliada, patrocinada ni respaldada por Open Food Facts, Open Beauty Facts, la EFSA ni AESAN.',
      'Algunas fichas se completan con aportaciones de usuarios mediante fotografías de etiquetas. Al enviar una fotografía aceptas que la información extraída pueda incorporarse a la base de datos de Maseya para beneficio de quienes escaneen el mismo producto.',
    ],
  },
  {
    title: 'Propiedad intelectual',
    paragraphs: [
      'La marca Maseya, su diseño, sus textos, su identidad visual y el código de la aplicación son propiedad de su titular. Queda prohibida su reproducción, distribución o transformación sin autorización expresa, salvo los contenidos de terceros sujetos a sus propias licencias, como los datos de Open Food Facts y Open Beauty Facts bajo licencia ODbL.',
    ],
  },
  {
    title: 'Condiciones de uso',
    items: [
      'Usa Maseya de forma lícita y conforme a esta información legal.',
      'No intentes acceder a datos de otras personas, alterar el funcionamiento del servicio ni realizar extracciones masivas automatizadas de la aplicación.',
      'No subas fotografías que no sean de etiquetas de productos, ni contenidos ilícitos, ofensivos o que vulneren derechos de terceros.',
      'El titular puede suspender el acceso de cuentas que incumplan estas condiciones.',
      'El titular no se hace responsable de los daños derivados de decisiones tomadas exclusivamente a partir de la información orientativa de la aplicación.',
    ],
  },
  {
    title: 'Legislación aplicable',
    paragraphs: [
      'Estas condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan conforme a la normativa aplicable en materia de consumidores y usuarios.',
    ],
  },
];

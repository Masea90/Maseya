/**
 * Build-time prerender for the three PUBLIC routes only: /, /como-funciona, /privacy.
 *
 * It does NOT run a browser and does NOT touch the app runtime: after the normal
 * Vite build it takes dist/index.html, injects static Spanish markup inside
 * <div id="root"> and route-specific head tags, and writes the result to
 * dist/index.html, dist/como-funciona/index.html and dist/privacy/index.html.
 *
 * React mounts with createRoot().render(), which replaces the placeholder markup,
 * so hydration/routing/PWA behaviour is unchanged. Private routes are never
 * prerendered — the SPA fallback keeps serving dist/index.html for them.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { HOW_IT_WORKS_COPY } from '../src/content/howItWorks';
import { WELCOME_COPY } from '../src/content/welcome';

const SITE = 'https://maseya.es';

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const p = (s: string) => `<p>${esc(s)}</p>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

function welcomeHtml(): string {
  const c = WELCOME_COPY.es;
  return [
    '<div>',
    `<h1>${esc(c.titleTop)}</h1>`,
    p(`${c.subtitle}${c.subtitleAccent}`),
    p(`${c.ex1Label} — ${c.ex1aCond}: ${c.ex1aVerdict} / ${c.ex1bCond}: ${c.ex1bVerdict}`),
    p(`${c.ex2Label} — ${c.ex2aCond}: ${c.ex2aVerdict} / ${c.ex2bCond}: ${c.ex2bVerdict}`),
    p(c.reach),
    '<p><a href="/scan">' + esc(c.cta) + '</a></p>',
    '<p><a href="/como-funciona">' + esc(c.howItWorks) + '</a> · <a href="/privacy">Política de privacidad</a></p>',
    '</div>',
  ].join('');
}

function howItWorksHtml(): string {
  const c = HOW_IT_WORKS_COPY.es;
  return [
    '<div>',
    `<h1>${esc(c.h1)}</h1>`,
    p(c.subtitle),
    `<section><h2>${esc(c.ideaTitle)}</h2>${p(c.idea)}</section>`,
    `<section><h2>${esc(c.scoreTitle)}</h2>${c.blocks
      .map((b) => `<article><h3>${esc(b.title)}</h3>${p(b.body)}</article>`)
      .join('')}</section>`,
    `<section><h2>${esc(c.personalTitle)}</h2>${p(c.personalIntro)}${ul(c.personalItems)}${p(
      c.personalClose,
    )}</section>`,
    `<section><h2>${esc(c.missingTitle)}</h2>${p(c.missing)}${p(c.missingQuote)}</section>`,
    `<section><h2>${esc(c.notTitle)}</h2>${ul(c.notItems)}</section>`,
    `<section><h2>${esc(c.whoTitle)}</h2>${p(c.who)}<p>${esc(
      c.whoContact,
    )}<a href="mailto:team@maseya.es">team@maseya.es</a>${esc(c.whoContactEnd)}</p></section>`,
    `<p><a href="/scan">${esc(c.cta)}</a></p>`,
    '</div>',
  ].join('');
}

const PRIVACY_SECTIONS: { title: string; body?: string; items?: string[] }[] = [
  {
    title: 'Responsable del tratamiento',
    body: 'Asmae Oumanzou. Contacto: team@maseya.es.',
  },
  {
    title: 'Datos que tratamos',
    items: [
      'Datos de cuenta: dirección de email.',
      'Perfil de salud facilitado voluntariamente: alergias e intolerancias, tipo y condiciones de piel, embarazo o lactancia, y preferencias de dieta.',
      'Historial de escaneos de productos.',
      'Productos que aportas mediante foto de etiqueta.',
    ],
  },
  {
    title: 'Finalidades',
    items: [
      'Prestar el servicio de análisis de productos.',
      'Personalizar los análisis según tu perfil de salud, únicamente si has dado tu consentimiento explícito.',
      'Mejorar nuestra base de datos de productos.',
    ],
  },
  {
    title: 'Base legal',
    body: 'Ejecución del servicio para la cuenta y el historial de escaneos. Para el tratamiento de los datos de salud aplicamos el consentimiento explícito (art. 9.2.a RGPD), revocable en cualquier momento sin afectar al uso básico de la app.',
  },
  {
    title: 'Destinatarios',
    body: 'Los datos se alojan en la infraestructura de Supabase/Lovable (UE/EEUU con garantías adecuadas). Los análisis con IA procesan tu perfil de forma puntual para generar la explicación; no se utilizan para entrenar modelos. Las consultas a Open Food Facts y Open Beauty Facts se realizan únicamente con el código de barras del producto, nunca con tus datos personales.',
  },
  {
    title: 'Conservación',
    body: 'Conservamos tus datos mientras mantengas tu cuenta activa. Puedes solicitar su eliminación en cualquier momento.',
  },
  {
    title: 'Tus derechos',
    body: 'Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a team@maseya.es. También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
  },
];

function privacyHtml(): string {
  return [
    '<div>',
    '<h1>Política de privacidad</h1>',
    p('En Maseya tratamos tus datos con el mínimo imprescindible y con respeto al RGPD.'),
    ...PRIVACY_SECTIONS.map(
      (s) =>
        `<section><h2>${esc(s.title)}</h2>${s.body ? p(s.body) : ''}${
          s.items ? ul(s.items) : ''
        }</section>`,
    ),
    p('Maseya ofrece información orientativa y no sustituye el consejo de un médico, dermatólogo o nutricionista.'),
    '</div>',
  ].join('');
}

type Route = {
  out: string;
  url: string;
  title: string;
  description: string;
  body: () => string;
};

const routes = (): Route[] => [
  {
    out: 'index.html',
    url: `${SITE}/`,
    title: 'Maseya – Escanea productos y descubre si son para ti',
    description:
      'Escanea alimentos y cosmética y descubre al instante si los productos son adecuados para tu salud y preferencias.',
    body: welcomeHtml,
  },
  {
    out: path.join('como-funciona', 'index.html'),
    url: `${SITE}/como-funciona`,
    title: HOW_IT_WORKS_COPY.es.meta.title,
    description: HOW_IT_WORKS_COPY.es.meta.description,
    body: howItWorksHtml,
  },
  {
    out: path.join('privacy', 'index.html'),
    url: `${SITE}/privacy`,
    title: 'Política de privacidad — Maseya',
    description:
      'Cómo trata Maseya tus datos: responsable, finalidades, base legal, conservación y tus derechos según el RGPD.',
    body: privacyHtml,
  },
];

function applyHead(html: string, r: Route): string {
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(
      /<meta name="description" content="[\s\S]*?">/,
      `<meta name="description" content="${esc(r.description)}">`,
    )
    .replace(
      /<meta property="og:title" content="[\s\S]*?" \/>/,
      `<meta property="og:title" content="${esc(r.title)}" />`,
    )
    .replace(
      /<meta property="og:description" content="[\s\S]*?" \/>/,
      `<meta property="og:description" content="${esc(r.description)}" />`,
    )
    .replace(
      /<meta property="og:url" content="[\s\S]*?" \/>/,
      `<meta property="og:url" content="${r.url}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[\s\S]*?" \/>/,
      `<meta name="twitter:title" content="${esc(r.title)}" />`,
    )
    .replace(
      /<meta name="twitter:description" content="[\s\S]*?" \/>/,
      `<meta name="twitter:description" content="${esc(r.description)}" />`,
    );
  out = out.replace('</head>', `  <link rel="canonical" href="${r.url}" />\n  </head>`);
  return out;
}

export function prerenderPlugin(): Plugin {
  return {
    name: 'maseya-prerender-public-routes',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      try {
        const dist = path.resolve(process.cwd(), 'dist');
        const indexPath = path.join(dist, 'index.html');
        if (!fs.existsSync(indexPath)) return;
        const base = fs.readFileSync(indexPath, 'utf8');
        for (const r of routes()) {
          const html = applyHead(base, r).replace(
            '<div id="root"></div>',
            `<div id="root">${r.body()}</div>`,
          );
          const target = path.join(dist, r.out);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, html, 'utf8');
        }
        // eslint-disable-next-line no-console
        console.log('[prerender] wrote /, /como-funciona, /privacy');
      } catch (e) {
        // Never fail the build because of SEO markup.
        // eslint-disable-next-line no-console
        console.warn('[prerender] skipped:', e);
      }
    },
  };
}

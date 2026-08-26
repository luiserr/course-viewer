/**
 * Normalización de texto que llega del backend.
 *
 * Los títulos de temas y posts vienen de una BD latin1 y pasan por capas que a
 * veces los reinterpretan como UTF-8 (mojibake: "VacunaciÃ³n") y a veces los
 * devuelven con entidades HTML ("Vacunaci&oacute;n"). Portado de
 * dash-course-mobile/src/config/theme.js para que web y app muestren lo mismo.
 */

const HTML_ENTITIES = {
  '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
  '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
  '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
  '&uuml;': 'ü', '&Uuml;': 'Ü',
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&iquest;': '¿', '&iexcl;': '¡',
  '&hellip;': '…',
  '&nbsp;': ' '
};

const decodeHtmlEntities = (str) =>
  str.replace(/&[a-zA-Z]+;|&#\d+;/g, (entity) => {
    if (HTML_ENTITIES[entity]) return HTML_ENTITIES[entity];
    const numMatch = entity.match(/^&#(\d+);$/);
    return numMatch ? String.fromCharCode(parseInt(numMatch[1], 10)) : entity;
  });

// Windows-1252 remapea los bytes 0x80-0x9F a comillas tipográficas, guiones
// largos, etc. Para reconstruir el texto original hay que volver a esos bytes
// antes de decodificar como UTF-8.
const CP1252_SPECIALS = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178
};
const CP1252_REVERSE = {};
Object.entries(CP1252_SPECIALS).forEach(([byte, cp]) => {
  CP1252_REVERSE[cp] = Number(byte);
});

const decodeMojibake = (str) => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if (cp <= 0xFF) {
      bytes.push(cp);
    } else if (CP1252_REVERSE[cp] !== undefined) {
      bytes.push(CP1252_REVERSE[cp]);
    } else {
      return null; // no es un byte que podamos revertir: ya está correcto
    }
  }
  try {
    const percentEncoded = bytes.map((b) => '%' + b.toString(16).padStart(2, '0')).join('');
    return decodeURIComponent(percentEncoded);
  } catch {
    return null;
  }
};

/**
 * Corrige mojibake y entidades HTML de un texto del backend.
 * @param {unknown} str
 * @returns {any} el texto corregido, o el valor original si no es string
 */
export function fixEncoding(str) {
  if (typeof str !== 'string') return str;
  const decoded = decodeMojibake(str);
  return decodeHtmlEntities(decoded !== null ? decoded : str);
}

/**
 * Convierte el HTML de una descripción en párrafos de texto plano.
 *
 * Las descripciones de curso vienen con HTML del editor (p, br, div, listas).
 * En lugar de inyectarlas con dangerouslySetInnerHTML, se parten en párrafos y
 * se pintan como texto: mismo resultado visual, sin riesgo de inyección.
 *
 * @param {string} [html]
 * @returns {string[]} párrafos no vacíos
 */
export function htmlToParagraphs(html) {
  if (!html || typeof html !== 'string') return [];
  return html
    // Los cierres de bloque y los <br> marcan separación de párrafo
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((line) => fixEncoding(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Resuelve la imagen de un curso: URL, data URI o base64 crudo.
 * @param {string} [image]
 * @returns {string|null}
 */
export function resolveCourseImage(image) {
  if (!image) return null;
  if (image.startsWith('data:') || image.startsWith('http') || image.startsWith('/')) return image;
  return `data:image/png;base64,${image}`;
}

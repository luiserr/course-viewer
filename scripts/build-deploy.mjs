/**
 * Build + despliegue del front (Vite/React) hacia el backend PHP.
 *
 * Pasos:
 *   1. Borra `dist/` del proyecto Vite.
 *   2. Borra `assets/` de la carpeta destino en el repo school.
 *   3. Ejecuta `vite build`.
 *   4. Copia `dist/assets` -> `<destino>/assets`.
 *   5. Lee los nombres reales del JS y CSS de `dist/index.html` y actualiza
 *      `const BUILD_JS` / `const BUILD_CSS` en `<destino>/index.php`.
 *
 * La raíz del repo school NO está hardcodeada. Se resuelve, en orden:
 *   1. Variable de entorno LXP_SCHOOL_CODE_ROOT
 *   2. `.env` del proyecto (LXP_SCHOOL_CODE_ROOT=...)
 *   3. `deploy.config.json` (schoolCodeRoot)
 *
 * La ruta relativa del módulo se puede sobrescribir con `targetRelativePath`
 * en deploy.config.json o con la variable LXP_TARGET_RELATIVE_PATH.
 *
 * Uso:
 *   npm run build           # build + despliegue
 *   npm run build:only      # solo vite build (sin copiar al repo PHP)
 *   npm run build -- --dry-run   # muestra lo que haría, sin escribir en el destino
 */

import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/** Ruta del módulo relativa a la raíz de schoolCode (School/content_viewer_v3) */
const DEFAULT_TARGET_RELATIVE_PATH = join('School', 'content_viewer_v3');

/** Variables que el script lee del .env local */
const ENV_KEYS = ['LXP_SCHOOL_CODE_ROOT', 'LXP_TARGET_RELATIVE_PATH'];

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Carga las variables relevantes del .env sin sobrescribir las ya definidas */
function loadDotEnv() {
  const envPath = join(projectRoot, '.env');
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!ENV_KEYS.includes(key) || process.env[key]) continue;

    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val) process.env[key] = val;
  }
}

/** Lee deploy.config.json si existe */
function loadDeployConfig() {
  const configPath = join(projectRoot, 'deploy.config.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    fail(`deploy.config.json no es un JSON válido: ${error.message}`);
  }
}

/** Resuelve la raíz del repo schoolCode y la ruta relativa del módulo */
function resolveTarget() {
  loadDotEnv();
  const config = loadDeployConfig();

  const schoolCodeRoot =
    process.env.LXP_SCHOOL_CODE_ROOT?.trim() || config.schoolCodeRoot?.trim() || '';

  if (!schoolCodeRoot) {
    fail(
      'Falta la ruta base del repo LXP/schoolCode. Configúrala con una de estas opciones:\n' +
        '  - Variable de entorno LXP_SCHOOL_CODE_ROOT\n' +
        '  - Archivo .env (copia .env.example)\n' +
        '  - Archivo deploy.config.json (copia deploy.config.example.json)'
    );
  }

  if (!existsSync(schoolCodeRoot) || !statSync(schoolCodeRoot).isDirectory()) {
    fail(`La ruta de schoolCode no existe o no es una carpeta:\n  ${schoolCodeRoot}`);
  }

  const targetRelativePath =
    process.env.LXP_TARGET_RELATIVE_PATH?.trim() ||
    config.targetRelativePath?.trim() ||
    DEFAULT_TARGET_RELATIVE_PATH;

  const targetDir = join(schoolCodeRoot, targetRelativePath);
  return { schoolCodeRoot, targetRelativePath, targetDir };
}

/** Último segmento de una ruta o URL */
function basenameFromUrlOrPath(p) {
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/** Lee dist/index.html y devuelve los nombres de archivo del JS y CSS del build */
function readBuildAssetNames(distDir) {
  const indexHtmlPath = join(distDir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    fail('No se encontró dist/index.html tras el build.');
  }

  const html = readFileSync(indexHtmlPath, 'utf8');

  // Solo interesan los assets que genera el build: Vite los emite planos, justo
  // dentro de `assets/`. index.html también enlaza hojas del backend (las
  // tipografías del visor, en /content_viewer_v2/assets/css/fonts.css), así que no
  // basta con exigir "assets/" ni con tomar la primera coincidencia: hay que
  // pedir que el archivo cuelgue directamente de assets/, sin subcarpetas.
  const isBuildAsset = (href, extension) =>
    /(^|\/)assets\/[^/]+$/.test(href) && basenameFromUrlOrPath(href).endsWith(extension);

  const hrefs = (pattern) => [...html.matchAll(pattern)].map((match) => match[1]);

  const cssHref = hrefs(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi).find((href) =>
    isBuildAsset(href, '.css')
  );
  const jsHref =
    hrefs(/<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["']/gi).find((href) =>
      isBuildAsset(href, '.js')
    ) ?? hrefs(/<script[^>]+src=["']([^"']+\.js)["']/gi).find((href) => isBuildAsset(href, '.js'));

  if (!cssHref || !jsHref) {
    fail(
      'No se pudieron detectar el CSS o el JS del build en dist/index.html ' +
        '(se buscan los que apuntan a assets/).'
    );
  }

  return {
    buildJs: basenameFromUrlOrPath(jsHref),
    buildCss: basenameFromUrlOrPath(cssHref)
  };
}

/** Actualiza las constantes BUILD_JS / BUILD_CSS del index.php destino */
function patchIndexPhp(indexPhpPath, buildJs, buildCss) {
  if (!existsSync(indexPhpPath)) {
    fail(
      `No existe el index.php destino:\n  ${indexPhpPath}\n\n` +
        'Crea el módulo en el repo school antes de desplegar. Puedes partir de la plantilla:\n' +
        '  deploy/index.php.template'
    );
  }

  // `^` con flag `m`: solo declaraciones al inicio de línea, para no tocar
  // menciones de BUILD_JS / BUILD_CSS dentro de comentarios (` * const BUILD_JS ...`).
  const php = readFileSync(indexPhpPath, 'utf8');
  const patched = php
    .replace(/^([ \t]*)const\s+BUILD_JS\s*=\s*['"][^'"]*['"]/m, `$1const BUILD_JS = '${buildJs}'`)
    .replace(/^([ \t]*)const\s+BUILD_CSS\s*=\s*['"][^'"]*['"]/m, `$1const BUILD_CSS = '${buildCss}'`);

  if (patched === php) {
    console.warn(
      '⚠ No se reemplazaron BUILD_JS / BUILD_CSS en index.php. ' +
        "Verifica que el archivo declare `const BUILD_JS = '...';` y `const BUILD_CSS = '...';`."
    );
    return;
  }

  if (isDryRun) {
    console.log(`[dry-run] index.php quedaría con BUILD_JS='${buildJs}' BUILD_CSS='${buildCss}'`);
    return;
  }

  writeFileSync(indexPhpPath, patched, 'utf8');
  console.log(`✔ index.php actualizado: BUILD_JS='${buildJs}' BUILD_CSS='${buildCss}'`);
}

function main() {
  const { schoolCodeRoot, targetRelativePath, targetDir } = resolveTarget();
  const targetAssetsDir = join(targetDir, 'assets');
  const distDir = join(projectRoot, 'dist');
  const distAssets = join(distDir, 'assets');

  console.log('── Despliegue course-viewer ──');
  console.log('schoolCode root :', schoolCodeRoot);
  console.log('módulo destino  :', targetRelativePath);
  console.log('ruta completa   :', targetDir);
  if (isDryRun) console.log('modo            : dry-run (no se escribe en el destino)');
  console.log('');

  // El destino debe existir de antemano (el módulo PHP se versiona en el repo school)
  if (!existsSync(targetDir)) {
    fail(
      `La carpeta destino no existe:\n  ${targetDir}\n\n` +
        'Créala en el repo school junto con su index.php (plantilla en deploy/index.php.template).'
    );
  }

  // 1. Limpiar dist/
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
    console.log('✔ Eliminado: dist/');
  }

  // 2. Limpiar assets del destino
  if (existsSync(targetAssetsDir)) {
    if (isDryRun) {
      console.log('[dry-run] se eliminaría:', targetAssetsDir);
    } else {
      rmSync(targetAssetsDir, { recursive: true, force: true });
      console.log('✔ Eliminado:', targetAssetsDir);
    }
  }

  // 3. Build
  console.log('\n▶ vite build\n');
  execSync('npx vite build', { stdio: 'inherit', cwd: projectRoot, env: process.env });

  if (!existsSync(distAssets)) {
    fail('No se encontró dist/assets tras el build.');
  }

  // 4. Copiar assets
  const { buildJs, buildCss } = readBuildAssetNames(distDir);

  if (isDryRun) {
    console.log('\n[dry-run] se copiaría dist/assets ->', targetAssetsDir);
  } else {
    cpSync(distAssets, targetAssetsDir, { recursive: true });
    console.log('\n✔ Copiado dist/assets ->', targetAssetsDir);
  }

  // 5. Parchear index.php
  patchIndexPhp(join(targetDir, 'index.php'), buildJs, buildCss);

  console.log('\n✔ Despliegue completado.\n');
}

main();

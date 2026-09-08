import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Carpeta del módulo dentro del repo PHP: School/<MODULE_DIR>.
 * Debe coincidir con `targetRelativePath` de deploy.config.json / scripts/build-deploy.mjs,
 * porque de ella depende la base con la que se resuelven los assets en producción.
 */
const MODULE_DIR = 'content_viewer'

/** Target por defecto del proxy de desarrollo (entorno local de pruebas) */
const DEFAULT_PROXY_TARGET = 'http://saberesmx.pruebas.local/src'

/**
 * Rutas del backend que el visor necesita servir desde el mismo origen en
 * desarrollo: los iframes del contenido, las imágenes del árbol y el logo, y
 * las páginas de la plataforma. Se proxean al host (sin `/src`) para que la
 * cookie de sesión PHP siga siendo válida dentro de los iframes.
 */
const DOMAIN_PROXY_PATHS = [
  '/tcu',
  '/images',
  // El visor legacy, que ahora vive en /content_viewer_v2 porque esta SPA se
  // quedó con /content_viewer. Ojo con volver a poner `/content_viewer` aquí:
  // Vite compara con startsWith, así que se tragaría también /content_viewer_v2
  // y —peor— en producción es la ruta de esta misma SPA.
  '/content_viewer_v2',
  '/show_quiz.php',
  // show_quiz.php no pinta el examen: redirige a exams.php (módulo nuevo, si la
  // universidad tiene el 815) o a permiso_quiz.php (rama legacy), y esa rebota de
  // vuelta. Sin las tres, el iframe del examen muere en el primer redirect.
  '/exams.php',
  '/permiso_quiz.php',
  // Preguntas tipo archivo del examen.
  '/valum',
  '/bienvenida_initdocs_grupos.php',
  '/bienvenida_initdocs.php',
  '/init.php',
  '/perfil.php',
  '/editar_perfil_saberes.php',
  '/salir.php',
  // El `/src` del backend choca con el del visor: BACKEND_FILE_PATTERN excluye
  // `/src` a propósito para no robarle a Vite sus propias fuentes en dev. Pero la
  // SPA del examen vive en exams.php, en la raíz del backend, y pide sus rutas
  // relativas — jQuery/Vue en `/src/public/libs`, y los siete endpoints en
  // `/src/App/Exams/EndPoints`. Solo esas dos carpetas se enrutan al backend.
  //
  // La barra final es obligatoria: Vite compara con `url.startsWith(clave)`, así
  // que `/src/App` a secas se traga también `/src/App.jsx` —el módulo raíz de este
  // front— y el visor se queda en blanco con un 404 del backend.
  '/src/App/',
  '/src/public/',
]

/**
 * Red de seguridad para el resto de los archivos del backend.
 *
 * Las páginas que se embeben en el iframe (tcu_user.php, show_quiz.php…) piden
 * decenas de recursos repartidos por todo el repo PHP: jQuery y bootstrap en
 * `/new_design`, Font Awesome en `/css` + `/fonts`, `/MathJax`, `/ckeditor`,
 * `/resources`, `/js`, más los `.php` que llaman por ajax (`/contenido.php`,
 * `/post_actions.php`, `/webservices/…`). Enumerarlos a mano se queda corto en
 * cuanto un contenido referencia una carpeta nueva, y el fallo siempre se ve
 * igual y sin error en rojo: el iframe pinta el cascarón del TCU (título,
 * "1 de N", barra de avance) pero con el cuerpo vacío y sin los botones de
 * navegación, porque Vite respondió su index.html donde iba jQuery o la hoja de
 * Font Awesome.
 *
 * Regla: cualquier ruta con extensión de archivo que no sea de Vite se manda al
 * backend. Lo de `public/` se excluye en `bypass` para que lo siga sirviendo el
 * front (favicon, iconos propios), y `/.well-known` también queda fuera: ahí solo
 * sondea Chrome DevTools (`com.chrome.devtools.json`) y el backend responde 404.
 */
const BACKEND_FILE_PATTERN =
  '^(?!/(?:api|src|@vite|@id|@fs|@react-refresh|node_modules|\\.well-known)(?:/|$))/[^?#]+\\.[a-zA-Z0-9]{1,8}(?:[?#]|$)'

/** Ruta servida desde public/: la resuelve Vite, no el proxy */
const isPublicAsset = (url) => {
  const pathname = decodeURIComponent(String(url || '').split(/[?#]/)[0])
  const publicDir = path.resolve(process.cwd(), 'public')
  const candidate = path.resolve(publicDir, `.${pathname}`)
  if (!candidate.startsWith(publicDir)) return false
  return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
}

/** Hosts remotos: contra ellos el proxy necesita Origin/Referer del propio dominio */
const REMOTE_HOST_PATTERN = /^https:\/\//i

/** Hosts de producción: se avisa en consola para que nadie escriba avance real sin querer */
const PRODUCTION_HOSTS = ['saberes.gob.mx', 'saberesmx.territorio.la', 'udg.territorio.la']

// Marca de tiempo para invalidar caché de los assets en cada build
const buildTimestamp = Date.now()

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Se lee sin prefijo para permitir VITE_API_PROXY_TARGET en .env
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || DEFAULT_PROXY_TARGET
  // El host sin `/src`, para las rutas de dominio (iframes, imágenes, páginas)
  const domainTarget = apiTarget.replace(/\/src\/?$/, '')

  // Cookie de sesión del backend remoto (p.ej. "PHPSESSID=abc123").
  // Sin esto, apuntar a un entorno remoto deja la app en modo invitado: el
  // navegador no manda a localhost las cookies de otro dominio.
  const backendCookie = env.VITE_BACKEND_COOKIE?.trim()
  const isRemote = REMOTE_HOST_PATTERN.test(domainTarget)
  const isProduction = PRODUCTION_HOSTS.some((host) => domainTarget.includes(host))

  if (command === 'serve') {
    console.log(`\n  API de desarrollo → ${apiTarget}`)
    if (isRemote && !backendCookie) {
      console.log(
        '  ⚠ Backend remoto sin VITE_BACKEND_COOKIE: la app quedará en modo invitado\n' +
          '    (sesión y JWT requieren la cookie del dominio remoto).',
      )
    }
    if (isProduction) {
      console.log(
        '  ⚠ ESTÁS APUNTANDO A PRODUCCIÓN. El avance que registres es real:\n' +
          '    course-progress recalcula tu progreso y al 100% finaliza el curso.',
      )
    }
    console.log('')
  }

  /**
   * Opciones comunes del proxy.
   *
   * Contra un backend remoto hacen falta dos ajustes que no son obvios:
   *  - Reescribir `origin` y `referer` al dominio destino: varios endpoints de
   *    Saberes validan esas cabeceras contra una whitelist y rechazarían un
   *    `http://localhost:5173`.
   *  - Inyectar la cookie de sesión, porque el navegador no puede mandarla.
   */
  const proxyOptions = (target, label, { quiet = false } = {}) => ({
    target,
    changeOrigin: true,
    // Certificado válido en remoto; en el vhost local puede ser autofirmado
    secure: isRemote,
    // Permite que el navegador acepte las cookies que devuelva el backend
    cookieDomainRewrite: '',
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        if (isRemote) {
          proxyReq.setHeader('origin', domainTarget)
          proxyReq.setHeader('referer', `${domainTarget}/`)
        }
        // Solo se inyecta si el navegador no trae cookie propia. tcu_user.php
        // crea su propia sesión al autenticar por JWT y devuelve un PHPSESSID
        // que (por cookieDomainRewrite) el navegador sí guarda; pisarlo con
        // VITE_BACKEND_COOKIE tumbaría esa sesión y los tcu_actions.php que el
        // TCU dispara después fallarían sin explicación.
        if (backendCookie && !req.headers.cookie) {
          proxyReq.setHeader('cookie', backendCookie)
        }
      })
      proxy.on('error', (err, req) => {
        console.log(`[${label}] error:`, req?.url, err?.message)
      })
      proxy.on('proxyRes', (proxyRes, req) => {
        // El catch-all mueve cientos de archivos por contenido (MathJax solo ya
        // son decenas): ahí se registra únicamente lo que falla.
        if (quiet && proxyRes.statusCode < 400) return
        console.log(`[${label}]`, proxyRes.statusCode, req.url)
      })
    },
  })

  const domainProxy = Object.fromEntries(
    DOMAIN_PROXY_PATHS.map((path) => [path, proxyOptions(domainTarget, 'proxy:domain')]),
  )

  return {
    plugins: [react()],

    // En build los assets se sirven desde /content_viewer/assets/... en el backend PHP
    base: command === 'build' ? `/${MODULE_DIR}/` : '/',

    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-${buildTimestamp}.js`,
          chunkFileNames: `assets/[name]-${buildTimestamp}-[hash].js`,
          assetFileNames: (assetInfo) =>
            assetInfo.name?.endsWith('.css')
              ? `assets/[name]-${buildTimestamp}.[ext]`
              : 'assets/[name]-[hash].[ext]',
        },
      },
    },

    server: {
      proxy: {
        // /api/saberes/user -> {apiTarget}/saberes/user
        '/api': {
          ...proxyOptions(apiTarget, 'proxy:api'),
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        ...domainProxy,
        // Al final a propósito: las claves anteriores tienen prioridad.
        [BACKEND_FILE_PATTERN]: {
          ...proxyOptions(domainTarget, 'proxy:assets', { quiet: true }),
          bypass: (req) => (isPublicAsset(req.url) ? req.url : undefined),
        },
      },
    },
  }
})

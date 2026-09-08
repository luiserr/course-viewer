# course-viewer

Front (Vite + React) del visor de cursos de SaberesMX: recreación en React del
módulo `content_viewer` (temario lateral + contenido + avance). Se despliega como
módulo del backend PHP en `School/courseViewer` del repo `LXP/schoolCode`.

URL del visor, con los mismos parámetros que el visor legacy:

```
/courseViewer/?idInit=<socialId>&idMateria=<idGrupo>&fromMalla=1&riesgo=0
```

`idMateria` es el id del curso (en la BD `idmateria` e `idgrupo` son el mismo
valor) y es lo único obligatorio. `idInit` solo se usa para enlazar al visor
clásico.

## Puesta en marcha

```bash
npm install
cp .env.example .env        # ajusta LXP_SCHOOL_CODE_ROOT
npm run dev
# abre http://localhost:5173/?idMateria=<idGrupo>
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con proxy `/api` hacia el backend |
| `npm run build` | Build **y** despliegue al repo PHP (`scripts/build-deploy.mjs`) |
| `npm run build:only` | Solo `vite build`, sin tocar el repo PHP |
| `npm run deploy:dry-run` | Build y muestra qué se copiaría/parchearía, sin escribir en el destino |
| `npm run lint` | oxlint |

## El visor de curso

```
src/components/CourseViewer.jsx   layout: barra superior + temario + contenido + pie
  ├── Navbar.jsx                  réplica de partials/navigationBar.php
  ├── CourseSidebar.jsx           banner, nombre, barra de avance y temario
  │     └── CourseTreeView.jsx    árbol recursivo con checks de completitud
  └── ContentFrame.jsx            bienvenida / iframe del contenido / aviso
src/hooks/useCourseTree.js        estado del árbol, selección y sincronización
src/services/courseViewerService.js  llamadas al backend
src/utils/courseTree.js           helpers del árbol (dedupe, flatten, búsqueda)
```

### Endpoints que consume

| Uso | Endpoint | Identidad |
|---|---|---|
| Árbol + avance | `GET mobile/course-tree?idGrupo=` | JWT (`x-authentication`) |
| Recalcular avance | `POST saberes/course-progress` `{course_id}` | sesión PHP |
| Marcar ítem suelto | `POST mobile/mark-complete` `{idPost, idGrupo}` | JWT |
| Nombre y foto del curso | `GET saberes/course?id=&visible_en_tienda=0` | sesión / JWT |

`course-tree` y `mark-complete` viven bajo `mobile/` porque son los únicos que
calculan el avance en el servidor. Resuelven la persona **solo** por JWT, y
`App\Mobile\Support\Auth` acepta el claim `id` que emite `saberes/user` — el mismo
token que ya guarda el `UserContext`, así que el visor web los puede usar tal cual.

### Cómo funciona el progreso

La fuente de verdad es la tabla `persona_has_post_completo`; el porcentaje lo
calcula el servidor en cada consulta (Plan B de
`.cursor-plans/progress/analisis-progreso.md`). **Este front nunca manda un
`avance`**: solo pide "recalcula el curso X" y vuelve a leer el árbol.

- Un ítem se pinta con el check verde (`#00753B`) si `is_complete`; gris
  (`#aaaaaa`) si no. Un TCU está completo cuando **todas** sus slides no-examen
  lo están — eso ya lo resuelve el servidor.
- La completitud de las slides la registra el propio TCU (`tcu_actions.php`)
  dentro del iframe, no este front. La de una evaluación la registra el módulo de
  exámenes al finalizarla (`AppExamsHandlersFinishExam`, que escribe la fila
  igual que hacía `show_quiz.php` en la ruta legacy).
- **Ojo con los dos criterios del servidor para una evaluación embebida en un
  TCU:** `mobile/course-tree` —de donde salen la barra, el contador y los
  checks— exige una fila en `persona_has_post_completo` por **cada** submódulo
  del TCU, incluida la evaluación; `saberes/course-progress` en cambio la da por
  buena con una calificación `>= CaliNota` en `persona_has_calificacion_examen`.
  Con el módulo 815 (SPA `exams.php`) el alumno nunca pasaba por `show_quiz.php`,
  que era quien escribía esa fila, así que terminar la evaluación movía el avance
  que persiste `course-progress` pero no el que muestra el visor.
- El avance se recalcula al **salir de cualquier contenido**: al elegir otro, al
  volver a la bienvenida, al cerrar la pestaña (`pagehide`), o cuando el iframe
  avisa `postMessage({type:'CONTENT_COMPLETED'})` — mismo contrato que la app
  móvil. No se limita a los TCU porque la completitud la registran las páginas
  embebidas (`tcu_actions.php`, `show_quiz.php`, …) y este front solo se entera
  volviendo a pedir el cálculo. Después de cada recálculo se relee `course-tree`
  para refrescar checks y %.
- `syncProgress` reutiliza el recálculo que ya esté en vuelo en vez de lanzar
  otro, así navegar rápido entre contenidos no dispara la ráfaga que
  `course-progress` responde con 429.
- `POST saberes/course-progress` responde 403 si el alumno no está inscrito o el
  curso no es interno, y 429 si se llama en ráfaga. Esos casos se registran en
  consola y **no** rompen la navegación.

### Tipos de contenido

| `type` | Comportamiento |
|---|---|
| `tema` | Carpeta expandible (arranca abierta, como el temario legacy) |
| `tcu` | iframe a `/tcu/tcu_user.php?idContenido=&idGrupo=&res_num=&jwt=` |
| `examen` / `sondeo` / `encuesta` | iframe a `/show_quiz.php?sinHeader=1&idExamen=&c=&jwt=` |
| `file` / `scorm` / `tarea` | Aviso + botón al visor clásico (ver limitación abajo) |

Los dos iframes llevan el JWT en la URL porque una navegación de iframe no puede
mandar headers. `tcu_user.php` y `show_quiz.php` lo resuelven con el helper
compartido `webservices/jwt_session.php` del backend, que hidrata `$_SESSION`
antes del control de acceso. Diferencia entre ambos: el TCU deja que el token
mande siempre, y el examen solo se hidrata si **no** hay sesión web válida — así
un `?jwt` en la URL no puede cambiar de identidad una sesión ya abierta (la que
crea el propio TCU al abrirse, por ejemplo).

El examen sigue exigiendo que la persona esté inscrita en el grupo
(`grupo_has_alumno` con `nivelParticipacion > 0` y `fechaSalida` nula): si no lo
está, `show_quiz.php` responde "No tiene permiso para contestar el examen. No
pertenece a la clase". Eso no es un problema de sesión — es inscripción.

Un examen que ya está enlazado a un TCU (`hasExam` + `examId`) se quita del
temario para no listarlo dos veces: `hasExam` sale de que el examen sea un
submódulo del TCU (`tcu_modulo` con fila en `examen`), así que ya viene embebido
como una de sus slides y se llega a él pasando páginas dentro del propio TCU. Por
eso el visor no pinta ningún botón "Ir a la evaluación": abriría lo mismo que el
alumno ya tiene delante. Los nodos con `locked` (precondiciones pendientes) no
se pueden abrir y muestran un candado.

### Navegación desde dentro del TCU

Las flechas del propio TCU no se quedan en sus slides: al llegar a la última,
`tcu.js` llama a `parent.goToResource(res_num + 1)` para pasar al siguiente
contenido del temario, y `parent.checkNum(res_num)` cuando detecta que el TCU
quedó completo. Las dos funciones las define el visor legacy en
`content_viewer/assets/js/script.js`; aquí las pone `useTcuBridge` sobre
`window`. Sin ellas la llamada revienta dentro del iframe y la flecha
simplemente no hace nada.

`res_num` es la posición 1-based del contenido en el temario. **`course-tree`
devuelve `resNum: 1` fijo para todos los TCU**
(`src/App/Mobile/Handlers/CourseTree.php`), así que la numeración real la pone
este front con el índice en `flatContent` y `goToResource` la resuelve contra esa
misma lista:

| Llamada del TCU | Qué hace el visor |
|---|---|
| `goToResource(n)` con `n` en rango | Abre `flatContent[n - 1]` (mismo camino que un clic en el temario) |
| `goToResource(n)` fuera de rango | Aviso "Ya viste el último contenido del temario" |
| `checkNum(n)` | Recalcula el avance y relee el árbol, para que el check aparezca sin salir del TCU |

Un `res_num` de 0 desactiva estos saltos en el propio TCU: es lo que recibe el
examen enlazado, que no está en `flatContent` porque se deduplica del temario.

Que el TCU esté incompleto no siempre bloquea el salto: `tcu_actions.php`
responde `isCompleted` como `"<completo>_<permitidoNavegar>"`, y
`permitidoNavegar` es 1 cuando la universidad tiene el módulo 608 (navegación
sin restricción) — el caso de SaberesMX. Sin ese módulo, el TCU alerta "Aún no
has terminado con esta unidad" y se queda donde está.

**Limitación conocida:** `course-tree` no devuelve la ruta real de los ítems
`file`/`scorm`/`tarea` (vive en `archivo.filepath`), así que no hay URL que armar
en el cliente y esos nodos se derivan al visor clásico. `markPostComplete()` ya
está implementado en `courseViewerService.js` para cuando el endpoint exponga
`path` y esos contenidos se puedan mostrar aquí.

### Look and feel

Los colores, medidas y assets se toman del visor legacy para que ambos se vean
igual: `--cv-primary: #611232`, secundario `#a98f31`, fondo `#f8f9fa`, barra de
avance `#003ae0`, panel lateral de 440px, tarjeta de contenido con
`border-radius: 1rem`. Los iconos del árbol son los mismos SVG del backend
(`/images/contenido/carpeta_abierta.svg`, `carpeta_cerrada.svg`, `documento.svg`,
`scorm.svg`) y las tipografías son las que publica
`/content_viewer/assets/css/fonts.css` (Roboto para el cuerpo, Lato para el pie).

Los checks, candados y flechas se dibujan como SVG inline (`src/components/Icons.jsx`)
en lugar de depender de Material Icons / Font Awesome por CDN.

En desarrollo, `vite.config.js` proxea además las rutas del backend que el visor
necesita (`/tcu`, `/images`, `/content_viewer`, `/show_quiz.php`,
`/bienvenida_initdocs_grupos.php`, `/init.php`, `/perfil.php`, `/salir.php`) para
que todo quede en el mismo origen y la cookie de sesión PHP siga siendo válida
dentro de los iframes. Por eso `getBaseDomain()` devuelve cadena vacía en dev.

A esa lista se suma un catch-all (`BACKEND_FILE_PATTERN`): **cualquier ruta con
extensión de archivo que no sea de Vite** (`/src`, `/@vite`, `/node_modules`, `/api`
y lo que exista en `public/`) se manda también al backend. Hace falta porque las
páginas que se embeben piden recursos repartidos por todo el repo PHP —jQuery y
bootstrap en `/new_design`, Font Awesome en `/css` + `/fonts`, `/MathJax`,
`/ckeditor`, `/resources`, `/js`— más los `.php` que llaman por ajax
(`/contenido.php`, `/post_actions.php`, `/webservices/…`). Sin el catch-all Vite
responde su `index.html` a esas rutas y el fallo se ve siempre igual, sin error en
rojo: el iframe pinta el cascarón del TCU (título, "1 de N", barra de avance) con
el cuerpo vacío y sin los botones de navegación, porque jQuery nunca cargó y los
iconos `fa` no tienen fuente. En producción no aplica: el módulo vive en el mismo
dominio que el backend.

## Sesión de usuario

`UserProvider` (montado en `src/main.jsx`) pide la sesión a `saberes/user` al arrancar
y la expone con el hook `useUser()`:

```jsx
import { useUser } from './contexts/UserContext';

function Perfil() {
  const { user, loading, error, isAuthenticated, isGuest, userName, retryFetchUser } = useUser();

  if (loading) return <p>Cargando…</p>;
  if (error) return <button onClick={retryFetchUser}>Reintentar</button>;
  if (isGuest) return <a href={getLoginUrl()}>Iniciar sesión</a>;

  return <p>{userName} · {user.email}</p>;
}
```

Valores del contexto: `user`, `loading`, `error`, `jwt`, `isAuthenticated`, `isGuest`,
`isAdmin`, `userName`, `userEmail`, `updateUser`, `login`, `logout`, `refreshUser`
(alias `retryFetchUser`).

Detalles del mecanismo:

- El JWT se guarda en `sessionStorage` (`user_jwt_token`) y se envía en el header
  `x-authentication` de toda petición. Si el backend devuelve un JWT renovado en los
  headers de respuesta, se persiste automáticamente.
- Las cookies de sesión PHP viajan con `credentials: 'include'`.
- Un **401 no es error**: la app queda en modo guest (`user === null`) sin mostrar aviso.
- `src/components/SessionStatus.jsx` es un indicador de apoyo para verificar la sesión
  en local; se puede quitar sin afectar el mecanismo.

## Peticiones a la API

`src/config/api.js` resuelve la URL según el entorno; no hay URLs hardcodeadas en los
componentes.

| Hostname | Entorno | Base |
|---|---|---|
| `localhost` / `127.0.0.1` / dev | development | proxy `/api` → `VITE_API_PROXY_TARGET` |
| `saberesmx-pruebas.territorio.la` | pruebas | `https://saberesmx-pruebas.territorio.la/src` |
| `saberesmx.territorio.la` | produccion | `https://saberesmx.territorio.la/src` |
| `saberes.gob.mx` | produccionGob | `https://saberes.gob.mx/src` |
| `udg.territorio.la` | produccionUDG | `https://udg.territorio.la/src` |

Cualquier otro hostname cae en `produccion`. `VITE_API_BASE_URL` fuerza la base e ignora
la detección por hostname.

Usa los helpers de `src/services/http.js` en lugar de `fetch` directo:

```js
import { apiGet, apiPost, ApiError, handleApiError } from './services/http';
import { API_ENDPOINTS } from './config/api';

try {
  const cursos = await apiGet(API_ENDPOINTS.COURSES);          // devuelve `data`
  await apiPost(API_ENDPOINTS.REGISTER_COURSE, payload);
} catch (err) {
  if (err instanceof ApiError && err.status === 401) { /* sesión caída */ }
  const { message, suggestion } = handleApiError(err, API_ENDPOINTS.COURSES);
}
```

- `apiGet/apiPost/apiPut/apiDelete` devuelven directamente `data` cuando la respuesta
  trae el wrapper `{ success, data }`; con `{ raw: true }` devuelven el cuerpo completo.
- Errores HTTP y `{ success: false }` con status 200 se convierten en `ApiError`
  (`status`, `endpoint`, `body`).
- `buildQuery({ ... })` arma querystrings omitiendo valores vacíos.
- `fetchWithJWT(url, options)` está disponible si necesitas la `Response` cruda.

Servicios por dominio en `src/services/`: `userService.js` (sesión) y
`courseService.js` (registro/consulta de cursos, ver `.ai/api.md`).

### Proxy de desarrollo

`vite.config.js` reescribe `/api/*` → `{VITE_API_PROXY_TARGET}/*`
(por defecto `http://saberesmx.pruebas.local/src`), añade headers CORS y loguea cada
petición. Así `/api/saberes/user` llega a `.../src/saberes/user`.

## Build y despliegue

`npm run build` ejecuta `scripts/build-deploy.mjs`:

1. Borra `dist/`.
2. Borra `<destino>/assets`.
3. Corre `vite build` (los assets salen como `index-<timestamp>.js|css`, y `base` queda
   en `/courseViewer/` para que las rutas resuelvan bajo el módulo PHP).
4. Copia `dist/assets` → `<destino>/assets`.
5. Lee los nombres reales del JS y CSS de `dist/index.html` y actualiza
   `const BUILD_JS` / `const BUILD_CSS` en `<destino>/index.php`.

### Configuración del destino

La raíz del repo school **no está hardcodeada**. Se resuelve en este orden:

1. Variable de entorno `LXP_SCHOOL_CODE_ROOT`
2. `.env` del proyecto (`LXP_SCHOOL_CODE_ROOT=...`)
3. `deploy.config.json` (`schoolCodeRoot`) — copia de `deploy.config.example.json`

La ruta del módulo es `School/courseViewer` por defecto; se puede cambiar con
`targetRelativePath` en `deploy.config.json` o con `LXP_TARGET_RELATIVE_PATH`.
Si la cambias, ajusta también `MODULE_DIR` en `vite.config.js` (define el `base` de
los assets).

`.env` y `deploy.config.json` están en `.gitignore`.

### Requisito en el repo school

La carpeta destino y su `index.php` deben existir antes del primer despliegue; el script
no los crea. Usa la plantilla `deploy/index.php.template`:

```bash
mkdir <LXP_SCHOOL_CODE_ROOT>/School/courseViewer
cp deploy/index.php.template <LXP_SCHOOL_CODE_ROOT>/School/courseViewer/index.php
```

El `index.php` debe declarar `const BUILD_JS = '...';` y `const BUILD_CSS = '...';` al
inicio de línea, con comillas simples; si no, el parcheo avisa y no cambia nada.

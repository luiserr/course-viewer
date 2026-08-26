Necesito automatizar el despliegue del front (Vite/React) hacia el backend PHP.

Contexto:
- Proyecto Vite en la raíz actual; el build genera `dist/` con `index.html` y `dist/assets/` (JS y CSS con hash).

Ruta de destino bajo el repo "school" (ajusta esto):
- Raíz configurable del clon (variable de entorno o archivo tipo deploy.config.json), por ejemplo: `LXP_SCHOOL_CODE_ROOT` o `schoolCodeRoot`.
- Dentro de esa raíz, la carpeta donde vive el gestor es: [ESCRIBE AQUÍ LA RUTA RELATIVA, ej. `School/admin/courseManager` o `School/otro/modulo`].

El script `npm run build` debe:
1. Borrar la carpeta `dist` del proyecto Vite.
2. Borrar la carpeta `assets` dentro de la ruta de destino indicada arriba (la carpeta final del módulo + `/assets`).
3. Ejecutar `vite build`.
4. Copiar recursivamente el contenido de `dist/assets` a `[ruta destino]/assets`.
5. Leer los nombres reales del JS y CSS desde `dist/index.html` y actualizar en `[ruta destino]/index.php` las constantes (o equivalentes) que referencian esos archivos, por ejemplo:
   - `const BUILD_JS = '…';`
   - `const BUILD_CSS = '…';`
   (Si los nombres de constantes o el archivo PHP son distintos, adaptar según el proyecto.)

Requisitos:
- La raíz del repo school NO debe estar hardcodeada: solo en `.env` (ej. `LXP_SCHOOL_CODE_ROOT=`) y/o `deploy.config.json` con un ejemplo versionado (`deploy.config.example.json`).
- Documentar en `.env.example` la variable necesaria.
- Añadir a `.gitignore` lo que sea local (`.env`, `deploy.config.json` si aplica).

Implementa con un script Node (`.mjs`) invocado desde `package.json` en el script `build`.
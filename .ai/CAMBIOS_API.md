# Resumen de Cambios - Comunicación con la API

Este documento describe todos los cambios implementados para la comunicación con la API en el proyecto. Úsalo como guía para replicar estos cambios en otros proyectos.

## 📋 Tabla de Contenidos

1. [Configuración Centralizada de API](#configuración-centralizada-de-api)
2. [Sistema de Autenticación JWT](#sistema-de-autenticación-jwt)
3. [Proxy para Desarrollo](#proxy-para-desarrollo)
4. [Manejo de Entornos](#manejo-de-entornos)
5. [Función Helper para Peticiones](#función-helper-para-peticiones)
6. [Endpoints Disponibles](#endpoints-disponibles)
7. [Pasos para Implementar en Otro Proyecto](#pasos-para-implementar-en-otro-proyecto)

---

## 🔧 Configuración Centralizada de API

### Archivo: `src/config/api.js`

Este archivo centraliza toda la configuración de la API, incluyendo:
- Detección automática del entorno (desarrollo, pruebas, producción)
- URLs base según el dominio
- Endpoints disponibles
- Funciones helper para construir URLs

### Características Principales:

1. **Detección Automática de Entorno**
   - Detecta automáticamente si está en desarrollo, pruebas o producción
   - Basado en `window.location.hostname`
   - Soporta múltiples dominios de producción

2. **URLs por Entorno**
   ```javascript
   - Desarrollo: http://saberesmx.pruebas.local/src
   - Pruebas: https://saberesmx-pruebas.territorio.la/src
   - Producción: https://saberesmx.territorio.la/src
   - Producción (gob.mx): https://saberes.gob.mx/src
   - Producción (UDG): https://udg.territorio.la/src
   ```

3. **Función `buildApiUrl(endpoint)`**
   - En desarrollo: usa proxy `/api/{endpoint}`
   - En producción: usa URL completa `{API_BASE_URL}/{endpoint}`

4. **Función `getApiEndpoint(endpointKey)`**
   - Obtiene la URL completa de un endpoint usando su clave

---

## 🔐 Sistema de Autenticación JWT

### Archivo: `src/contexts/UserContext.js`

### Componentes Clave:

1. **Almacenamiento de JWT**
   - Se guarda en `sessionStorage` con la clave `'user_jwt_token'`
   - Funciones helper:
     - `getJWTFromStorage()`: Obtiene el JWT del storage
     - `saveJWTToStorage(jwt)`: Guarda o elimina el JWT

2. **Función `fetchWithJWT(url, options)`**
   - Función helper que automáticamente:
     - Obtiene el JWT del sessionStorage
     - Lo agrega al header `x-authentication`
     - Maneja el proxy en desarrollo
     - Incluye headers necesarios (Accept, Content-Type, Cache-Control)
     - Maneja errores de CORS con fallback

3. **UserContext Provider**
   - Proporciona estado global del usuario
   - Carga automáticamente los datos del usuario al montar
   - Maneja autenticación y modo guest
   - Expone hook `useUser()` para acceder al contexto

### Uso del JWT:

```javascript
// El JWT se incluye automáticamente en todas las peticiones
const response = await fetchWithJWT(url, {
  method: 'POST',
  body: JSON.stringify(data)
});

// El header se agrega así:
headers['x-authentication'] = jwt;
```

---

## 🔀 Proxy para Desarrollo

### Archivo: `src/setupProxy.js`

### Configuración:

1. **Target del Proxy**
   - Target principal: `http://saberesmx.pruebas.local/src`
   - Fallbacks configurados para diferentes puertos

2. **Manejo de CORS**
   - Headers CORS configurados automáticamente
   - Soporte para preflight (OPTIONS)
   - Headers permitidos: `Content-Type`, `Authorization`, `x-authentication`, `Accept`

3. **Path Rewrite**
   - Las peticiones a `/api/*` se reescriben eliminando el prefijo `/api`
   - Ejemplo: `/api/saberes/user` → `http://saberesmx.pruebas.local/src/saberes/user`

4. **Logging y Debugging**
   - Logs detallados de peticiones y respuestas
   - Endpoints de health check y test

### Dependencia Requerida:

```json
{
  "devDependencies": {
    "http-proxy-middleware": "^2.0.6"
  }
}
```

---

## 🌍 Manejo de Entornos

### Detección de Entorno

El sistema detecta automáticamente el entorno basándose en:

1. **`process.env.NODE_ENV`**: 'development' o 'production'
2. **`window.location.hostname`**: Dominio actual

### Entornos Soportados:

| Hostname | Entorno | API Base URL |
|----------|---------|--------------|
| `localhost` o `127.0.0.1` | Desarrollo | `http://saberesmx.pruebas.local/src` |
| `saberesmx-pruebas.territorio.la` | Pruebas | `https://saberesmx-pruebas.territorio.la/src` |
| `saberesmx.territorio.la` | Producción | `https://saberesmx.territorio.la/src` |
| `saberes.gob.mx` | Producción | `https://saberes.gob.mx/src` |
| `udg.territorio.la` | Producción | `https://udg.territorio.la/src` |

### Lógica de URLs:

```javascript
// En desarrollo/localhost
if (isDevelopment || isLocalhost) {
  // Usar proxy
  url = `/api/${endpoint}`;
} else {
  // Usar URL completa
  url = `${API_BASE_URL}/${endpoint}`;
}
```

---

## 📡 Función Helper para Peticiones

### `fetchWithJWT(url, options)`

Esta función centraliza todas las peticiones HTTP con las siguientes características:

1. **Inclusión Automática de JWT**
   - Obtiene el JWT del sessionStorage
   - Lo agrega al header `x-authentication`
   - Si no hay JWT, la petición se hace sin autenticación (modo guest)

2. **Headers por Defecto**
   ```javascript
   {
     'Accept': 'application/json, text/plain, */*',
     'Content-Type': 'application/json',
     'Cache-Control': 'no-cache',
     'Pragma': 'no-cache',
     'x-authentication': jwt // Si existe
   }
   ```

3. **Manejo de Proxy**
   - En desarrollo, convierte URLs a formato proxy
   - Ejemplo: `saberes/user` → `/api/saberes/user`

4. **Manejo de Errores**
   - Detecta errores de CORS
   - Intenta fallback con `no-cors` si es necesario
   - Logs detallados para debugging

5. **Configuración de Fetch**
   ```javascript
   {
     method: 'GET', // o el método especificado en options
     mode: 'cors',
     credentials: 'include',
     headers: headers
   }
   ```

---

## 📚 Endpoints Disponibles

### Definidos en `src/config/api.js`:

```javascript
export const API_ENDPOINTS = {
  // Filtros
  FILTERS: 'saberes/filters',
  
  // Cursos
  COURSES: 'saberes/courses',
  COURSE_DETAIL: 'saberes/course',
  ENROLL: 'saberes/enrollment',
  
  // Rutas de formación
  STUDY_PLAN_ENROLLMENT: 'saberes/study-plan-enrollment',
  
  // Usuario
  USER: 'saberes/user',
  
  // Likes y puntuaciones
  LIKES: 'saberes/likes',
  
  // Recomendaciones
  RECOMMENDATIONS: 'saberes/recommendations',
  
  // Aprendizaje
  LEARNING: 'saberes/learning',
  
  // Cursos con likes
  COURSES_WITH_LIKES: 'saberes/courses-with-likes',
  
  // Universidades
  UNIVERSITY: 'saberes/departments',
  UNIVERSITY_COURSES: 'saberes/departments',
  
  // Noticias
  NEWS: 'saberes/news',
  
  // Grupos de estudio
  STUDY_GROUPS: 'saberes/study-groups',
  
  // Certificados
  CERTIFICATES: 'saberes/certificates',
  
  // Auth
  LOGIN: 'index.php?login=true&redirect=catalog',
  REGISTER: 'registro_alumno.php'
};
```

---

## 🚀 Pasos para Implementar en Otro Proyecto

### 1. Instalar Dependencias

```bash
npm install http-proxy-middleware --save-dev
```

### 2. Crear Archivo de Configuración de API

Crear `src/config/api.js` con:
- Detección de entorno
- URLs base por entorno
- Función `buildApiUrl()`
- Objeto `API_ENDPOINTS`
- Funciones helper adicionales

### 3. Crear Contexto de Usuario

Crear `src/contexts/UserContext.js` con:
- Funciones para manejar JWT en sessionStorage
- Función `fetchWithJWT()`
- `UserProvider` component
- Hook `useUser()`

### 4. Configurar Proxy

Crear `src/setupProxy.js` con:
- Configuración de `http-proxy-middleware`
- Manejo de CORS
- Path rewrite
- Logging

### 5. Envolver la App con UserProvider

En `src/index.js` o `src/App.js`:

```javascript
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      {/* Resto de la aplicación */}
    </UserProvider>
  );
}
```

### 6. Actualizar Componentes Existentes

Reemplazar todas las llamadas directas a `fetch()` con `fetchWithJWT()`:

**Antes:**
```javascript
const response = await fetch('http://localhost/src/endpoint.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

**Después:**
```javascript
import { fetchWithJWT } from '../contexts/UserContext';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const response = await fetchWithJWT(
  buildApiUrl(API_ENDPOINTS.ENDPOINT_NAME),
  {
    method: 'POST',
    body: JSON.stringify(data)
  }
);
```

### 7. Manejo de Entornos en Peticiones

En cada componente que haga peticiones:

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

let url;
if (isDevelopment || isLocalhost) {
  url = `/api/${API_ENDPOINTS.ENDPOINT_NAME}`;
} else {
  url = buildApiUrl(API_ENDPOINTS.ENDPOINT_NAME);
}

const response = await fetchWithJWT(url, options);
```

### 8. Verificar Funcionamiento

1. **En Desarrollo:**
   - Verificar que las peticiones usen el proxy `/api/*`
   - Verificar logs en consola del navegador
   - Verificar que el JWT se incluya en headers

2. **En Producción:**
   - Verificar que las peticiones usen URLs completas
   - Verificar que no haya errores de CORS
   - Verificar autenticación

---

## 📝 Ejemplo Completo de Uso

### Componente que hace petición a la API:

```javascript
import React, { useState, useEffect } from 'react';
import { useUser, fetchWithJWT } from '../contexts/UserContext';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const MyComponent = () => {
  const { user, isAuthenticated } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Determinar URL según entorno
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalhost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        let url;
        if (isDevelopment || isLocalhost) {
          url = `/api/${API_ENDPOINTS.COURSES}`;
        } else {
          url = buildApiUrl(API_ENDPOINTS.COURSES);
        }
        
        // Hacer petición con JWT automático
        const response = await fetchWithJWT(url);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error al obtener datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <div>Cargando...</div>;
  if (!data) return <div>No hay datos</div>;
  
  return (
    <div>
      {/* Renderizar datos */}
    </div>
  );
};

export default MyComponent;
```

---

## 🔍 Puntos Importantes

1. **JWT en SessionStorage**
   - El JWT se guarda automáticamente cuando el usuario se autentica
   - Se incluye automáticamente en todas las peticiones
   - Se limpia al cerrar sesión

2. **Modo Guest**
   - Si no hay JWT, las peticiones se hacen sin autenticación
   - El sistema maneja respuestas 401 como modo guest normal

3. **CORS en Desarrollo**
   - El proxy maneja CORS automáticamente
   - No se necesitan configuraciones adicionales en el backend para desarrollo

4. **Producción**
   - En producción, el proxy no se usa
   - Las peticiones van directamente a la API
   - El backend debe tener CORS configurado correctamente

5. **Headers Importantes**
   - `x-authentication`: JWT token
   - `Accept`: `application/json, text/plain, */*`
   - `Content-Type`: `application/json`
   - `Cache-Control`: `no-cache`

---

## ✅ Checklist de Implementación

- [ ] Instalar `http-proxy-middleware`
- [ ] Crear `src/config/api.js` con toda la configuración
- [ ] Crear `src/contexts/UserContext.js` con JWT y fetchWithJWT
- [ ] Crear `src/setupProxy.js` con configuración de proxy
- [ ] Envolver App con `UserProvider`
- [ ] Reemplazar todas las llamadas `fetch()` con `fetchWithJWT()`
- [ ] Actualizar URLs hardcodeadas a usar `buildApiUrl()` y `API_ENDPOINTS`
- [ ] Agregar lógica de entorno en cada petición
- [ ] Probar en desarrollo (con proxy)
- [ ] Probar en producción (sin proxy)
- [ ] Verificar que el JWT se incluya correctamente
- [ ] Verificar manejo de errores y modo guest

---

## 📞 Notas Adicionales

- El sistema está diseñado para funcionar tanto en desarrollo como en producción sin cambios de código
- La detección de entorno es automática basada en el hostname
- Todos los logs de debugging están disponibles en la consola del navegador
- El sistema maneja automáticamente usuarios guest (no autenticados)

---

**Última actualización:** Diciembre 2024
**Versión del proyecto:** 0.1.0

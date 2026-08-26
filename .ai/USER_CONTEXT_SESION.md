# UserContext - Guía de Ajustes y Obtención de Sesión

Este documento describe en detalle cómo funciona el `UserContext`, cómo obtener la sesión del usuario, y todos los ajustes relacionados con la autenticación y gestión de sesiones.

## 📋 Tabla de Contenidos

1. [Estructura del UserContext](#estructura-del-usercontext)
2. [Obtención de la Sesión](#obtención-de-la-sesión)
3. [Estructura de Datos del Usuario](#estructura-de-datos-del-usuario)
4. [Manejo del JWT](#manejo-del-jwt)
5. [Funciones Disponibles](#funciones-disponibles)
6. [Hook useUser](#hook-useuser)
7. [Flujo de Autenticación](#flujo-de-autenticación)
8. [Ejemplos de Uso](#ejemplos-de-uso)
9. [Manejo de Errores](#manejo-de-errores)
10. [Implementación en Otro Proyecto](#implementación-en-otro-proyecto)

---

## 🏗️ Estructura del UserContext

### Archivo: `src/contexts/UserContext.js`

El `UserContext` es un contexto de React que proporciona:
- Estado global del usuario autenticado
- Funciones para gestionar la sesión
- Autenticación automática al cargar la aplicación
- Manejo de modo guest (usuario no autenticado)

### Componentes Principales:

1. **UserProvider**: Componente que envuelve la aplicación y proporciona el contexto
2. **useUser**: Hook personalizado para acceder al contexto
3. **Funciones helper**: Para manejar JWT y peticiones HTTP

---

## 🔍 Obtención de la Sesión

### Proceso Automático

El `UserContext` obtiene automáticamente la sesión del usuario cuando la aplicación se carga:

```javascript
// En UserProvider, useEffect se ejecuta al montar
useEffect(() => {
  fetchUser(); // Se ejecuta automáticamente
}, []);
```

### Función `fetchUser()`

Esta función es la encargada de obtener los datos del usuario desde la API:

```javascript
const fetchUser = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Determinar URL según entorno
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    let url;
    if (isDevelopment || isLocalhost) {
      url = `/api/${API_ENDPOINTS.USER}`;
    } else {
      url = getApiEndpoint('USER');
    }
    
    // Hacer petición con JWT automático
    const response = await fetchWithJWT(url);
    
    // Manejar respuesta
    if (!response.ok) {
      if (response.status === 401) {
        // Usuario no autenticado (modo guest)
        setUser(null);
        return;
      }
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data?.success && data?.data) {
      // Transformar y guardar datos del usuario
      const userInfo = {
        id: data.data.id,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        // ... más campos
        sessionInfo: data.session_info || null,
        jwt: data.session_info.jwt || null
      };
      
      // Guardar JWT si existe
      if (userInfo.jwt) {
        saveJWTToStorage(userInfo.jwt);
      }
      
      setUser(userInfo);
    }
  } catch (err) {
    // Manejo de errores
    setUser(null); // Mantener como guest
  } finally {
    setLoading(false);
  }
};
```

### Endpoint de la API

El endpoint utilizado es: `saberes/user`

**Estructura de respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "firstName": "Juan",
    "lastName": "Pérez",
    "surName": "García",
    "uid": "user123",
    "email": "juan@example.com",
    "name": "Juan Pérez García",
    "adminId": null
  },
  "session_info": {
    "session_id": "477bdd9a943e97967f0eda9c1b22e0ac",
    "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-12-01T10:30:00Z"
}
```

---

## 📊 Estructura de Datos del Usuario

### Objeto `user` en el Contexto

Cuando el usuario está autenticado, el objeto `user` tiene la siguiente estructura:

```javascript
{
  // Datos básicos
  id: 123,                          // ID del usuario
  firstName: "Juan",                // Nombre
  lastName: "Pérez",                // Apellido paterno
  surName: "García",                // Apellido materno
  uid: "user123",                   // UID único
  email: "juan@example.com",        // Email
  name: "Juan Pérez García",        // Nombre completo (del API)
  fullName: "Juan Pérez",           // Nombre completo formateado
  
  // Información de sesión
  sessionInfo: {                    // Información completa de sesión
    session_id: "477bdd9a943e97967f0eda9c1b22e0ac",
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  timestamp: "2024-12-01T10:30:00Z", // Timestamp de la sesión
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // JWT token
  
  // Permisos
  isAdmin: false                    // Si es administrador
}
```

### Cuando el usuario NO está autenticado:

```javascript
user = null  // Usuario en modo guest
```

---

## 🔐 Manejo del JWT

### Almacenamiento

El JWT se almacena en `sessionStorage` con la clave `'user_jwt_token'`:

```javascript
// Guardar JWT
sessionStorage.setItem('user_jwt_token', jwt);

// Obtener JWT
const jwt = sessionStorage.getItem('user_jwt_token');

// Eliminar JWT
sessionStorage.removeItem('user_jwt_token');
```

### Funciones Helper

#### `getJWTFromStorage()`

Obtiene el JWT del sessionStorage:

```javascript
import { getJWTFromStorage } from '../contexts/UserContext';

const jwt = getJWTFromStorage();
if (jwt) {
  console.log('JWT disponible:', jwt.substring(0, 20) + '...');
} else {
  console.log('No hay JWT');
}
```

#### `saveJWTToStorage(jwt)`

Guarda o elimina el JWT del sessionStorage:

```javascript
import { saveJWTToStorage } from '../contexts/UserContext';

// Guardar JWT
saveJWTToStorage('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// Eliminar JWT (cerrar sesión)
saveJWTToStorage(null);
```

### Inclusión Automática en Peticiones

El JWT se incluye automáticamente en todas las peticiones HTTP a través de `fetchWithJWT()`:

```javascript
// El JWT se obtiene automáticamente y se agrega al header
headers['x-authentication'] = jwt;
```

### Flujo del JWT

1. **Al obtener la sesión:**
   - La API devuelve el JWT en `data.session_info.jwt`
   - Se guarda automáticamente en sessionStorage
   - Se incluye en el objeto `user`

2. **En peticiones HTTP:**
   - `fetchWithJWT()` obtiene el JWT del sessionStorage
   - Lo agrega al header `x-authentication`
   - Si no hay JWT, la petición se hace sin autenticación (modo guest)

3. **Al cerrar sesión:**
   - Se elimina el JWT del sessionStorage
   - Se limpia el estado del usuario

---

## 🛠️ Funciones Disponibles

### En el Contexto (disponibles a través de `useUser()`)

#### `user`
Objeto con los datos del usuario autenticado, o `null` si es guest.

#### `loading`
Boolean que indica si se está cargando la información del usuario.

#### `error`
String con el mensaje de error, o `null` si no hay error.

#### `updateUser(updatedUserData)`
Actualiza los datos del usuario en el contexto:

```javascript
const { updateUser } = useUser();

updateUser({
  firstName: 'Nuevo Nombre',
  email: 'nuevo@email.com'
});
```

#### `logout()`
Cierra la sesión del usuario:

```javascript
const { logout } = useUser();

const handleLogout = () => {
  logout();
  // El usuario ahora es null (modo guest)
};
```

#### `retryFetchUser()`
Reintenta obtener los datos del usuario:

```javascript
const { retryFetchUser } = useUser();

// Si hubo un error, puedes reintentar
retryFetchUser();
```

#### `isAuthenticated`
Boolean derivado que indica si el usuario está autenticado:

```javascript
const { isAuthenticated } = useUser();
// true si user !== null, false si user === null
```

#### `isGuest`
Boolean derivado que indica si el usuario es guest:

```javascript
const { isGuest } = useUser();
// true si user === null, false si user !== null
```

#### `userName`
String con el nombre del usuario o 'Usuario Guest':

```javascript
const { userName } = useUser();
// "Juan Pérez" o "Usuario Guest"
```

#### `userEmail`
String con el email del usuario o `null`:

```javascript
const { userEmail } = useUser();
// "juan@example.com" o null
```

### Funciones Exportadas (no requieren hook)

#### `fetchWithJWT(url, options)`
Función helper para hacer peticiones HTTP con JWT automático:

```javascript
import { fetchWithJWT } from '../contexts/UserContext';

const response = await fetchWithJWT(url, {
  method: 'POST',
  body: JSON.stringify(data)
});
```

#### `handleApiError(error, endpoint)`
Función helper para manejar errores de API:

```javascript
import { handleApiError } from '../contexts/UserContext';

try {
  // ... petición
} catch (error) {
  const errorInfo = handleApiError(error, 'endpoint-name');
  console.error(errorInfo.message);
  console.log(errorInfo.suggestion);
}
```

---

## 🎣 Hook useUser

### Uso Básico

```javascript
import { useUser } from '../contexts/UserContext';

const MyComponent = () => {
  const { user, loading, isAuthenticated } = useUser();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  if (isAuthenticated) {
    return <div>Hola, {user.name}!</div>;
  }
  
  return <div>Usuario Guest</div>;
};
```

### Acceso a Todos los Valores

```javascript
const {
  user,              // Datos del usuario o null
  loading,           // Boolean
  error,             // String o null
  updateUser,        // Función
  logout,            // Función
  retryFetchUser,    // Función
  isAuthenticated,   // Boolean
  isGuest,           // Boolean
  userName,          // String
  userEmail          // String o null
} = useUser();
```

### Verificación de Autenticación

```javascript
const { isAuthenticated, user } = useUser();

if (isAuthenticated) {
  // Usuario autenticado
  console.log('Usuario:', user.name);
  console.log('Email:', user.email);
  console.log('JWT:', user.jwt);
} else {
  // Usuario guest
  console.log('Usuario no autenticado');
}
```

---

## 🔄 Flujo de Autenticación

### 1. Carga Inicial de la Aplicación

```
1. App se monta
2. UserProvider se monta
3. useEffect ejecuta fetchUser()
4. fetchUser() hace petición a /api/saberes/user
5. Si hay JWT en sessionStorage, se incluye en headers
6. API responde con datos del usuario
7. JWT se guarda en sessionStorage
8. Estado user se actualiza
9. loading se establece en false
```

### 2. Usuario Autenticado

```
Usuario tiene sesión activa
  ↓
fetchUser() obtiene datos
  ↓
JWT se guarda en sessionStorage
  ↓
user se establece con datos
  ↓
isAuthenticated = true
```

### 3. Usuario Guest (No Autenticado)

```
Usuario no tiene sesión
  ↓
fetchUser() recibe 401
  ↓
user se establece en null
  ↓
isAuthenticated = false
isGuest = true
```

### 4. Login Externo

El login se maneja fuera de React (redirección a PHP):

```javascript
// Usuario hace login en página PHP
// PHP establece sesión y cookie
// Usuario regresa a React
// fetchUser() detecta la sesión
// JWT se obtiene de la respuesta
```

### 5. Cerrar Sesión

```javascript
const { logout } = useUser();

logout();
// 1. user se establece en null
// 2. JWT se elimina de sessionStorage
// 3. isAuthenticated = false
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Mostrar Información del Usuario

```javascript
import { useUser } from '../contexts/UserContext';

const UserProfile = () => {
  const { user, loading, isAuthenticated } = useUser();
  
  if (loading) {
    return <div>Cargando perfil...</div>;
  }
  
  if (!isAuthenticated) {
    return <div>Por favor, inicia sesión</div>;
  }
  
  return (
    <div>
      <h2>Perfil de Usuario</h2>
      <p><strong>Nombre:</strong> {user.fullName}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>ID:</strong> {user.id}</p>
      {user.isAdmin && <p><strong>Rol:</strong> Administrador</p>}
    </div>
  );
};
```

### Ejemplo 2: Botón de Login/Logout Condicional

```javascript
import { useUser } from '../contexts/UserContext';
import { getLoginUrl } from '../config/api';

const AuthButton = () => {
  const { isAuthenticated, user, logout } = useUser();
  
  if (isAuthenticated) {
    return (
      <div>
        <span>Hola, {user.name}</span>
        <button onClick={logout}>Cerrar Sesión</button>
      </div>
    );
  }
  
  return (
    <a href={getLoginUrl()}>Iniciar Sesión</a>
  );
};
```

### Ejemplo 3: Ruta Protegida

```javascript
import { useUser } from '../contexts/UserContext';
import { Navigate } from 'react-router-dom';

const ProtectedComponent = ({ children }) => {
  const { isAuthenticated, loading } = useUser();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};
```

### Ejemplo 4: Actualizar Datos del Usuario

```javascript
import { useUser } from '../contexts/UserContext';

const UpdateProfile = () => {
  const { user, updateUser } = useUser();
  const [newEmail, setNewEmail] = useState(user?.email || '');
  
  const handleUpdate = () => {
    // Actualizar en el contexto (y eventualmente en la API)
    updateUser({
      email: newEmail
    });
  };
  
  return (
    <div>
      <input 
        value={newEmail} 
        onChange={(e) => setNewEmail(e.target.value)} 
      />
      <button onClick={handleUpdate}>Actualizar</button>
    </div>
  );
};
```

### Ejemplo 5: Obtener JWT Manualmente

```javascript
import { getJWTFromStorage } from '../contexts/UserContext';

const MyComponent = () => {
  const jwt = getJWTFromStorage();
  
  if (jwt) {
    console.log('JWT disponible');
    // Usar JWT para algo específico
  } else {
    console.log('No hay JWT');
  }
  
  return <div>...</div>;
};
```

### Ejemplo 6: Petición con JWT Automático

```javascript
import { fetchWithJWT } from '../contexts/UserContext';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';

const MyComponent = () => {
  const fetchData = async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.COURSES);
      
      // El JWT se incluye automáticamente
      const response = await fetchWithJWT(url);
      
      if (!response.ok) {
        throw new Error('Error en la petición');
      }
      
      const data = await response.json();
      console.log('Datos:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return <button onClick={fetchData}>Obtener Datos</button>;
};
```

---

## ⚠️ Manejo de Errores

### Errores Comunes

#### 1. Error 401 (Unauthorized)

```javascript
// Esto es normal para usuarios guest
if (response.status === 401) {
  // Usuario no autenticado
  // Se maneja automáticamente como modo guest
}
```

#### 2. Error de CORS

```javascript
// Se maneja automáticamente en fetchWithJWT
// Intenta fallback con no-cors si es necesario
```

#### 3. Error de Red

```javascript
// Se captura en el catch
// El usuario se mantiene como guest
// No se muestra error al usuario
```

### Manejo de Errores en Componentes

```javascript
import { useUser } from '../contexts/UserContext';

const MyComponent = () => {
  const { user, loading, error, retryFetchUser } = useUser();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={retryFetchUser}>Reintentar</button>
      </div>
    );
  }
  
  // Resto del componente
};
```

---

## 🚀 Implementación en Otro Proyecto

### Paso 1: Crear el Archivo UserContext

Crear `src/contexts/UserContext.js` con:
- Constantes para sessionStorage
- Funciones helper para JWT
- Función `fetchWithJWT()`
- `UserProvider` component
- Hook `useUser()`

### Paso 2: Configurar el Endpoint de Usuario

En `src/config/api.js`, asegurar que existe:

```javascript
export const API_ENDPOINTS = {
  USER: 'saberes/user', // o el endpoint correspondiente
  // ... otros endpoints
};
```

### Paso 3: Envolver la App

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

### Paso 4: Usar en Componentes

```javascript
import { useUser } from '../contexts/UserContext';

const MyComponent = () => {
  const { user, isAuthenticated } = useUser();
  // ...
};
```

### Paso 5: Verificar Estructura de Respuesta de la API

Asegurar que la API devuelve:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "firstName": "...",
    "lastName": "...",
    "email": "...",
    // ... otros campos
  },
  "session_info": {
    "jwt": "..."
  }
}
```

### Paso 6: Ajustar Campos del Usuario

Si la estructura de la API es diferente, ajustar en `fetchUser()`:

```javascript
const userInfo = {
  id: data.data.id,
  // Ajustar según la estructura real de tu API
  firstName: data.data.firstName,
  // ...
  jwt: data.session_info.jwt || null
};
```

---

## 📝 Checklist de Implementación

- [ ] Crear `src/contexts/UserContext.js`
- [ ] Implementar funciones helper para JWT
- [ ] Implementar `fetchWithJWT()`
- [ ] Implementar `UserProvider`
- [ ] Implementar hook `useUser()`
- [ ] Configurar endpoint de usuario en `api.js`
- [ ] Envolver App con `UserProvider`
- [ ] Verificar estructura de respuesta de la API
- [ ] Ajustar campos del usuario según la API
- [ ] Probar obtención de sesión
- [ ] Probar modo guest (sin autenticación)
- [ ] Probar cierre de sesión
- [ ] Verificar que JWT se guarda correctamente
- [ ] Verificar que JWT se incluye en peticiones

---

## 🔑 Puntos Clave

1. **Sesión Automática**: La sesión se obtiene automáticamente al cargar la app
2. **JWT en SessionStorage**: El JWT se guarda en sessionStorage y se incluye automáticamente en peticiones
3. **Modo Guest**: Si no hay sesión, el usuario es `null` (modo guest)
4. **Estado Loading**: Siempre verificar `loading` antes de usar `user`
5. **401 es Normal**: Un 401 no es un error, indica modo guest
6. **No Mostrar Errores a Guest**: Los errores de conexión no se muestran al usuario guest

---

## 📞 Notas Adicionales

- El JWT se obtiene de la respuesta de la API, no se genera en el frontend
- La sesión se mantiene mientras el usuario tenga una sesión activa en el backend
- El JWT se elimina al cerrar la pestaña del navegador (sessionStorage)
- Para mantener la sesión entre pestañas, considerar usar `localStorage` en lugar de `sessionStorage`

---

**Última actualización:** Diciembre 2024
**Versión del proyecto:** 0.1.0

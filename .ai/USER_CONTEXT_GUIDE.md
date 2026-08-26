# Guía de Uso del UserContext

## Resumen

Se ha implementado un sistema de contexto global para manejar la información del usuario obtenida del endpoint `/src/App/Saberes/endpoints/user.php`. El contexto se encarga automáticamente de obtener los datos del usuario al iniciar la aplicación y los pone disponibles para todos los componentes hijos.

## Implementación

### Archivos Creados/Modificados

1. **`src/contexts/UserContext.js`** - Contexto principal del usuario
2. **`src/components/Layout.js`** - Modificado para usar el contexto
3. **`src/App.js`** - Envuelto con UserProvider
4. **`src/config/api.js`** - Añadido endpoint USER
5. **`src/components/Header.js`** - Ejemplo de uso del contexto

## Cómo Usar el UserContext

### 1. Importar el Hook

```javascript
import { useUser } from '../contexts/UserContext';
```

### 2. Usar en Componentes

```javascript
const MiComponente = () => {
  const { 
    user, 
    loading, 
    error, 
    isAuthenticated, 
    userName, 
    userEmail,
    updateUser,
    logout,
    retryFetchUser 
  } = useUser();

  if (loading) {
    return <div>Cargando usuario...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Bienvenido, {userName}!</h2>
      <p>Email: {userEmail}</p>
      {/* Tu contenido aquí */}
    </div>
  );
};
```

## Datos Disponibles del Usuario

Basándose en el endpoint JSON mostrado, el contexto proporciona:

```javascript
const user = {
  id: 4208326,
  firstName: "Alfonso",
  lastName: "García", 
  surName: "Cantú",
  uid: "12345",
  email: "jalfonsog@gmail.com",
  name: "Alfonso García",
  fullName: "Alfonso García", // firstName + lastName
  sessionInfo: {
    session_id: "477bdd9a943e97967f0eda9c1b22e0ac",
    user_id: 4208326,
    group_id: null
  },
  timestamp: "2025-08-20 02:00:16"
};
```

## Propiedades del Contexto

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `user` | Object/null | Datos completos del usuario |
| `loading` | Boolean | Estado de carga |
| `error` | String/null | Mensaje de error si lo hay |
| `isAuthenticated` | Boolean | `true` si hay usuario autenticado |
| `userName` | String | Nombre del usuario para mostrar |
| `userEmail` | String/null | Email del usuario |
| `updateUser` | Function | Actualizar datos del usuario |
| `logout` | Function | Cerrar sesión del usuario |
| `retryFetchUser` | Function | Reintentar obtener datos del usuario |

## Ejemplos de Uso

### Mostrar Información del Usuario

```javascript
const UserProfile = () => {
  const { user, isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <div>Usuario no autenticado</div>;
  }

  return (
    <div className="user-profile">
      <h3>{user.fullName}</h3>
      <p>ID: {user.id}</p>
      <p>Email: {user.email}</p>
      <p>UID: {user.uid}</p>
    </div>
  );
};
```

### Proteger Rutas/Componentes

```javascript
const ProtectedComponent = () => {
  const { isAuthenticated, loading } = useUser();

  if (loading) {
    return <div>Verificando autenticación...</div>;
  }

  if (!isAuthenticated) {
    return <div>Acceso denegado</div>;
  }

  return <div>Contenido protegido</div>;
};
```

### Actualizar Datos del Usuario

```javascript
const EditProfile = () => {
  const { user, updateUser } = useUser();

  const handleSave = (newData) => {
    updateUser({
      firstName: newData.firstName,
      lastName: newData.lastName,
      // ... otros campos
    });
  };

  return (
    <form onSubmit={handleSave}>
      {/* Formulario de edición */}
    </form>
  );
};
```

### Manejar Errores

```javascript
const UserErrorHandler = () => {
  const { error, retryFetchUser } = useUser();

  if (error) {
    return (
      <div className="error-container">
        <p>Error al cargar usuario: {error}</p>
        <button onClick={retryFetchUser}>
          Reintentar
        </button>
      </div>
    );
  }

  return null; // No hay error
};
```

## Estados de la Aplicación

### 1. Estado de Carga
Mientras se obtienen los datos del usuario, el Layout muestra una pantalla de carga.

### 2. Estado de Error
Si hay un error al obtener los datos, se muestra una pantalla de error con opción de reintentar.

### 3. Estado Normal
Una vez obtenidos los datos del usuario, la aplicación funciona normalmente con acceso completo al contexto.

## Flujo de Datos

1. **App.js** envuelve toda la aplicación con `UserProvider`
2. **UserProvider** hace la llamada al endpoint al montarse
3. **Layout.js** verifica el estado del usuario y muestra carga/error si es necesario
4. **Componentes hijos** pueden acceder a los datos del usuario usando `useUser()`

## Configuración del Endpoint

El endpoint se configura automáticamente según el entorno:

- **Desarrollo**: `http://localhost/src/App/Saberes/endpoints/user.php`
- **Producción**: `https://saberesmx.territorio.la/src/App/Saberes/endpoints/user.php`

## Consideraciones de Seguridad

- Las llamadas incluyen `credentials: 'include'` para manejar cookies de sesión
- Los datos del usuario se mantienen en memoria, no en localStorage
- Al hacer logout, se limpia el estado del usuario

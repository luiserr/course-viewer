# cURL Final - Registro de Curso Completo

## Endpoint
```
POST /src/App/CourseRegistration/endpoints/registerCourse.php
```

## Headers
```
Content-Type: application/json
```

---

## cURL Básico (Campos Obligatorios)

```bash
curl --location --request POST 'https://tu-dominio.com/src/App/CourseRegistration/endpoints/registerCourse.php' \
--header 'Content-Type: application/json' \
--data-raw '{
    "nombre": "Introducción a la Programación",
    "profesor": 123,
    "idperiodo": 456,
    "idclase": 789,
    "btnNombreInicio": "Empezar"
}'
```

---

## cURL Completo (Todos los Campos)

```bash
curl --location --request POST 'https://tu-dominio.com/src/App/CourseRegistration/endpoints/registerCourse.php' \
--header 'Content-Type: application/json' \
--data-raw '{
    "nombre": "Introducción a la Programación",
    "nombreOficial": "PROG-101 Introducción a la Programación",
    "profesor": 123,
    "idperiodo": 456,
    "idclase": 789,
    "idDepartamento": 10,
    "btnNombreInicio": "Empezar",
    "descripcion": "Curso introductorio sobre fundamentos de programación",
    "temario": "1. Variables y tipos de datos\n2. Estructuras de control\n3. Funciones",
    "libros": "Libro de texto: Programación Básica",
    "target": "Estudiantes de primer semestre",
    "costos": 5000,
    "cupo": 30,
    "clasebase": 0,
    "tipoGrupo": "Regular",
    "horas": 40,
    "calificable": 1,
    "muestra_rubros_especiales": 0,
    "genera_rubros_especiales": 0,
    "profesor_califica": 1,
    "fecha_inicio": "2024-01-15",
    "fecha_fin": "2024-05-15",
    "hora_inicio": "08:00:00",
    "hora_fin": "10:00:00",
    "diasClase": "Lunes,Miércoles,Viernes",
    "modalidadGrupo": "Presencial",
    "clasificacion": 0,
    "foto": "https://ejemplo.com/imagen.jpg",
    "siglas": "PROG101",
    "publico": 0,
    "activoGrupo": 1,
    "idCategoriaGrupo": 5,
    "referencia": null,
    "GrpT": false,
    "colaboradores": [456, 789],
    "puestos": [1702, 1703],
    "componentesBloque": [null, null],
    "modulos": [800, 814, 850, 606],
    "cursoespecial": 1,
    "disponible": 1,
    "semestre": "2024-1",
    "carrera": "Ingeniería en Sistemas",
    "horario": "Lunes y Miércoles 8:00-10:00",
    "tallerAutogestivo": 0,
    "paraDocentes": 0,
    "tipoDiploma": 1,
    "idUniversidad": 1204,
    "herramientas": {
        "noticias": 1,
        "miembros": 1,
        "informacion": 1,
        "modulos": 1,
        "encuestas": 0,
        "Casos": 0,
        "metas": 0,
        "tareas": 1,
        "scorm": 0,
        "videoconferencias": 0,
        "examenes": 1,
        "wikis": 0,
        "calificaciones": 1,
        "asistensias": 1,
        "galeria": 0,
        "chat": 0,
        "diplomas": 0,
        "act_seguimiento": 0,
        "insignias": 1,
        "anuncios": 0
    },
    "templateInsignias": 5,
    "categorias_materia": [1, 2, 3],
    "sesiones_materia": [10, 11, 12],
    "arrayCurso": []
}'
```

---

## cURL con Módulo 800 (Cursos Especiales)

```bash
curl --location --request POST 'https://tu-dominio.com/src/App/CourseRegistration/endpoints/registerCourse.php' \
--header 'Content-Type: application/json' \
--data-raw '{
    "nombre": "Curso Especial de Programación",
    "profesor": 123,
    "idperiodo": 456,
    "idclase": 789,
    "btnNombreInicio": "Empezar",
    "modulos": [800],
    "cursoespecial": 1,
    "disponible": 1,
    "semestre": "2024-1",
    "carrera": "Ingeniería en Sistemas",
    "horario": "Lunes y Miércoles 8:00-10:00",
    "cupo": 30
}'
```

---

## cURL con Módulo 814 (Talleres)

```bash
curl --location --request POST 'https://tu-dominio.com/src/App/CourseRegistration/endpoints/registerCourse.php' \
--header 'Content-Type: application/json' \
--data-raw '{
    "nombre": "Taller de Desarrollo Web",
    "profesor": 123,
    "idperiodo": 456,
    "idclase": 789,
    "btnNombreInicio": "Empezar",
    "modulos": [814],
    "tallerAutogestivo": 1,
    "disponible": 1,
    "paraDocentes": 0
}'
```

---

## cURL con Módulo 850 (Diplomas)

```bash
curl --location --request POST 'https://tu-dominio.com/src/App/CourseRegistration/endpoints/registerCourse.php' \
--header 'Content-Type: application/json' \
--data-raw '{
    "nombre": "Curso con Diploma",
    "profesor": 123,
    "idperiodo": 456,
    "idclase": 789,
    "btnNombreInicio": "Empezar",
    "modulos": [850],
    "tipoDiploma": 1,
    "idUniversidad": 1204
}'
```

---

## Campos Obligatorios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | string | Nombre del curso |
| `profesor` | int | ID del profesor (si no existe, se omite su inserción como miembro) |
| `idperiodo` | int | ID del período académico |
| `idclase` | int | ID de la clase/materia base |
| `btnNombreInicio` | string | Texto del botón de inicio |

## Campos Opcionales Estándar

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombreOficial` | string | Nombre oficial del curso |
| `descripcion` | string | Descripción del curso |
| `temario` | string | Temario del curso |
| `libros` | string | Libros de referencia |
| `target` | string | Público objetivo |
| `costos` | float | Costo del curso |
| `cupo` | int | Cupo máximo de estudiantes |
| `clasebase` | int | Si es clase base (0 o 1, default: 0) |
| `tipoGrupo` | string | Tipo de grupo |
| `horas` | int | Horas del curso |
| `calificable` | int | Si es calificable (0 o 1, default: 1) |
| `muestra_rubros_especiales` | int | Muestra rubros especiales (0 o 1, default: 0) |
| `genera_rubros_especiales` | int | Genera rubros especiales (0 o 1, default: 0) |
| `profesor_califica` | int | Profesor califica (0 o 1, default: 1) |
| `fecha_inicio` | string | Fecha de inicio (YYYY-MM-DD) |
| `fecha_fin` | string | Fecha de fin (YYYY-MM-DD) |
| `hora_inicio` | string | Hora de inicio (HH:MM:SS) |
| `hora_fin` | string | Hora de fin (HH:MM:SS) |
| `diasClase` | string | Días de clase (separados por comas) |
| `modalidadGrupo` | string | Modalidad del grupo |
| `clasificacion` | int | Clasificación del curso (default: 0) |
| `foto` | string | URL de la foto del grupo |
| `siglas` | string | Siglas del grupo |
| `publico` | int | Si es público (0 o 1, default: 0) |
| `activoGrupo` | int | Si está activo (0 o 1, default: 1) |
| `idCategoriaGrupo` | int | ID de la categoría del grupo |
| `referencia` | int | ID del grupo referente |
| `idDepartamento` | int | ID del departamento (si no se proporciona, se obtiene del profesor) |

## Campos para Colaboradores

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `colaboradores` | array | Array de IDs de colaboradores |
| `puestos` | array | Array de niveles de participación de colaboradores |
| `componentesBloque` | array | Array de IDs de componentes de bloque (opcional) |

## Campos para Módulo 800 (Cursos Especiales)

Requiere `"modulos": [800]` en el array de módulos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cursoespecial` | int | Si es curso especial (0 o 1) |
| `disponible` | int | Si está disponible (0 o 1) |
| `semestre` | string | Semestre (ej: "2024-1") |
| `carrera` | string | Carrera |
| `horario` | string | Horario del curso |

## Campos para Módulo 814 (Talleres)

Requiere `"modulos": [814]` en el array de módulos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tallerAutogestivo` | int | Si es taller autogestivo (0 o 1) |
| `disponible` | int | Si está disponible (0 o 1) |
| `paraDocentes` | int | Si es para docentes (0 o 1) |

## Campos para Módulo 850 (Diplomas)

Requiere `"modulos": [850]` en el array de módulos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipoDiploma` | int | Tipo de diploma (0: Participación, 1: Aprobación) |
| `idUniversidad` | int | ID de la universidad |

## Campos para Herramientas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `herramientas` | object | Objeto con configuración de herramientas |
| `herramientas.noticias` | int | Activar noticias (0 o 1, default: 1) |
| `herramientas.miembros` | int | Activar miembros (0 o 1, default: 0) |
| `herramientas.informacion` | int | Activar información (0 o 1, default: 0) |
| `herramientas.modulos` | int | Activar módulos (0 o 1, default: 0) |
| `herramientas.encuestas` | int | Activar encuestas (0 o 1, default: 0) |
| `herramientas.Casos` | int | Activar casos (0 o 1, default: 0) |
| `herramientas.metas` | int | Activar metas (0 o 1, default: 0) |
| `herramientas.tareas` | int | Activar tareas (0 o 1, default: 0) |
| `herramientas.scorm` | int | Activar SCORM (0 o 1, default: 0) |
| `herramientas.videoconferencias` | int | Activar videoconferencias (0 o 1, default: 0) |
| `herramientas.examenes` | int | Activar exámenes (0 o 1, default: 1) |
| `herramientas.wikis` | int | Activar wikis (0 o 1, default: 0) |
| `herramientas.calificaciones` | int | Activar calificaciones (0 o 1, default: 1) |
| `herramientas.asistensias` | int | Activar asistencias (0 o 1, default: 1) |
| `herramientas.galeria` | int | Activar galería (0 o 1, default: 0) |
| `herramientas.chat` | int | Activar chat (0 o 1, default: 0) |
| `herramientas.diplomas` | int | Activar diplomas (0 o 1, default: 0) |
| `herramientas.act_seguimiento` | int | Activar seguimiento (0 o 1, default: 0) |
| `herramientas.insignias` | int | Activar insignias (0 o 1, default: 0) |
| `herramientas.anuncios` | int | Activar anuncios (0 o 1, default: 0) |

## Campos Adicionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `templateInsignias` | int | ID del template de insignias (requiere `herramientas.insignias = 1`) |
| `categorias_materia` | array | Array de IDs de categorías de materia |
| `sesiones_materia` | array | Array de IDs de sesiones de materia |
| `arrayCurso` | array | Array de cursos padre (requerido si `clasificacion = 2`) |
| `GrpT` | boolean | Si es grupo tipo T (default: false, afecta nivel de participación del profesor) |
| `modulos` | array | Array de IDs de módulos activos (ej: [800, 814, 850, 606]) |

---

## Respuesta Exitosa (201 Created)

```json
{
    "success": true,
    "message": "Curso registrado exitosamente",
    "data": {
        "idGrupo": 12345,
        "idMateria": 12345,
        "idUsuarioSocial": 67890
    },
    "timestamp": "2024-01-15 10:30:00"
}
```

## Respuesta de Error (400 Bad Request)

```json
{
    "success": false,
    "error": {
        "message": "El nombre del curso es obligatorio",
        "details": "Error al registrar el curso"
    },
    "timestamp": "2024-01-15 10:30:00"
}
```

---

## Notas Importantes

1. **Profesor**: Si el profesor no existe en la base de datos, el curso se registrará pero se omitirá su inserción como miembro del grupo. Se registrará un log de advertencia.

2. **Colaboradores**: Si algún colaborador no existe, se lanzará una excepción y se hará rollback de toda la transacción.

3. **Transacciones**: Todo el proceso se ejecuta dentro de una transacción. Si algo falla, se hace rollback automáticamente.

4. **Módulos**: Los campos específicos de módulos solo se procesan si esos módulos están en el array `modulos` del request o en la sesión PHP.

5. **Departamento**: Si no se proporciona `idDepartamento`, se intentará obtenerlo automáticamente del profesor. Si no se encuentra, se lanzará una excepción.

6. **Usuario Creador**: Se obtiene automáticamente desde la sesión PHP o se puede proporcionar en el request.

7. **Universidad y Módulos**: Se pueden obtener desde la sesión PHP si están disponibles.


# Análisis del Proyecto Integrador: Cliente Móvil Moodle

Este documento presenta el análisis técnico y el plan de implementación para el proyecto de fin de curso: **Aplicación móvil cliente para Moodle mediante API REST y Autenticación Unificada**.

---

## 1. Arquitectura de la Solución (Capa por Capa)

De acuerdo con el objetivo **O6** (arquitectura por capas), la aplicación se estructura de la siguiente manera:

```
+-------------------------------------------------------------+
|               Capa de Presentación (React Native + Expo)     |
|  - SplashScreen.jsx (Bienvenida)                             |
|  - LoginScreen.jsx (Autenticación Google/SSO)               |
|  - CoursesScreen.jsx (Lista de Cursos)                       |
|  - CourseDetailScreen.jsx (Detalles y Actividades)           |
|  - AssignmentScreen.jsx (Envío de Tareas)                    |
|  - ForumScreen.jsx (Visualización y Respuestas de Foros)     |
+-------------------------------------------------------------+
                              |
                              v  (Llamadas REST / Mapeo JSON)
+-------------------------------------------------------------+
|               Capa de Servicios                             |
|  - moodleApi.js (Consumo de API de Moodle y mapeo de datos)  |
+-------------------------------------------------------------+
                              |
                              v  (Protocolo REST / HTTPS)
+-------------------------------------------------------------+
|               Capa de Datos (Servidor Moodle VM)            |
|  - Servidor Apache/Nginx + PHP (http://192.168.100.196)     |
|  - Base de Datos MySQL/MariaDB                              |
+-------------------------------------------------------------+
```

### Detalle de las Capas:
1. **Capa de Presentación:** Ubicada en `src/screens/`. Maneja el diseño visual, la interacción del usuario y la navegación básica.
2. **Capa de Servicios:** Ubicada en `src/services/moodleApi.js`. Es la responsable de comunicarse con el servidor Moodle local, procesar las solicitudes HTTP y transformar las respuestas nativas de Moodle al formato simplificado que consumen las pantallas. Esto evita que los cambios en la API rompan las pantallas de los compañeros de equipo.
3. **Moodle LMS (Servidor VM):** Tu máquina virtual corriendo Moodle en `http://192.168.100.196:8080/moodle` que expone las funciones REST de Moodle.

---

## 2. Configuración en el Servidor Moodle (VM)

Para que la aplicación pueda comunicarse con Moodle, debes configurar los servicios web en tu servidor. Sigue estos pasos en el panel de Administración de Moodle:

### Paso 1: Habilitar los Servicios Web
1. Ve a **Administración del sitio > Características avanzadas**.
2. Activa la opción **Habilitar servicios web** (`enablewebservices`) y guarda los cambios.

### Paso 2: Activar el Protocolo REST
1. Ve a **Administración del sitio > Servidor > Servicios Web > Administrar protocolos**.
2. Activa el protocolo **REST protocol** (haz clic en el ojo para abrirlo).

### Paso 3: Crear un Servicio Personalizado para la App
1. Ve a **Administración del sitio > Servidor > Servicios Web > Servicios externos**.
2. Haz clic en **Añadir**.
3. Nombra el servicio (ej. `Moodle Mobile App`), dale un nombre corto y asegúrate de marcar **Habilitado** y **Usuarios autorizados solamente** (opcional, pero recomendado).
4. Guarda los cambios.

### Paso 4: Añadir las Funciones del API al Servicio
Una vez creado el servicio, haz clic en **Funciones** y añade las siguientes funciones requeridas para el proyecto:
*   `core_enrol_get_users_courses` (Obtiene los cursos en los que un usuario está matriculado).
*   `core_course_get_contents` (Obtiene las secciones, recursos y módulos del curso).
*   `core_user_get_users_by_field` (Busca usuarios por un campo, como `email`, útil para validar el correo).
*   `mod_assign_get_assignments` (Obtiene detalles de tareas, incluyendo fechas límite).
*   `mod_assign_save_submission` (Permite enviar el texto en línea de una tarea).
*   `mod_forum_get_forum_discussions` (Obtiene los hilos de discusión de un foro).
*   `mod_forum_add_discussion_post` (Permite enviar respuestas/aportes en un foro).

### Paso 5: Generar el Token de Servicio
1. Ve a **Administración del sitio > Servidor > Servicios Web > Administrar tokens**.
2. Haz clic en **Añadir**.
3. Selecciona el usuario administrador o docente que tendrá los accesos y selecciona el servicio creado (`Moodle Mobile App`).
4. Haz clic en **Guardar cambios**. Copia el token generado; este será el token que usaremos inicialmente para probar las peticiones.

---

## 3. Mapeo y Transformación de Datos (API a Front-end)

Para no alterar las pantallas ya diseñadas, realizaremos un **mapeo** en `moodleApi.js`. A continuación se muestra cómo transformar las respuestas nativas de Moodle al formato simplificado que requiere la app:

### A. Listar Cursos
*   **Función Moodle:** `core_enrol_get_users_courses`
*   **Parámetros REST:** `userid=[ID_USUARIO]`
*   **Mapeo de Datos:**

```javascript
// Transformación en moodleApi.js
const mapCourses = (moodleCourses) => {
  return moodleCourses.map(course => ({
    id: course.id,
    fullname: course.fullname,
    shortname: course.shortname,
    summary: course.summary ? course.summary.replace(/<[^>]*>/g, '') : '', // Quitar etiquetas HTML
    teacher: course.contacts && course.contacts.length > 0 ? course.contacts[0].fullname : "Docente por confirmar",
    image: course.overviewfiles && course.overviewfiles.length > 0 ? course.overviewfiles[0].fileurl : "https://picsum.photos/seed/dam/400/200" // Imagen del curso
  }));
};
```

### B. Listar Actividades
*   **Función Moodle:** `core_course_get_contents`
*   **Parámetros REST:** `courseid=[ID_CURSO]`
*   **Mapeo de Datos:** Esta API devuelve secciones (Tema 1, Tema 2, etc.) y dentro de ellas los módulos. Debemos aplanar esta estructura y extraer solo las tareas (`assign`) y foros (`forum`):

```javascript
// Transformación en moodleApi.js
const mapActivities = (moodleSections) => {
  let activities = [];
  moodleSections.forEach(section => {
    section.modules.forEach(module => {
      if (module.modname === 'assign' || module.modname === 'forum') {
        activities.push({
          id: module.id, // ID del módulo del curso (instance es el ID del foro/tarea)
          courseId: section.course,
          name: module.name,
          type: module.modname, // 'assign' o 'forum'
          duedate: module.dates && module.dates.find(d => d.label.includes("due"))?.date || null, // Mapear fecha límite si existe
          status: module.modname === 'assign' ? 'pending' : 'open', // Por defecto
          description: module.description || "Sin descripción disponible"
        });
      }
    });
  });
  return activities;
};
```

---

## 4. Estrategia para Autenticación (Google OAuth 2.0 y Moodle)

El requerimiento solicita **Iniciar sesión con Google** y realizar la **Validación del correo en Moodle**. 

### Flujo Propuesto sin Servidor Intermedio (Directo App <-> Moodle)
Como la base de datos de Moodle ya está corriendo, el flujo recomendado para resolver esto fácilmente en la app de React Native es:

1.  **Google Login:** El usuario presiona "Iniciar sesión con Google". Obtenemos su correo institucional (ejemplo: `estudiante@ug.edu.ec`).
2.  **Validación de Correo:** La app realiza una consulta a Moodle usando la función `core_user_get_users_by_field` (con el token general/administrador del sistema) buscando el correo obtenido.
    *   **Si el usuario existe:** Moodle nos devuelve su `id`, `fullname` y `profileimageurl`. La app guarda este perfil y su ID en el estado global para realizar las siguientes llamadas.
    *   **Si no existe:** Se muestra un error indicando que el correo no está registrado en el Moodle institucional.
3.  **Acceso:** Una vez validado, la app navega a `CoursesScreen` pasando los datos del usuario y el token general/de servicio.

---

## 5. Plan de Trabajo Paso a Paso

1.  **Configuración de Moodle:** Activar los servicios web en tu máquina virtual (Sección 2).
2.  **Obtener Token de Prueba:** Crear un token para el usuario administrador/docente.
3.  **Programar moodleApi.js:** Reemplazar los mocks con las peticiones fetch reales conectando a `http://192.168.100.196:8080/moodle`.
4.  **Completar Pantallas:** Desarrollar las vistas de envío de tareas e interacción con foros que actualmente están vacías.

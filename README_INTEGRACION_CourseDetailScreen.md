# Integracion de CourseDetailScreen

Mi parte es `src/screens/CourseDetailScreen.jsx`.

La pantalla usa las funciones existentes de `src/services/moodleApi.js`:

- `getCourses(token)`
- `getCourseActivities(token, courseId)`

No tiene datos inventados dentro de la pantalla. Los datos salen del servicio, que por ahora devuelve los mocks de `src/mocks/mockData.js`.

## Lo que necesita de cada pantalla

Ronald - `CoursesScreen`:

```js
navigation.navigate("CourseDetail", {
  course,
  courseId: course.id,
  token,
});
```

Natalia - `AssignmentScreen`:

```js
const { activity, assignmentId, course, token } = route.params;
```

Denisse - `ForumScreen`:

```js
const { activity, forumId, course, token } = route.params;
```

Sebastian - `SplashScreen` y `LoginScreen`:

El token obtenido en login debe llegar hasta `CoursesScreen`, para que luego se pase a `CourseDetailScreen`.

Steven - Servidor/API:

Al conectar Moodle real, mantener estas funciones en `moodleApi.js`:

```js
getCourses(token)
getCourseActivities(token, courseId)
```

La estructura ideal de cada actividad es similar a los mocks:

```js
{
  id: 1,
  courseId: 1,
  name: "Nombre de la actividad",
  type: "assign", // o "forum"
  duedate: "2026-07-17",
  status: "pending",
  description: "Descripcion de la actividad"
}
```

## Nota

Los cambios temporales en `app.js`, `package.json` y dependencias de Expo fueron solo para probar la pantalla aislada con Expo Go. Para integrar el proyecto completo, se debe usar el navegador normal `AppNavigator`.

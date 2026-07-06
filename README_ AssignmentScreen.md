# Cambios Realizados — AssignmentScreen (Envío de Tareas)

**Rama:** `api-integration`
**Módulo:** Envío de tareas (texto y archivos) + verificación de estado de entrega
**Responsable:** Parte de AssignmentScreen
**Archivos afectados:** `src/screens/AssignmentScreen.jsx`, `src/services/moodleApi.js`, `package.json`

---

## 1. Contexto y motivo del cambio

Según el reporte de estado del proyecto, el envío de tareas solo soportaba **texto en línea** (`mod_assign_save_submission` con `onlinetext_editor`), y aparecía marcado como **0% (Falta)** el punto de "Envío de tareas (Archivos)", requerido explícitamente en el PDF del proyecto integrador (sección 5.1.4: "permitir adjuntar archivos según disponibilidad").

Además, en una revisión previa del código se detectaron dos riesgos importantes para el criterio de evaluación C1 (Funcionamiento, 40%):

- La pantalla no verificaba si el estudiante **ya tenía una entrega previa** (borrador o final), por lo que podía perderse información o generar confusión sobre si la tarea ya había sido enviada.
- Dependiendo de la configuración de la tarea en Moodle (`submissiondrafts`), guardar la entrega podía dejarla como **borrador** en lugar de como entrega final, sin que la app lo reflejara.

Este cambio resuelve los tres puntos.

## 2. Qué se implementó (a alto nivel)

1. **Adjuntar archivos a la entrega.** El estudiante puede seleccionar uno o varios archivos desde su dispositivo y adjuntarlos junto con (o en lugar de) el texto de la tarea.
2. **Verificación de entrega existente.** Al entrar a la pantalla, la app consulta si ya existe una entrega (borrador o final) y, si la hay, precarga el texto y muestra los archivos ya subidos, en lugar de asumir que la tarea nunca fue enviada.
3. **Confirmación de envío final.** Después de guardar la entrega, la app intenta confirmar el envío para calificación, para los casos en que la configuración de la tarea lo requiera. Si no aplica, este paso se ignora sin generar error.
4. **Reenvío permitido.** Aunque la tarea ya esté marcada como entregada, el estudiante puede seguir editando el texto y los archivos y volver a enviar, por si necesita corregir algo antes de la fecha límite.

## 3. Flujo de envío de tareas (actualizado)

El proceso ahora sigue estos pasos, en orden:

1. **Al abrir la pantalla:** se consulta el estado actual de la entrega en Moodle (nueva, borrador o enviada) y se precarga lo que ya exista.
2. **El estudiante escribe texto y/o adjunta archivos.**
3. **Al presionar "Enviar":**
   a. Si hay archivos nuevos, se suben primero al servidor (todos agrupados en la misma área de borrador de Moodle).
   b. Se guarda la entrega con el texto y la referencia a los archivos subidos.
   c. Se intenta confirmar el envío como definitivo (paso que Moodle puede requerir o no, según la configuración de cada tarea).
   d. Se muestra confirmación al estudiante y se actualiza el estado en pantalla.

Este flujo requiere **dos llamadas separadas a la API de Moodle para los archivos**: primero subir el archivo al área de borrador, y después asociar esa área a la entrega. No es una sola llamada combinada — esto es una particularidad del funcionamiento de Moodle, no una decisión de diseño arbitraria.

## 4. Cosas que el arquitecto / equipo debe saber

- **Configuración pendiente en el servidor Moodle:** la función `mod_assign_get_submission_status` debe estar habilitada en el servicio externo REST (junto a las funciones que ya usan los demás módulos). Sin esto, la verificación de entregas previas fallará silenciosamente (la app seguirá funcionando, pero sin precargar datos previos).
- **Nueva dependencia del proyecto:** se agregó `expo-document-picker` al `package.json`. Cualquier persona que actualice su copia del repositorio necesita correr `npm install` antes de compilar.
- **No se modificó nada de los módulos de otros compañeros** (login, cursos, foros). Los cambios están contenidos en el archivo de servicios de Moodle (agregando funciones nuevas, sin romper las existentes) y en la pantalla de tareas.
- **Decisión de diseño:** se optó por permitir múltiples archivos por entrega (no solo uno), ya que Moodle lo soporta de forma nativa a través de la misma área de borrador, y da más flexibilidad al estudiante sin costo adicional de complejidad.
- **Manejo de errores:** los errores de subida de archivos o de guardado de la entrega se muestran directamente al estudiante con un mensaje descriptivo. El paso de "confirmar envío final" se maneja de forma silenciosa (no bloquea el flujo) porque no todas las tareas lo requieren, y tratarlo como error obligatorio generaría falsos negativos en tareas que no usan esa configuración.
- **Pendiente fuera de este alcance:** validación de fecha límite/cierre de la tarea (`duedate`/`cutoffdate`) y límite de palabras (`wordlimit`) configurado en Moodle. No estaban en el alcance mínimo de este cambio, pero quedan identificados como mejoras futuras si el equipo quiere reforzar la robustez antes de la entrega final.

## 5. Cómo probarlo

Casos de prueba sugeridos para incluir en el informe técnico:

- Envío exitoso solo con texto.
- Envío exitoso solo con archivo(s), sin texto.
- Envío exitoso con texto y archivo(s) combinados.
- Reingreso a una tarea ya entregada: verificar que se precargue el texto y se listen los archivos previos.
- Intento de envío sin texto ni archivos (debe bloquearse con aviso).
- Comportamiento sin conexión a la red (debe mostrar error claro, no fallar en silencio).

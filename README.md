# MoodleMobile - Aplicación Cliente (DAM)

Aplicación móvil híbrida desarrollada con **Expo (React Native)** para conectarse a una instancia local de Moodle. Proyecto final integrador para la asignatura de **Desarrollo de Aplicaciones Móviles (DAM) - Universidad de Guayaquil**.

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

Si estás trabajando de forma local en tu computadora y con tu teléfono en la misma red Wi-Fi:

1. **Instalar dependencias (Solo la primera vez):**
   ```bash
   npm install
   ```
2. **Iniciar el empaquetador de Expo:**
   ```bash
   npx expo start -c
   ```
3. **Conectar la app:** Escanea el código QR desde la aplicación **Expo Go** en tu dispositivo Android o iOS.

---

## 🌐 Conexión mediante Túnel de Ngrok Estático

Para permitir que tus compañeros o el docente prueben la aplicación desde sus hogares mediante internet, configuramos un **túnel estático permanente**. Al usar un dominio estático, **no necesitas cambiar las URLs en el código ni en la base de datos de Moodle cada vez que reinicias la PC**.

### Paso 1: Levantar el túnel en tu PC física (Host)
Abre una terminal en tu computadora principal y ejecuta el túnel usando tu dominio estático reservado:
```bash
ngrok http --domain=gesture-chatty-macaroni.ngrok-free.dev 80
```
*(Nota: Si tu servidor web Apache escucha en otro puerto, reemplaza `80` por el puerto correcto).*

### Paso 2: Configuración del Servidor Moodle (VM)
El archivo `config.php` de tu Moodle en la máquina virtual está configurado de forma permanente para escuchar en este dominio seguro:
```php
$CFG->wwwroot = 'https://gesture-chatty-macaroni.ngrok-free.dev/moodle';
$CFG->sslproxy = true;
```

### Paso 3: Configuración en el Código de la App
El archivo de la API `src/services/moodleApi.js` apunta al túnel estático permanente:
```javascript
const WEBSERVICE_URL = "https://gesture-chatty-macaroni.ngrok-free.dev/moodle/webservice/rest/server.php";
```

### Paso 4: Iniciar Expo en Modo Túnel
Para compartir la app con personas fuera de tu red local, inicia Expo con el flag de túnel:
```bash
npx expo start --tunnel
```
Comparte el código QR o el enlace `exp://...` generado en la terminal con tus compañeros para que lo abran en **Expo Go**.

---

## 🔑 Autenticación con Google (OAuth 2.0)

La aplicación tiene dos formas de validar usuarios en la pantalla de inicio de sesión:

1. **Simulador de Correos (Testeo rápido de Roles):**
   * Escribe cualquier correo registrado en tu Moodle (ej. `tovarjohn627@gmail.com` para alumno, o `docente.sofware1@ug.edu.ec` para el docente) en la casilla de desarrollo de la pantalla de login.
   * Al pulsar el botón, la app simulará el login saltándose el popup y asignándote el token de Moodle correspondiente.

2. **Login de Google Real (OAuth 2.0):**
   * Deja la casilla de correo vacía y presiona el botón **🔐 Iniciar sesión con Google**.
   * Se abrirá el flujo oficial de inicio de sesión de Google mediante el Client ID del proyecto de Google Cloud: `189645847735-l0a3n6eudpgvbokl5bmbm5j5tbbprt0i.apps.googleusercontent.com`.
   * **⚠️ IMPORTANTE (Restricción de Google en Desarrollo):** Como la app está en fase de pruebas, **solo los correos registrados como "Usuarios de prueba"** en tu consola de Google Cloud (OAuth Consent Screen) podrán iniciar sesión con éxito. Asegúrate de añadir los correos de tu grupo de trabajo y del profesor en la consola de Google.

---

## 🛠️ Estructura del Proyecto

* [src/screens/](file:///home/jonta/StudioProjects/moodle-mobile-app/src/screens) - Pantallas de la aplicación (Login, Cursos, Detalle de Cursos, Foros, Tareas).
* [src/services/moodleApi.js](file:///home/jonta/StudioProjects/moodle-mobile-app/src/services/moodleApi.js) - Integración real con la API REST y Web Services de Moodle.
* [src/theme/](file:///home/jonta/StudioProjects/moodle-mobile-app/src/theme) - Configuración del sistema de diseño (Colores, Tipografías, Espaciados).

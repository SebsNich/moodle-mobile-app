# MoodleMobile - Aplicación Cliente

Aplicación móvil híbrida desarrollada con **Expo (React Native)** para conectarse a una instancia local/remota de Moodle. Proyecto para la asignatura de Desarrollo de Aplicaciones Móviles (DAM) - Universidad de Guayaquil.

---

## 🚀 Guía de Inicio Rápido (Desarrollo Local)

Si estás trabajando de forma local en tu computadora y con tu teléfono en la misma red Wi-Fi:

1. **Instalar dependencias (Solo la primera vez):**
   ```bash
   npm install
   ```
2. **Iniciar el servidor local:**
   ```bash
   npx expo start -c
   ```
3. **Conectar la app:** Escanea el código QR desde la aplicación **Expo Go** en tu dispositivo Android o iOS.

---

## 🌐 Cómo compartir la App y Moodle con tus compañeros (Ngrok)

Como tu servidor de Moodle corre dentro de una máquina virtual (VM) en tu casa, cuando tus compañeros se conectan desde sus hogares necesitarán un túnel público seguro (Ngrok) para acceder. 

Sigue estos pasos detallados cada vez que enciendas tu computadora o reinicies Ngrok (ya que en el plan gratuito la URL cambiará cada vez):

### Paso 1: Levantar el túnel en tu PC física (Host)
Abre una terminal en tu computadora principal (no dentro de la máquina virtual) y ejecuta:
```bash
ngrok http 8080
```
Copia la nueva dirección HTTPS generada por Ngrok (ejemplo: `https://gesture-chatty-macaroni.ngrok-free.dev`).

### Paso 2: Actualizar la URL de Moodle en la Máquina Virtual (SSH)
Entra por SSH a tu máquina virtual y edita el archivo de configuración de Moodle:
```bash
sudo nano /var/www/mobileappdam.com/html/moodle/config.php
```

Busca la sección de la URL y modifícala con tu nueva dirección de Ngrok. Debe quedar de la siguiente manera:
```php
// URL temporal de Ngrok (Actualízala cada vez que inicies Ngrok)
$CFG->wwwroot = 'https://TU-NUEVA-URL-DE-NGROK.ngrok-free.dev/moodle';
$CFG->sslproxy = true; // REQUERIDO: Le dice a Moodle que confíe en el túnel seguro de Ngrok
```
Guarda los cambios (`Ctrl + O`, `Enter`) y sal de nano (`Ctrl + X`).

### Paso 3: Actualizar la URL en el código de la App Móvil
En tu editor de código, abre el archivo:
📂 `src/services/moodleApi.js`

Busca la constante `MOODLE_URL` en las primeras líneas y actualízala con el nuevo túnel:
```javascript
const MOODLE_URL = "https://TU-NUEVA-URL-DE-NGROK.ngrok-free.dev/moodle";
```
*(Nota: El archivo de la API extraerá la cabecera Host automáticamente, por lo que solo necesitas cambiar esta línea).*

### Paso 4: Iniciar Expo en Modo Túnel
Para que tus compañeros puedan escanear el QR desde sus casas a través de internet, inicia el empaquetador de la app móvil en modo túnel:
```bash
npx expo start --tunnel
```
Comparte el código QR o el enlace `exp://...` generado en la terminal con tus compañeros para que lo abran en **Expo Go**.

---

## 🔑 Autenticación con Google (OAuth 2.0)

La aplicación tiene dos formas de validar usuarios:

1. **Simulador de Correos (Para pruebas rápidas de roles):**
   Puedes escribir manualmente cualquier correo registrado en tu base de datos de Moodle (como `john.quijijetov@ug.edu.ec` o cuentas de estudiantes) en la casilla de texto de la pantalla de login de la app. Al pulsar el botón, la app simulará que iniciaste sesión con esa cuenta de Google sin tener que loguearte realmente.

2. **Login de Google Real:**
   Si pulsas el botón con la casilla vacía, abrirá la ventana de autenticación real de Google.
   * **IMPORTANTE (Diferencia de Correos):** Tu cuenta institucional de Google tiene el correo con **tres "i"** (`john.quijijijetov@ug.edu.ec`), pero en tu Moodle local está registrado por error con **dos "i"** (`john.quijijetov@ug.edu.ec`).
   * Para poder usar el login de Google real, entra a **phpMyAdmin** en tu máquina virtual, ve a la tabla `mdl_user` y edita el correo de tu usuario administrador para que tenga las tres "i" (`john.quijijijetov@ug.edu.ec`). De esta forma coincidirá con lo que entrega Google.

---

## 🛠️ Estructura del Proyecto

* `src/screens/` - Pantallas de la aplicación (Splash, Login, Cursos, Detalle de Cursos).
* `src/services/moodleApi.js` - Integración real con la API REST y Web Services de Moodle.
* `src/theme/` - Paleta de colores, tipografías y espaciados de la app.

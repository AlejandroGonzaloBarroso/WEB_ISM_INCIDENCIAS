# 📓 Manual de Instrucciones: WEB ISM INCIDENCIAS

Bienvenido al manual operativo de tu plataforma. Aquí tienes centralizadas las instrucciones clave para administrar, actualizar y gestionar tu proyecto de forma autónoma.

---

## 🚀 1. Cómo Lanzar una Nueva Actualización (Para PC y Móviles)

Gracias al motor de automatización (*GitHub Actions* y *OTA Updates*) que hemos construido, nunca más tendrás que enviar archivos manuales a los administradores ni a los profesores.

Cuando cambies código (por ejemplo, alteres el diseño en el CSS o cambies algo en `index.html`), sigue **ESTRICTAMENTE** estos pasos para que todos los dispositivos del mundo se actualicen solos:

1. **Guarda todos los archivos** en Visual Studio Code.
2. Abre la terminal (`Ctrl` + `ñ`) y escribe el siguiente comando cambiando el número de versión por la que toque (por ejemplo, si estabas en la `1.0.12`, pon `1.0.13`):
   ```bash
   npm run release 1.0.13
   ```
3. El script purgará la versión anterior, actualizará `package.json` y `version.json`, y preparará el código.
4. Tu terminal te dará las instrucciones finales. Cópialas y pégalas. Suelen ser:
   ```bash
   git add .
   git commit -m "chore: release v1.0.13"
   git tag v1.0.13
   git push origin main --tags
   ```

**¡Y YA ESTÁ!** A partir de este momento, los servidores de GitHub tardarán 3 minutos en compilar todo en la nube. En cuanto acaben, todas las apps Android y Ordenadores PC/Mac descargarán la cura silenciosamente y se reiniciarán solas.

---

## 🗄️ 2. Base de Datos en la Nube (Firebase)

Tu base de datos es NoSQL y en tiempo real. Está dividida en las siguientes "Colecciones" principales en tu consola web de Firebase:

* `incidencias`: Aquí llegan todos los reportes de los móviles. Cada uno contiene quién lo envía, foto, categoría (Middle/High), severidad y el estado (Sin revisar, En proceso, Resuelta).
* `administradores`: Aquí dictas quién es Dios en la aplicación de PC. **Solo entran a la app de ordenador los emails que existan aquí**.
  * **Estructura de un admin:** ID del documento (su email). Campo `permisos`: Array con los roles (ej. `["ALL"]` para verlo todo, o `["Middle"]` para ver solo media).

---

## 🛠️ 3. Modificando el Aviso de "Novedades" (Changelog)

Si quieres que cuando tus usuarios abran la app recién actualizada les salte un mensaje emergente avisando de tus nuevas mejoras:

1. Antes de lanzar el `npm run release`, abre el archivo: `www/Datos_Locales-JSON/changelog.json`
2. Añade un nuevo bloque con el número de la versión que vas a lanzar. Ejemplo:
   ```json
   "1.0.13": {
     "es": [
       "Se ha mejorado la velocidad de la base de datos.",
       "Nuevos colores en la pantalla de inicio."
     ]
   }
   ```
3. Lanza la actualización normalmente. La ventana de novedades asaltará la pantalla la primera vez que arranquen.

---

## 💻 4. Estructura Interna (Para cuando quieras programar)

Si algún día programas más características, ten clara esta separación de cerebros:

* **Aplicación Pública (Móviles):** Todo ocurre en `www/index.html` y su cerebro es `www/JavaScript-JavaScript/app.js`.
* **Aplicación Privada (Ordenadores):** Ocurre en `www/admin.html` y su cerebro es `www/JavaScript-JavaScript/admin.js`.
* **Motores de Arranque (No Tocar):** `electron-main.js` y `electron-admin.js` son los motores de tu coche para Windows/Mac. Solo giran las ruedas y encienden el actualizador silencioso. Nunca toques ahí la interfaz.

---

## 🔐 5. Seguridad y Repositorio

Recuerda que actualmente tu repositorio en GitHub es **Público** bajo la licencia **GNU GPLv3**. 
* Esto es un requisito *fundamental* para que los móviles de Apple y Android no choquen contra los muros de seguridad al intentar buscar sus actualizaciones Over-The-Air por internet. 
* Legalmente, ningún colegio ni empresa enemiga podrá robar tu infraestructura y venderla, ya que la licencia les obligaría por ley a declarar y regalar su proyecto entero derivado del tuyo. Estás blindado.

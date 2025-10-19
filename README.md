# improworld

## Motores · Motor de improvisación efímero

El proyecto incluye ahora **Motores**, una herramienta mínima para improvisación en tiempo real. Permite que un grupo comparta textos cortos ("motores") en una sesión común y los extraiga de forma aleatoria durante ensayos, talleres o jams creativas. Todo se almacena sólo en memoria, por lo que al reiniciar la sesión se parte de un lienzo en blanco.

### Requisitos

- Python 3.11+
- Dependencias indicadas en `requirements.txt`

Instalación rápida:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Cómo ejecutar el servidor

```bash
uvicorn app:app --reload
```

Esto iniciará un servidor local en `http://127.0.0.1:8000` con los siguientes recursos principales:

- `motores-create.html`: página para conectar una sesión, añadir motores, visualizar las categorías activas y vaciar el tablero.
- `motores-draw.html`: interfaz centrada en mostrar el motor sorteado y sacar nuevos impulsos desde cualquier dispositivo conectado a la misma sesión.

Ambas páginas se comunican con el backend vía WebSockets y peticiones HTTP para mantenerse sincronizadas entre todos los participantes.

### Despliegue en Netlify

El sitio puede servirse como un _static site_ desde Netlify. La carpeta `public/` contiene todas las páginas HTML y recursos necesarios, mientras que el WebSocket se ejecuta como una Edge Function en `netlify/edge-functions/socket.js`.

1. **Publicar la carpeta correcta.** El archivo `netlify.toml` ya establece `public/` como directorio de publicación, por lo que no se necesita un comando de _build_.
2. **Configurar la función Edge.** Netlify detecta automáticamente los archivos en `netlify/edge-functions/`; el endpoint `/socket` queda asociado a la función `socket` que implementa el mismo protocolo que `server.js`.
3. **Variables de entorno opcionales.** Si quieres personalizar la contraseña del show, define `SHOW_PASSWORD` (o `SESSION_PASSWORD`) desde la UI de Netlify. La función Edge lee cualquiera de estas variables y usa `test` como valor por defecto si no están presentes.

Una vez desplegado, los clientes cargarán la aplicación desde `https://<tu-sitio>.netlify.app/` y se conectarán automáticamente a `wss://<tu-sitio>.netlify.app/socket` gracias a la lógica incluida en `public/index.html`.

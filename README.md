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
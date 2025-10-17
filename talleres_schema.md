# Esquema de la hoja `talleres_impro_data.xlsx`

La hoja de cálculo `talleres_impro_data.xlsx` debe contener una pestaña principal llamada **Talleres**.
Cada fila representa un taller de improvisación único.

| Columna | Tipo esperado | Descripción | Ejemplo |
| --- | --- | --- | --- |
| `Nombre del taller` | Texto | Nombre visible del taller. | `Impro para principiantes` |
| `Facilitador` | Texto | Persona o equipo que facilita el taller. | `María López` |
| `Fecha` | Fecha ISO (`YYYY-MM-DD`) o texto | Día en que se realiza el taller. | `2024-07-10` |
| `Ciudad` | Texto | Ciudad donde se dicta el taller. | `Buenos Aires` |
| `País` | Texto | País donde se dicta el taller. | `Argentina` |
| `Precio` | Texto opcional | Costo sugerido o rango. Dejar vacío si es gratuito o por donación. | `45 USD` |
| `Contacto` | Texto | Correo electrónico, enlace a formulario o página de registro. | `hola@improba.com` |
| `Descripción` *(opcional)* | Texto | Resumen breve del contenido o requisitos. | `Sesión introductoria con juegos de confianza.` |

## Notas adicionales

- Se recomienda mantener el formato de fecha en ISO (`YYYY-MM-DD`) para asegurar un orden cronológico correcto.
- Los campos vacíos se mostrarán como `Por anunciar` o `Consulta detalles` en la web.
- La pestaña puede incluir columnas adicionales; la página solo leerá las columnas mencionadas.

"""Configuracion central de logging. Solo libreria estandar.

Antes NO habia ninguna: sin handlers en el root, Python cae al handler
`lastResort`, que escribe a stderr **sin timestamp, sin nivel, sin nombre del
logger y sin traceback**. Un `logger.error(f"Error fetching form 42: {e}")`
salia como una linea suelta imposible de ubicar en el tiempo o en el codigo.

Se configura con `dictConfig` y no con `basicConfig` porque hay que tocar
tambien los loggers de uvicorn: uvicorn instala los suyos al arrancar y, si no
se declaran aqui, conviven dos formatos distintos en la misma salida.
"""
import logging
import logging.config

# %(name)s es lo que hace util el log: identifica el modulo exacto
# (app.repositories.form_repository) sin tener que buscar el texto del mensaje.
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str = "INFO") -> None:
    """Instala la configuracion. Llamar UNA vez, al arrancar la app."""
    logging.config.dictConfig({
        "version": 1,
        # Los loggers de uvicorn ya existen cuando esto corre; desactivarlos
        # los dejaria mudos y se perderian los logs de peticiones.
        "disable_existing_loggers": False,
        "formatters": {
            "default": {"format": LOG_FORMAT, "datefmt": DATE_FORMAT},
        },
        "handlers": {
            # stderr, no stdout: separa el diagnostico de la salida normal y
            # es lo que esperan los recolectores de logs (Render, Railway).
            "console": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
                "formatter": "default",
            },
        },
        "root": {"handlers": ["console"], "level": level},
        "loggers": {
            # propagate=False evita que uvicorn escriba dos veces la misma
            # linea (una por su handler y otra por el del root).
            "uvicorn": {"handlers": ["console"], "level": level, "propagate": False},
            "uvicorn.error": {"handlers": ["console"], "level": level, "propagate": False},
            "uvicorn.access": {"handlers": ["console"], "level": level, "propagate": False},
        },
    })

EVALUABLE_ROLES = ("team_leader", "tutor")

# Margen con el que se compara la suma de pesos contra 100 (regla ADMIN-02).
# Es el valor de respaldo: el real vive en `system_settings.weight_tolerance`
# y lo resuelve `resolve_weight_tolerance()`. Si no hay fila en la tabla
# (BD sin seed), se usa este numero, que es el que estaba hardcodeado antes
# de leer la configuracion global -- asi la validacion no cambia de conducta.
WEIGHT_SUM_TOLERANCE = 0.01


def resolve_weight_tolerance(settings: dict) -> float:
    """Devuelve la tolerancia configurada por el admin, o la constante de respaldo.

    Funcion PURA a proposito: recibe el dict de ajustes ya leido en vez de
    consultarlo. Los services abren su propia conexion con `engine.begin()`,
    y llamar a `settings_service.get_settings()` (que abre otra) dentro de ese
    bloque mantendria dos checkouts del pool vivos en la misma peticion. El
    patron -- leer los ajustes ANTES de abrir la conexion y pasarlos hacia
    abajo -- es el mismo que usa `metrics_service._load_policy()`.
    """
    raw = (settings or {}).get("weight_tolerance")
    # `or` no sirve: una tolerancia de 0 (exigir suma exacta) es valida y
    # seria descartada como falsy.
    if raw is None:
        return WEIGHT_SUM_TOLERANCE
    return float(raw)

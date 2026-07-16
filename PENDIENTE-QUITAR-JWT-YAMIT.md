# Pendiente: quitar el JWT (version actualizada, sobre el codigo real de develop)

Dos cosas concretas que se pierden y que hay que poder sustentar si preguntan:

1. **El "no duplicado" se vuelve mas debil.** Hoy `evaluator_id` nunca viene del cliente — sale
   del token, para que nadie pueda mentir sobre quien es y evadir la regla de "no evaluar dos
   veces a la misma persona en el mismo periodo". Sin token, `evaluator_id` tiene que venir del
   body que manda el navegador, y el backend ya no puede confirmar que sea real.
2. **"El Admin ve la identidad del evaluador en evaluaciones no anonimas"** (regla 6 de
   `CLAUDE.md`) pasa a depender de un parametro que manda el propio front (`viewer_role=admin`),
   no de una verificacion real. Cualquiera podria mandar ese parametro a mano.
3. `backend/tests/test_rbac.py` casi seguro se rompe — no es parte de este cambio arreglarlo,
   pero hay que saber que va a fallar en CI/pytest hasta que alguien lo actualice o lo borre.

---

## Backend

### 1. `backend/app/schemas/auth.py`

**Cambia esto:**
```python
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
```

**Por esto:**
```python
class LoginResponse(BaseModel):
    user: UserOut
```

---

### 2. `backend/app/services/auth_service.py`

**Cambia esto:**
```python
from fastapi import HTTPException, status

from app.config.security import create_access_token, verify_password
from app.schemas.auth import LoginResponse
from app.schemas.user import UserOut
from app.services.user_service import get_user_by_email


def login(email: str, password: str) -> LoginResponse:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return LoginResponse(access_token=token, user=UserOut(**user))
```

**Por esto:**
```python
from fastapi import HTTPException, status

from app.config.security import verify_password
from app.schemas.auth import LoginResponse
from app.schemas.user import UserOut
from app.services.user_service import get_user_by_email


def login(email: str, password: str) -> LoginResponse:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    return LoginResponse(user=UserOut(**user))
```

**Hace:** sigue validando con bcrypt en el servidor, pero ya no firma JWT.

---

### 3. `backend/app/schemas/evaluation.py`

**Cambia esto:**
```python
class EvaluationCreate(BaseModel):
    # evaluator_id no viene del cliente: se toma del usuario autenticado (JWT),
    # asi nadie puede enviar una evaluacion haciendose pasar por otro coder.
    evaluatee_id: int
    template_id: int
    period_id: int
    is_anonymous: bool = False
    status: str = "draft"  # "draft" o "submitted"
    answers: List[EvaluationAnswerCreate]
```

**Por esto:**
```python
class EvaluationCreate(BaseModel):
    evaluator_id: int
    evaluatee_id: int
    template_id: int
    period_id: int
    is_anonymous: bool = False
    status: str = "draft"  # "draft" o "submitted"
    answers: List[EvaluationAnswerCreate]
```

**Hace:** ahora el cliente tiene que mandar quien es el evaluador (antes lo sacaba el backend del
token). Esto es justo el punto 1 de la advertencia de arriba.

---

### 4. `backend/app/services/evaluation_service.py`

**Cambia esto:**
```python
def create_evaluation(eval_data: EvaluationCreate, evaluator_id: int):
    """Crea una evaluación y sus respuestas correspondientes.

    evaluator_id viene del usuario autenticado (token), nunca del body del
    cliente, para que la validación de "no duplicado" no se pueda saltar.
    """
```

**Por esto:**
```python
def create_evaluation(eval_data: EvaluationCreate):
    """Crea una evaluación y sus respuestas correspondientes.

    evaluator_id viene del body (sin JWT, el backend no puede confirmar
    quien es realmente el que llama).
    """
    evaluator_id = eval_data.evaluator_id
```

**Hace:** el resto de la función queda exactamente igual (usa la variable `evaluator_id` que
antes era un parámetro).

---

### 5. `backend/app/routes/evaluation_routes.py`

**Cambia esto:**
```python
from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Optional
from app.schemas.evaluation import EvaluationCreate, EvaluationDetailOut
from app.services import evaluation_service
from app.deps import get_current_user

router = APIRouter()

@router.post("/evaluations", response_model=EvaluationDetailOut, status_code=status.HTTP_201_CREATED)
def create_evaluation(
    evaluation: EvaluationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Registra una nueva evaluación (borrador o enviada)."""
    return evaluation_service.create_evaluation(evaluation, current_user["id"])

@router.get("/evaluations", response_model=List[EvaluationDetailOut])
def get_evaluations(
    evaluator_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluador"),
    evaluatee_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluado"),
    period_id: Optional[int] = Query(None, description="Filtrar por periodo (solo con evaluatee_id)"),
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el historial de evaluaciones filtrado por evaluador o evaluado."""
    if evaluator_id is not None:
        # Regla de negocio: un coder solo ve su propio historial; el admin puede ver cualquiera
        if current_user["role"] != "admin" and current_user["id"] != evaluator_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")
        return evaluation_service.get_evaluations_by_evaluator(evaluator_id)
    elif evaluatee_id is not None:
        # Regla de negocio: el propio evaluado ve su historial (para "Mis resultados"),
        # y el Admin puede ver el de cualquiera. Nadie mas.
        is_admin = current_user["role"] == "admin"
        if not is_admin and current_user["id"] != evaluatee_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permiso")
        return evaluation_service.get_evaluations_by_evaluatee(
            evaluatee_id, period_id, hide_evaluator=not is_admin
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos evaluator_id o evaluatee_id"
        )
```

**Por esto:**
```python
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.schemas.evaluation import EvaluationCreate, EvaluationDetailOut
from app.services import evaluation_service

router = APIRouter()

@router.post("/evaluations", response_model=EvaluationDetailOut, status_code=status.HTTP_201_CREATED)
def create_evaluation(evaluation: EvaluationCreate):
    """Registra una nueva evaluación (borrador o enviada)."""
    return evaluation_service.create_evaluation(evaluation)

@router.get("/evaluations", response_model=List[EvaluationDetailOut])
def get_evaluations(
    evaluator_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluador"),
    evaluatee_id: Optional[int] = Query(None, description="Filtrar por el ID del evaluado"),
    period_id: Optional[int] = Query(None, description="Filtrar por periodo (solo con evaluatee_id)"),
    viewer_role: Optional[str] = Query(None, description="Rol de quien consulta, lo manda el front (no se verifica en el servidor)")
):
    """Obtiene el historial de evaluaciones filtrado por evaluador o evaluado."""
    if evaluator_id is not None:
        return evaluation_service.get_evaluations_by_evaluator(evaluator_id)
    elif evaluatee_id is not None:
        return evaluation_service.get_evaluations_by_evaluatee(
            evaluatee_id, period_id, hide_evaluator=(viewer_role != "admin")
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos evaluator_id o evaluatee_id"
        )
```

**Hace:** quita los 403 de "solo el propio o admin" (sin token no hay forma de confirmarlo) y
cambia `hide_evaluator` para que dependa de un query param que manda el front, no del token.

---

### 6. `backend/app/routes/form_routes.py`

**Cambia esto:**
```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut
from app.services import form_service
from app.deps import get_current_user

router = APIRouter()

@router.get("/forms", response_model=FormTemplateOut)
def get_form_template(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)"),
    current_user: dict = Depends(get_current_user)
):
```

**Por esto:**
```python
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.form_template import FormTemplateOut
from app.services import form_service

router = APIRouter()

@router.get("/forms", response_model=FormTemplateOut)
def get_form_template(
    target_role: str = Query(..., description="El rol para el cual se requiere el formulario (ej. team_leader, tutor)")
):
```

(el resto de la función no cambia)

---

### 7. `backend/app/routes/period_routes.py`

Quitar `Depends(get_current_user)` y `Depends(require_role("admin"))` de las 5 funciones, y el
import de `app.deps`:

**Cambia esto (cada firma):**
```python
def get_periods(current_user: dict = Depends(get_current_user)):
def get_period(period_id: int, current_user: dict = Depends(get_current_user)):
def create_period(period: PeriodCreate, current_user: dict = Depends(require_role("admin"))):
def update_period(period_id: int, period: PeriodUpdate, current_user: dict = Depends(require_role("admin"))):
def delete_period(period_id: int, current_user: dict = Depends(require_role("admin"))):
```

**Por esto:**
```python
def get_periods():
def get_period(period_id: int):
def create_period(period: PeriodCreate):
def update_period(period_id: int, period: PeriodUpdate):
def delete_period(period_id: int):
```

Y el import queda `from fastapi import APIRouter, HTTPException, status` (sin `Depends`), sin la
línea `from app.deps import get_current_user, require_role`.

---

### 8. `backend/app/routes/user_routes.py`

Mismo patrón que `period_routes.py` — quitar `Depends(get_current_user)` de `get_users`/`get_user`
y `Depends(require_role("admin"))` de `create_user`/`update_user`/`delete_user`, y el import de
`app.deps`.

---

### 9. `backend/app/routes/metrics_routes.py`

**Cambia esto:**
```python
from fastapi import APIRouter, Query, Depends
from app.services import metrics_service, ai_service
from app.deps import require_role

router = APIRouter()

@router.get("/metrics/summary")
def get_metrics_summary(
    period_id: int = Query(..., description="ID del periodo a consultar"),
    current_user: dict = Depends(require_role("admin", "team_leader", "tutor"))
):
    """Obtiene un resumen global de las métricas (KPIs y promedios por persona) en un periodo."""
    return metrics_service.get_metrics_summary(period_id)

@router.get("/metrics/ai-summary")
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo"),
    current_user: dict = Depends(require_role("admin"))
):
    """Obtiene o genera un resumen de feedback con Claude IA para un evaluado en un periodo."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}
```

**Por esto:**
```python
from fastapi import APIRouter, Query
from app.services import metrics_service, ai_service

router = APIRouter()

@router.get("/metrics/summary")
def get_metrics_summary(period_id: int = Query(..., description="ID del periodo a consultar")):
    """Obtiene un resumen global de las métricas (KPIs y promedios por persona) en un periodo."""
    return metrics_service.get_metrics_summary(period_id)

@router.get("/metrics/ai-summary")
def get_ai_summary(
    evaluatee_id: int = Query(..., description="ID del evaluado"),
    period_id: int = Query(..., description="ID del periodo")
):
    """Obtiene o genera un resumen de feedback con Claude IA para un evaluado en un periodo."""
    summary = ai_service.get_or_generate_ai_summary(evaluatee_id, period_id)
    return {"summary": summary}
```

---

### 10. `backend/app/deps.py` y `backend/app/config/security.py`

`get_current_user`, `require_role`, `create_access_token`, `decode_access_token` quedan sin uso.
Se pueden borrar o dejar sin llamar — no es obligatorio para que la app funcione.

---

## Frontend

### 11. `frontend/src/services/auth.service.js`

**Cambia esto:**
```js
import { request, jsonOptions } from './api.service.js'

const SESSION_KEY = "SESSION_ACTUAL"
const TOKEN_KEY = "SESSION_TOKEN" // debe coincidir con la misma clave en api.service.js

const login = async (email, password) =>
    await request('/auth/login', jsonOptions('POST', { email, password }))

const setSession = (user, token) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    localStorage.setItem(TOKEN_KEY, token)
}

const getSession = () => {
    const sessionJSON = localStorage.getItem(SESSION_KEY);
    return JSON.parse(sessionJSON) || null;
}

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(TOKEN_KEY)
}


export const authService = {
    login,
    setSession,
    getSession,
    clearSession,
}
```

**Por esto:**
```js
import { request, jsonOptions } from './api.service.js'

const SESSION_KEY = "SESSION_ACTUAL"

const login = async (email, password) =>
    await request('/auth/login', jsonOptions('POST', { email, password }))

const setSession = (user) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

const getSession = () => {
    const sessionJSON = localStorage.getItem(SESSION_KEY);
    return JSON.parse(sessionJSON) || null;
}

const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
}


export const authService = {
    login,
    setSession,
    getSession,
    clearSession,
}
```

---

### 12. `frontend/src/services/api.service.js`

**Cambia esto:**
```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const TOKEN_KEY = "SESSION_TOKEN" // debe coincidir con la misma clave en auth.service.js

const jsonHeaders = {
  "Content-Type": "application/json"
}

// El backend protege casi todos los endpoints con JWT: si hay token guardado,
// lo mandamos en cada petición sin que cada *.service.js tenga que acordarse.
const authHeader = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const request = async (path, options = {}) => {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: { ...authHeader(), ...options.headers }
  })
  if (!response.ok) {
    throw new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`)
  }
  return await response.json()
}
```

**Por esto:**
```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const jsonHeaders = {
  "Content-Type": "application/json"
}

export const request = async (path, options) => {
  const response = await fetch(BASE_URL + path, options)
  if (!response.ok) {
    throw new Error(`Error: ${response.status} La peticion ha fallado en el endpoint ${BASE_URL}${path}`)
  }
  return await response.json()
}
```

(la línea de `VITE_API_BASE_URL` se queda igual — eso es para el despliegue, no tiene nada que ver
con el JWT)

---

### 13. `frontend/src/views/auth/login.js`

**Cambia esto:**
```js
const { user, access_token } = await authService.login(email, password);

authService.setSession(user, access_token);
```

**Por esto:**
```js
const { user } = await authService.login(email, password);

authService.setSession(user);
```

---

### 14. `frontend/src/views/coder/evaluate.view.js`

**Cambia esto (línea ~238-246):**
```js
const evaluationData = {
  // evaluator_id no se manda: el backend lo toma del token de sesión.
  evaluatee_id: parseInt(evaluatee.value),
  template_id: currentTemplate.id,
  period_id: activePeriod.id,
  is_anonymous: anonCheck.checked,
  status: "submitted",
  answers
};
```

**Por esto:**
```js
const evaluationData = {
  evaluator_id: currentUser.id,
  evaluatee_id: parseInt(evaluatee.value),
  template_id: currentTemplate.id,
  period_id: activePeriod.id,
  is_anonymous: anonCheck.checked,
  status: "submitted",
  answers
};
```

**Hace:** ahora que el backend no puede sacar el `evaluator_id` de un token, el front lo manda a
mano usando `currentUser` (ya está definido más arriba en el archivo, línea 81:
`authService.getSession()`).

---

## Dato de prueba

Los usuarios demo en `database/schema.sql` siguen con `password_hash = '$2y$placeholder'` (no es
un hash bcrypt real, esto no cambio con el sync a develop). No van a poder loguearse hasta que se
les genere un hash bcrypt real, o se cree un usuario nuevo por `POST /users` (ese si hashea bien).

---

## 15. `backend/tests/conftest.py`

**Cambia esto:**
```python
from app.main import app
from app.config.database import conn
from app.config.security import create_access_token

# IDs de los usuarios semilla de database/schema.sql
CODER_ID = 1
TEAM_LEADER_ID = 2
TUTOR_ID = 3
ADMIN_ID = 4


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def coder_headers():
    token = create_access_token({"sub": str(CODER_ID), "role": "coder"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def team_leader_headers():
    token = create_access_token({"sub": str(TEAM_LEADER_ID), "role": "team_leader"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def tutor_headers():
    token = create_access_token({"sub": str(TUTOR_ID), "role": "tutor"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token({"sub": str(ADMIN_ID), "role": "admin"})
    return {"Authorization": f"Bearer {token}"}
```

**Por esto:**
```python
from app.main import app
from app.config.database import conn

# IDs de los usuarios semilla de database/schema.sql
CODER_ID = 1
TEAM_LEADER_ID = 2
TUTOR_ID = 3
ADMIN_ID = 4


@pytest.fixture
def client():
    return TestClient(app)
```

**Hace:** sin JWT no hay headers que armar — se borran las 4 fixtures `*_headers` y el import de
`create_access_token`. `client` y `temp_period` se quedan igual que estan.

---

## 16. `backend/tests/test_rbac.py` — borrar el archivo entero

Los 4 tests de ese archivo verifican que rutas devuelvan `403`/`401` sin el rol o el token
correctos. Sin JWT, ninguna ruta rechaza nada por rol — esos escenarios ya no existen, no hay
forma de "arreglar" el archivo, hay que borrarlo.

---

## 17. `backend/tests/test_evaluations.py` — reescribir 3 de los 6 tests

No hace falta reescribir el archivo entero, pero estos tests parten de un supuesto que ya no es
cierto:

- **`test_evaluator_id_se_toma_del_token_no_del_body`**: prueba que el backend *ignora* un
  `evaluator_id` falso en el body porque lo saca del token. Ahora el backend *siempre* usa el
  `evaluator_id` del body — este test hay que borrarlo (ya no hay nada que proteger ahí, es
  justamente la advertencia 1 del principio de este documento).
- **`test_evaluado_no_puede_ver_historial_de_otra_persona`**: espera `403` cuando el Team Leader
  (id=2) pide el historial del Tutor (id=3). Sin token, `/evaluations` ya no rechaza esto —
  borrarlo tambien.
- **`test_evaluado_no_ve_quien_lo_evaluo_ni_en_no_anonimas`**: usa `team_leader_headers` y
  `admin_headers` para simular cada rol. Hay que cambiar esas dos llamadas por el query param
  nuevo: `client.get(f"/evaluations?evaluatee_id={{TEAM_LEADER_ID}}")` (sin `viewer_role`, hoy
  oculta el evaluador) y `client.get(f"/evaluations?evaluatee_id={{TEAM_LEADER_ID}}&viewer_role=admin")`
  (para simular al admin).

Los otros 3 tests (`test_no_se_puede_evaluar_dos_veces...`, `test_duplicado_no_se_salta...`,
`test_evaluado_puede_ver_su_propio_historial`) siguen probando reglas de negocio reales que no
cambiaron — solo hay que sacarles el parametro `headers=coder_headers` de la llamada y meter
`evaluator_id` directo en el payload de `_payload(...)`.

---

## 18. `backend/tests/test_auth.py` y `backend/tests/test_metrics.py` — no tocar

Ninguno de los dos usa headers ni fixtures de rol: `test_auth.py` solo prueba `/auth/login` con
credenciales invalidas, y `test_metrics.py` llama directo a las funciones de
`metrics_service.py` (sin pasar por HTTP). Quedan exactamente igual.


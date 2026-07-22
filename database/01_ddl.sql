-- =====================================================================
-- Riwi LeadTrace — Script SQL inicial (MVP)
-- Motor: MySQL 8
-- Modelo relacional normalizado hasta 3FN (ver docs/07-base-de-datos.md)
-- Uso: mysql -u root -p < database/01_ddl.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS riwi_lead_trace
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE riwi_lead_trace;

-- Idempotencia para entorno de desarrollo.
-- El orden importa: hijos antes que padres, o las FK bloquean el DROP.
--
-- `detalles_evaluacion` es el nombre LEGADO de `evaluation_details` (se
-- renombro a ingles). Se dropea aparte para que este script funcione tal cual
-- sobre un entorno que todavia venga del esquema viejo -- sin esta linea, su FK
-- `fk_answer_eval` impide dropear `evaluations` y el script muere a la mitad.
DROP TABLE IF EXISTS detalles_evaluacion;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS admin_activity_log;
DROP TABLE IF EXISTS ai_feedback_cache;
DROP TABLE IF EXISTS evaluation_details;
DROP TABLE IF EXISTS evaluation_submissions;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS forms;
DROP TABLE IF EXISTS periods;
DROP TABLE IF EXISTS team_leader_clans;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS clans;
DROP TABLE IF EXISTS cohorts;
DROP TABLE IF EXISTS roles;

-- ---------------------------------------------------------------------
-- Catálogo de roles
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Cohortes (agrupan clanes)
-- ---------------------------------------------------------------------
CREATE TABLE cohorts (
    id     INT AUTO_INCREMENT PRIMARY KEY,
    number INT NOT NULL UNIQUE,
    name   VARCHAR(80) NOT NULL,
    city   VARCHAR(80) NULL
);

-- ---------------------------------------------------------------------
-- Clanes (dentro de una cohorte; a ellos pertenecen Coders y Tutores)
-- ---------------------------------------------------------------------
CREATE TABLE clans (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    cohort_id INT NOT NULL,
    number    INT NOT NULL,
    name      VARCHAR(80) NOT NULL,
    CONSTRAINT fk_clan_cohort
        FOREIGN KEY (cohort_id)
        REFERENCES cohorts(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_clan_number_cohort UNIQUE (cohort_id, number)
);

-- ---------------------------------------------------------------------
-- Usuarios
--   clan_id es NULL para team_leader/admin; lo usan coder y tutor
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    clan_id       INT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_clan
        FOREIGN KEY (clan_id)
        REFERENCES clans(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Roles de Usuarios (Relación N:M para soportar múltiples roles por usuario)
-- ---------------------------------------------------------------------
CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_userroles_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_userroles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Asignación de múltiples clanes para Team Leaders
--   Los coders usan users.clan_id (relación 1:1).
--   Los TLs (que pueden tener 2 o más) usan esta tabla.
-- ---------------------------------------------------------------------
CREATE TABLE team_leader_clans (
    user_id INT NOT NULL,
    clan_id INT NOT NULL,
    PRIMARY KEY (user_id, clan_id),
    CONSTRAINT fk_tlclans_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_tlclans_clan
        FOREIGN KEY (clan_id)
        REFERENCES clans(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- Periodos de evaluación
-- ---------------------------------------------------------------------
CREATE TABLE periods (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(60) NOT NULL,
    starts_at DATE NOT NULL,
    ends_at   DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- ---------------------------------------------------------------------
-- Categorias de pregunta (tema/competencia que agrupa preguntas dentro de
-- una plantilla, ej. "Comunicación efectiva"). El Admin las administra
-- (crear/renombrar/borrar) independientemente de las plantillas: no se
-- puede borrar una categoria mientras alguna pregunta -activa o historica-
-- la use (fk_question_category, ON DELETE RESTRICT mas abajo).
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Plantillas de formulario (por rol evaluado)
-- ---------------------------------------------------------------------
CREATE TABLE forms (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(120) NOT NULL,
    description    VARCHAR(255) NULL,
    -- NULL solo es valido en plantillas (ver chk_form_role_required). Una
    -- plantilla puede ser generica y no pertenecer a ningun rol evaluable;
    -- el rol se elige al instanciarla como formulario vivo.
    target_role_id INT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    -- TRUE = plantilla base reutilizable (inerte: nunca recibe respuestas);
    -- FALSE = formulario vivo para recibir respuestas.
    -- Ver form_service.create_form y el filtro `kind` de GET /forms.
    is_template    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Retirado de la grilla del admin sin perder el historial. Es distinto de
    -- is_active: is_active = FALSE lo recibe TODO formulario superado cuando se
    -- activa uno nuevo, asi que reusarlo esconderia cada formulario reemplazado.
    -- Solo lo escribe form_service.delete_form cuando el formulario ya tiene
    -- evaluaciones y por tanto no se puede borrar de verdad.
    archived_at    TIMESTAMP NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- SIN `ON UPDATE CASCADE` a proposito, a diferencia del resto de FKs del
    -- esquema: MySQL prohibe que una columna con accion referencial participe
    -- en un CHECK (ERROR 3823), y aqui el CHECK vale mas. `roles` es un
    -- catalogo sembrado cuyos ids no cambian nunca, asi que el CASCADE no
    -- protegia de nada real; el CHECK si evita formularios vivos sin rol.
    CONSTRAINT fk_form_role
        FOREIGN KEY (target_role_id)
        REFERENCES roles(id)
        ON DELETE RESTRICT,
    -- El invariante NO vive solo en el servicio: una plantilla puede no tener
    -- rol, pero un formulario vivo SIEMPRE debe tenerlo. MySQL 8.0.16+ lo
    -- aplica de verdad, asi que ningun endpoint nuevo puede saltarselo.
    CONSTRAINT chk_form_role_required
        CHECK (is_template = TRUE OR target_role_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- Preguntas / criterios de una plantilla
-- ---------------------------------------------------------------------
CREATE TABLE questions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    form_id       INT NOT NULL,
    text          VARCHAR(255) NOT NULL,
    category_id   INT NOT NULL,
    input_type    VARCHAR(20) NOT NULL DEFAULT 'scale', -- 'scale' | 'text' | 'yes_no'
    sort_order    INT NOT NULL DEFAULT 0,
    -- Peso de la pregunta en el ICP ponderado (ADMIN-02). Solo aplica a
    -- preguntas 'scale'; las 'text' quedan en 0. Los pesos de las preguntas
    -- de escala ACTIVAS de un mismo form deben sumar exactamente 100
    -- (se valida en question_service antes de guardar, ver PUT /questions/weights).
    weight_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    -- Edición del Admin (ADMIN-02): editar texto = versionar (fila nueva +
    -- desactivar la anterior). Las evaluaciones nuevas cargan solo activas;
    -- las respuestas históricas conservan su pregunta y su peso original.
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_question_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    -- RESTRICT a proposito: el Admin no puede borrar una categoria mientras
    -- una pregunta (activa o historica, para no perder el criterio que
    -- realmente se respondio en evaluaciones pasadas) siga apuntando a ella.
    CONSTRAINT fk_question_category FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_input_type CHECK (input_type IN ('scale','text','yes_no')),
    CONSTRAINT chk_weight_percent_range CHECK (weight_percent >= 0 AND weight_percent <= 100)
);

-- ---------------------------------------------------------------------
-- Evaluaciones
--   Contiene SOLO el contenido de la evaluacion (a quien, con que formulario,
--   en que periodo y su estado). NO guarda quien evaluo: esa informacion vive
--   en evaluation_submissions (ver mas abajo).
--
--   Por que se separo: cuando evaluator_id vivia aqui, una evaluacion anonima
--   lo guardaba en NULL (regla 1, anonimato real). Eso rompia dos cosas:
--     1. El chequeo de duplicado filtraba por evaluator_id, asi que una
--        evaluacion anonima era invisible -> un coder podia evaluar a la misma
--        persona ilimitadas veces de forma anonima. El indice unico tampoco lo
--        detectaba, porque MySQL admite multiples NULL en un indice UNIQUE.
--     2. El historial propio del coder (filtrado por evaluator_id) no mostraba
--        sus propias evaluaciones anonimas.
--   Al separar "quien participo" de "que se respondio", el anti-duplicado pasa
--   a ser un constraint real de BD y el anonimato sigue siendo real.
-- ---------------------------------------------------------------------
CREATE TABLE evaluations (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id INT NOT NULL,
    form_id      INT NOT NULL,
    period_id    INT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status       ENUM('draft', 'submitted') NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eval_evaluatee
        FOREIGN KEY (evaluatee_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eval_form
        FOREIGN KEY (form_id)
        REFERENCES forms(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eval_period
        FOREIGN KEY (period_id)
        REFERENCES periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_status CHECK (status IN ('draft','submitted'))
);

-- ---------------------------------------------------------------------
-- Participaciones (quien evaluo a quien, en que periodo)
--
--   Es el "libro de asistencia" del sistema: registra que un evaluador YA
--   participo sobre un evaluado en un periodo. 
--   El `evaluation_id` siempre apunta a la evaluación, incluso en anónimas,
--   para permitir al coder consultar su propio historial de respuestas.
--
--   ATENCION: esto implica que el anonimato NO es estructural. El vinculo
--   evaluador->contenido esta almacenado y un JOIN sin filtrar lo revela. Lo
--   tapan dos filtros de aplicacion (`vw_evaluations_summary` y
--   `get_evaluator_ids_for_evaluations`), asi que cualquier query nueva sobre
--   esta tabla debe filtrar `is_anonymous` por su cuenta. Decision consciente
--   del equipo (2026-07-21): historial del coder por encima de anonimato duro.
--
--   Semantica de evaluation_id:
--     - Apunta a la evaluacion siempre.
--     - Queda en NULL solamente si la evaluacion original es eliminada (ON DELETE SET NULL)
--       para conservar el registro de participacion (anti-duplicado).
--
--   uq_submission_once es el anti-duplicado REAL: ninguna de sus tres columnas
--   admite NULL, asi que MySQL si lo hace cumplir tambien para las anonimas
--   (a diferencia del antiguo indice uq_eval_once sobre evaluations, que era
--   inutil en ese caso). La validacion de aplicacion en evaluation_service
--   sigue existiendo para devolver un 409 con mensaje claro, pero ya no es la
--   unica linea de defensa: la BD es ahora la autoridad.
--
--   ON DELETE del FK a evaluations: SET NULL (no CASCADE, no RESTRICT).
--     - CASCADE borraria la participacion junto con la evaluacion y reabriria
--       el agujero: el evaluador podria volver a evaluar.
--     - RESTRICT impediria borrar evaluaciones para siempre.
--     - SET NULL conserva el registro de participacion y lo degrada a
--       "participo, contenido no disponible", que es la semantica deseada.
--       Es el UNICO caso en que evaluation_id queda en NULL.
-- ---------------------------------------------------------------------
CREATE TABLE evaluation_submissions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id  INT NOT NULL,
    evaluatee_id  INT NOT NULL,
    period_id     INT NOT NULL,
    -- NULL solo cuando la evaluacion es eliminada (ON DELETE SET NULL)
    evaluation_id INT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submission_evaluator
        FOREIGN KEY (evaluator_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_submission_evaluatee
        FOREIGN KEY (evaluatee_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_submission_period
        FOREIGN KEY (period_id)
        REFERENCES periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_submission_evaluation
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluations(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    -- Anti-duplicado real: aplica TAMBIEN a las evaluaciones anonimas
    CONSTRAINT uq_submission_once UNIQUE (evaluator_id, evaluatee_id, period_id),
    -- Una evaluacion pertenece a UN solo evaluador. Sin esto, dos
    -- participaciones podrian apuntar a la misma evaluacion y vw_evaluations_summary
    -- duplicaria filas. Si las evaluaciones se borran, los NULL conviven.
    CONSTRAINT uq_submission_evaluation UNIQUE (evaluation_id)
);


-- ---------------------------------------------------------------------
-- Respuestas por pregunta
-- ---------------------------------------------------------------------
CREATE TABLE evaluation_details (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    question_id   INT NOT NULL,
    score         SMALLINT NULL, -- 1..5 cuando la pregunta es de escala
    comment       TEXT NULL,
    CONSTRAINT fk_answer_eval
        FOREIGN KEY (evaluation_id)
        REFERENCES evaluations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_answer_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_score_range CHECK (score IS NULL OR (score BETWEEN 1 AND 5))
);

-- ---------------------------------------------------------------------
-- Cache de resúmenes generados por IA (Google Gemini) para el Admin
-- ---------------------------------------------------------------------
CREATE TABLE ai_feedback_cache (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id  INT NOT NULL,
    period_id     INT NOT NULL,
    summary       TEXT NOT NULL,
    model         VARCHAR(40) NOT NULL,
    generated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_cache_evaluatee
        FOREIGN KEY (evaluatee_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_ai_cache_period
        FOREIGN KEY (period_id)
        REFERENCES periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_ai_cache_evaluatee_period UNIQUE (evaluatee_id, period_id)
);

-- ---------------------------------------------------------------------
-- Bitacora de acciones administrativas (auditoria basica)
--   admin_id es NULL si la accion se registro sin sesion identificada
--   (no hay JWT: el id que llega es el que el propio front manda, igual
--   que evaluator_id en evaluation_submissions -- ver seccion "Roles del sistema"
--   de CLAUDE.md). No es prueba criptografica de autoria, es un registro
--   de conveniencia para trazabilidad.
-- ---------------------------------------------------------------------
CREATE TABLE admin_activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    admin_id    INT NULL,
    action      VARCHAR(60) NOT NULL,
    target_type VARCHAR(40) NOT NULL,
    target_id   INT NULL,
    detail      VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_admin
        FOREIGN KEY (admin_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- Configuracion global del sistema (fila unica, id = 1)
--   Tabla "singleton": settings_repository.py siempre lee/escribe WHERE id = 1.
--   El CHECK sobre id la mantiene como una sola fila a nivel de BD, para que
--   nadie inserte una segunda configuracion que el backend nunca leeria.
--   Los DEFAULT de cada columna son los valores de fabrica acordados por el
--   equipo; el seed de 02_dml.sql crea la fila id = 1 con esos mismos valores.
--
--   OJO: estos valores de fabrica viven DUPLICADOS en TRES sitios:
--     1. Los DEFAULT de columna de aqui abajo.
--     2. El INSERT semilla de database/02_dml.sql.
--     3. La constante SYSTEM_SETTINGS_DEFAULTS en
--        backend/app/services/settings_service.py, que es lo que sirve
--        GET /settings/defaults (el boton "Valores por Defecto" del admin).
--   Si cambias un valor, cambialo en los tres o divergen en silencio.
-- ---------------------------------------------------------------------
CREATE TABLE system_settings (
    id                        TINYINT UNSIGNED NOT NULL DEFAULT 1 PRIMARY KEY,
    -- Motor de IA
    ai_temperature            DECIMAL(3,2) NOT NULL DEFAULT 0.70,
    ai_auto_summary           BOOLEAN NOT NULL DEFAULT TRUE,
    -- Politicas de evaluacion (umbrales de ICP y validacion de pesos)
    -- OJO: estos dos umbrales van en la MISMA escala que el ICP, que es 0-100
    -- (vw_period_metrics normaliza con ((media_ponderada) - 1) / 4 * 100).
    -- DECIMAL(5,2), no (4,2): con (4,2) el tope es 99.99 y un admin no podria
    -- guardar 100. Los consume metrics_service.classify_status.
    score_risk_threshold      DECIMAL(5,2) NOT NULL DEFAULT 60.00,
    score_excellent_threshold DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    weight_tolerance          DECIMAL(4,2) NOT NULL DEFAULT 0.01,
    strict_entity_lock        BOOLEAN NOT NULL DEFAULT TRUE,
    required_evaluations      SMALLINT UNSIGNED NOT NULL DEFAULT 3,
    -- Mantenimiento / auditoria
    log_retention_days        SMALLINT UNSIGNED NOT NULL DEFAULT 90,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_ai_temperature CHECK (ai_temperature BETWEEN 0 AND 1),
    CONSTRAINT chk_score_risk_threshold CHECK (score_risk_threshold BETWEEN 0 AND 100),
    CONSTRAINT chk_score_excellent_threshold CHECK (score_excellent_threshold BETWEEN 0 AND 100),
    CONSTRAINT chk_required_evaluations CHECK (required_evaluations >= 1),
    CONSTRAINT chk_log_retention_days CHECK (log_retention_days >= 1)
);

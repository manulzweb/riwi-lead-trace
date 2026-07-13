-- =====================================================================
-- Riwi LeadTrace — Script SQL inicial (MVP)
-- Motor: MySQL 8
-- Modelo relacional normalizado hasta 3FN (ver docs/07-base-de-datos.md)
-- Uso: mysql -u root -p < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS riwi_lead_trace
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE riwi_lead_trace;

-- Idempotencia para entorno de desarrollo
DROP TABLE IF EXISTS ai_feedback_cache;
DROP TABLE IF EXISTS evaluation_answers;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS form_templates;
DROP TABLE IF EXISTS periods;
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
    CONSTRAINT fk_clan_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id)
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
    role_id       INT NOT NULL,
    clan_id       INT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_users_clan FOREIGN KEY (clan_id) REFERENCES clans(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
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
-- Plantillas de formulario (por rol evaluado)
-- ---------------------------------------------------------------------
CREATE TABLE form_templates (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    title          VARCHAR(120) NOT NULL,
    target_role_id INT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_template_role FOREIGN KEY (target_role_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Preguntas / criterios de una plantilla
-- ---------------------------------------------------------------------
CREATE TABLE questions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    text        VARCHAR(255) NOT NULL,
    category    VARCHAR(60) NOT NULL,
    input_type  VARCHAR(20) NOT NULL DEFAULT 'scale', -- 'scale' | 'text'
    sort_order  INT NOT NULL DEFAULT 0,
    -- Edición del Admin (ADMIN-02): editar texto = versionar (fila nueva +
    -- desactivar la anterior). Las evaluaciones nuevas cargan solo activas;
    -- las respuestas históricas conservan su pregunta original.
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_question_template FOREIGN KEY (template_id) REFERENCES form_templates(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_input_type CHECK (input_type IN ('scale','text'))
);

-- ---------------------------------------------------------------------
-- Evaluaciones
--   evaluator_id es NULL cuando la evaluación es anónima (anonimato real)
-- ---------------------------------------------------------------------
CREATE TABLE evaluations (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id INT NULL,
    evaluatee_id INT NOT NULL,
    template_id  INT NOT NULL,
    period_id    INT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status       VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft' | 'submitted'
    submitted_at TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eval_evaluator FOREIGN KEY (evaluator_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eval_evaluatee FOREIGN KEY (evaluatee_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eval_template  FOREIGN KEY (template_id)  REFERENCES form_templates(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_eval_period    FOREIGN KEY (period_id)    REFERENCES periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_status CHECK (status IN ('draft','submitted'))
);

-- Evita doble evaluación del mismo evaluado en el mismo periodo (solo no anónimas)
CREATE UNIQUE INDEX uq_eval_once
    ON evaluations (evaluator_id, evaluatee_id, period_id);

-- ---------------------------------------------------------------------
-- Respuestas por pregunta
-- ---------------------------------------------------------------------
CREATE TABLE evaluation_answers (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    question_id   INT NOT NULL,
    score         SMALLINT NULL, -- 1..5 cuando la pregunta es de escala
    comment       TEXT NULL,
    CONSTRAINT fk_answer_eval     FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_answer_question FOREIGN KEY (question_id)   REFERENCES questions(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_score_range CHECK (score IS NULL OR (score BETWEEN 1 AND 5))
);

-- ---------------------------------------------------------------------
-- Cache de resúmenes generados por IA (Claude API) para el Admin
-- ---------------------------------------------------------------------
CREATE TABLE ai_feedback_cache (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluatee_id  INT NOT NULL,
    period_id     INT NOT NULL,
    summary       TEXT NOT NULL,
    model         VARCHAR(40) NOT NULL,
    generated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_cache_evaluatee FOREIGN KEY (evaluatee_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_ai_cache_period    FOREIGN KEY (period_id)    REFERENCES periods(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_ai_cache_evaluatee_period UNIQUE (evaluatee_id, period_id)
);

-- =====================================================================
-- Datos semilla (seed) — mínimos para desarrollo
-- =====================================================================
INSERT INTO roles (name) VALUES
    ('coder'), ('team_leader'), ('tutor'), ('admin');

INSERT INTO cohorts (number, name, city) VALUES
    (5, 'Cohorte 5', 'Medellín');

INSERT INTO clans (cohort_id, number, name) VALUES
    (1, 10, 'Clan 10');

INSERT INTO periods (name, starts_at, ends_at, is_active) VALUES
    ('2026-T1', '2026-01-15', '2026-04-15', TRUE);

-- Usuarios de ejemplo (password_hash es un placeholder; usar hash real en backend)
-- clan_id: NULL para team_leader/admin; asignado para coder/tutor
INSERT INTO users (full_name, email, password_hash, role_id, clan_id) VALUES
    ('Coder Demo',       'coder@riwi.edu',       '$2y$placeholder', 1, 1),
    ('Team Leader Demo', 'teamleader@riwi.edu',  '$2y$placeholder', 2, NULL),
    ('Tutor Demo',       'tutor@riwi.edu',       '$2y$placeholder', 3, 1),
    ('Admin Demo',       'admin@riwi.edu',       '$2y$placeholder', 4, NULL);

-- Plantillas: una para Team Leader, una para Tutor
INSERT INTO form_templates (title, target_role_id) VALUES
    ('Evaluación de Team Leader', 2),
    ('Evaluación de Tutor', 3);

-- Preguntas de la plantilla de Team Leader (id=1)
-- Categorías del ICP para TL, basadas en el MCA-21 (competencias de mentoría).
-- Deben coincidir EXACTAMENTE con las categorías/pesos de docs/06-arquitectura.md.
INSERT INTO questions (template_id, text, category, input_type, sort_order) VALUES
    (1, '¿Tu Team Leader se comunica de forma clara y oportuna contigo?',                   'Comunicación efectiva',       'scale', 1),
    (1, '¿Sientes que puedes hablar con tu Team Leader cuando algo no va bien?',            'Comunicación efectiva',       'scale', 2),
    (1, '¿Tu Team Leader deja claro qué se espera de ti en cada sprint o entrega?',         'Alineación de expectativas',  'scale', 3),
    (1, '¿Los objetivos que acuerda contigo son alcanzables y se revisan a tiempo?',        'Alineación de expectativas',  'scale', 4),
    (1, '¿Tu Team Leader verifica que realmente entendiste antes de seguir avanzando?',     'Verificación de comprensión', 'scale', 5),
    (1, '¿Adapta sus explicaciones cuando nota que algo no quedó claro?',                   'Verificación de comprensión', 'scale', 6),
    (1, '¿Te impulsa a resolver problemas por tu cuenta antes de darte la solución?',       'Fomento de la independencia', 'scale', 7),
    (1, '¿Sientes que hoy dependes menos de él/ella que al inicio del módulo?',             'Fomento de la independencia', 'scale', 8),
    (1, '¿Te da retroalimentación que te ayuda a crecer como desarrollador/a?',             'Desarrollo profesional',      'scale', 9),
    (1, '¿Te orienta sobre cómo mejorar tu perfil profesional (hábitos, portafolio, rol)?', 'Desarrollo profesional',      'scale', 10),
    (1, 'Comentarios adicionales (¿qué debería mantener y qué debería cambiar?)',           'General',                     'text',  11);

-- Preguntas de la plantilla de Tutor (id=2)
-- Categorías del ICP para Tutor, basadas en el SEEQ (Marsh, 1982).
-- Deben coincidir EXACTAMENTE con las categorías/pesos de docs/06-arquitectura.md.
INSERT INTO questions (template_id, text, category, input_type, sort_order) VALUES
    (2, '¿Lo que aprendes con tu Tutor te sirve para resolver los retos del módulo?',       'Valor del aprendizaje',        'scale', 1),
    (2, '¿Las sesiones con tu Tutor te aportan algo que no lograrías solo/a?',              'Valor del aprendizaje',        'scale', 2),
    (2, '¿Tu Tutor explica los temas técnicos de forma clara y ordenada?',                  'Claridad y organización',      'scale', 3),
    (2, '¿Sus ejemplos y ejercicios están bien preparados para tu nivel?',                  'Claridad y organización',      'scale', 4),
    (2, '¿Tu Tutor te trata con respeto y se interesa por tu proceso individual?',          'Cercanía individual',          'scale', 5),
    (2, '¿Te sientes en confianza para preguntarle sin temor a ser juzgado/a?',             'Cercanía individual',          'scale', 6),
    (2, '¿Tu Tutor está disponible en los espacios acordados cuando lo necesitas?',         'Disponibilidad e interacción', 'scale', 7),
    (2, '¿Responde tus dudas en un tiempo razonable?',                                      'Disponibilidad e interacción', 'scale', 8),
    (2, 'Comentarios adicionales (¿qué debería mantener y qué debería cambiar?)',           'General',                      'text',  9);

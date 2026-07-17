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

-- Usuarios de ejemplo. password_hash es un hash bcrypt real (no un
-- placeholder) para la contraseña de prueba "Riwi2026!" -- antes era
-- '$2y$placeholder', que no es un hash bcrypt valido y no dejaba loguear
-- a ningun usuario semilla.
-- clan_id: NULL para team_leader/admin; asignado para coder/tutor
INSERT INTO users (full_name, email, password_hash, role_id, clan_id) VALUES
    ('Coder Demo',       'coder@riwi.edu',       '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1, 1),
    ('Team Leader Demo', 'teamleader@riwi.edu',  '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 2, NULL),
    ('Tutor Demo',       'tutor@riwi.edu',       '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 3, 1),
    ('Admin Demo',       'admin@riwi.edu',       '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 4, NULL);

-- Plantillas: una para Team Leader, una para Tutor
INSERT INTO form_templates (title, target_role_id) VALUES
    ('Evaluación de Team Leader', 2),
    ('Evaluación de Tutor', 3);

-- Preguntas de la plantilla de Team Leader (id=1)
-- Categorías del ICP para TL, basadas en el MCA-21 (competencias de mentoría).
-- Deben coincidir EXACTAMENTE con las categorías/pesos de docs/06-arquitectura.md.
-- 10 preguntas de escala con peso igual (10.00 cada una = 100.00); la de
-- texto no pondera (weight_percent queda en su default 0).
INSERT INTO questions (template_id, text, category, input_type, sort_order, weight_percent) VALUES
    (1, '¿Tu Team Leader se comunica de forma clara y oportuna contigo?',                   'Comunicación efectiva',       'scale', 1,  10.00),
    (1, '¿Sientes que puedes hablar con tu Team Leader cuando algo no va bien?',            'Comunicación efectiva',       'scale', 2,  10.00),
    (1, '¿Tu Team Leader deja claro qué se espera de ti en cada sprint o entrega?',         'Alineación de expectativas',  'scale', 3,  10.00),
    (1, '¿Los objetivos que acuerda contigo son alcanzables y se revisan a tiempo?',        'Alineación de expectativas',  'scale', 4,  10.00),
    (1, '¿Tu Team Leader verifica que realmente entendiste antes de seguir avanzando?',     'Verificación de comprensión', 'scale', 5,  10.00),
    (1, '¿Adapta sus explicaciones cuando nota que algo no quedó claro?',                   'Verificación de comprensión', 'scale', 6,  10.00),
    (1, '¿Te impulsa a resolver problemas por tu cuenta antes de darte la solución?',       'Fomento de la independencia', 'scale', 7,  10.00),
    (1, '¿Sientes que hoy dependes menos de él/ella que al inicio del módulo?',             'Fomento de la independencia', 'scale', 8,  10.00),
    (1, '¿Te da retroalimentación que te ayuda a crecer como desarrollador/a?',             'Desarrollo profesional',      'scale', 9,  10.00),
    (1, '¿Te orienta sobre cómo mejorar tu perfil profesional (hábitos, portafolio, rol)?', 'Desarrollo profesional',      'scale', 10, 10.00),
    (1, 'Comentarios adicionales (¿qué debería mantener y qué debería cambiar?)',           'General',                     'text',  11, 0);

-- Preguntas de la plantilla de Tutor (id=2)
-- Categorías del ICP para Tutor, basadas en el SEEQ (Marsh, 1982).
-- Deben coincidir EXACTAMENTE con las categorías/pesos de docs/06-arquitectura.md.
-- 8 preguntas de escala con peso igual (12.50 cada una = 100.00).
INSERT INTO questions (template_id, text, category, input_type, sort_order, weight_percent) VALUES
    (2, '¿Lo que aprendes con tu Tutor te sirve para resolver los retos del módulo?',       'Valor del aprendizaje',        'scale', 1, 12.50),
    (2, '¿Las sesiones con tu Tutor te aportan algo que no lograrías solo/a?',              'Valor del aprendizaje',        'scale', 2, 12.50),
    (2, '¿Tu Tutor explica los temas técnicos de forma clara y ordenada?',                  'Claridad y organización',      'scale', 3, 12.50),
    (2, '¿Sus ejemplos y ejercicios están bien preparados para tu nivel?',                  'Claridad y organización',      'scale', 4, 12.50),
    (2, '¿Tu Tutor te trata con respeto y se interesa por tu proceso individual?',          'Cercanía individual',          'scale', 5, 12.50),
    (2, '¿Te sientes en confianza para preguntarle sin temor a ser juzgado/a?',             'Cercanía individual',          'scale', 6, 12.50),
    (2, '¿Tu Tutor está disponible en los espacios acordados cuando lo necesitas?',         'Disponibilidad e interacción', 'scale', 7, 12.50),
    (2, '¿Responde tus dudas en un tiempo razonable?',                                      'Disponibilidad e interacción', 'scale', 8, 12.50),
    (2, 'Comentarios adicionales (¿qué debería mantener y qué debería cambiar?)',           'General',                      'text',  9, 0);

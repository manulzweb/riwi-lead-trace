-- =====================================================================
-- Datos semilla (seed) — mínimos para desarrollo
-- =====================================================================
INSERT INTO roles (name) VALUES
    ('coder'), ('team_leader'), ('tutor'), ('admin');

INSERT INTO cohorts (number, name, city) VALUES
    (5, 'Cohorte 5', 'Barranquilla'),
    (6, 'Cohorte 6', 'Medellín');

INSERT INTO clans (cohort_id, number, name) VALUES
    (1, 10, 'Esthercita'),
    (1, 11, 'Centurión'),
    (1, 12, 'Puerta de Oro'),
    (1, 13, 'Magdalena'),
    (1, 14, 'Micaela'),
    (1, 15, 'Cayena'),
    (1, 16, 'Malecón'),
    (1, 17, 'Cortissoz'),
    (2, 18, 'Antioquia'),
    (2, 19, 'Poblado'),
    (2, 20, 'Bello');

INSERT INTO periods (id, name, starts_at, ends_at, is_active) VALUES
    (1, 'Python', '2026-02-15', '2026-03-15', FALSE),
    (2, 'HTML & CSS', '2026-03-15', '2026-04-15', FALSE),
    (3, 'JavaScript', '2026-04-15', '2026-06-15', FALSE),
    (4, 'Bases de Datos', '2026-06-15', '2026-07-15', FALSE),
    (5, 'API TALKS', '2026-07-15', '2026-10-14', TRUE);

-- Usuarios de ejemplo. password_hash es un hash bcrypt real para la contraseña "Riwi2026!"
-- clan_id: NULL para team_leader/admin; asignado para coder/tutor
INSERT INTO users (id, full_name, email, password_hash, clan_id) VALUES
    (1, 'Admin Riwi',               'admin@riwi.io',     '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (2, 'Javier Cómbita',           'jcombita@riwi.io',  '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (3, 'Abraham Villa',            'avilla@riwi.io',    '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (4, 'Javier Ariza',             'jariza@riwi.io',    '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (5, 'Manuel Vásquez',           'mvasquez@riwi.io',  '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (6, 'Andrés Felipe Giraldo',    'agiraldo@riwi.io',  '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 2),
    (7, 'Vanessa Reniz',            'vreniz@riwi.io',    '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 3),
    (8, 'Sebastián',                'sebastian@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (9, 'Carlos',                   'carlos@riwi.io',    '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (10,'Yamit',                    'yamit@riwi.io',     '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (11,'Saeb',                     'saeb@riwi.io',      '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (46, 'Andrés Silva', 'asilva@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (47, 'Laura Giraldo', 'lgiraldo@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (48, 'Camilo Pérez', 'cperez@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', NULL),
    (49, 'Tutor Medellin 1', 'tmedellin1@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 9),
    (50, 'Tutor Medellin 2', 'tmedellin2@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 10),
    (51, 'Tutor Medellin 3', 'tmedellin3@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 11);

INSERT INTO user_roles (user_id, role_id) VALUES
    (1, 4), -- Admin
    (2, 2), (3, 2), (4, 2), (46, 2), (47, 2), (48, 2), -- Team Leaders
    (5, 3), (6, 3), (7, 3), (49, 3), (50, 3), (51, 3), -- Tutores
    (8, 1), (9, 1), (10, 1), (11, 1); -- Coders

-- Asignación de Team Leaders a Clanes (TL ID, Clan ID)
-- Clan 1 = Esthercita, Clan 2 = Centurión, Clan 3 = Puerta de Oro
INSERT INTO team_leader_clans (user_id, clan_id) VALUES
    (2, 1),
    (3, 2),
    (4, 3),
    (46, 9),
    (47, 10),
    (48, 11);

-- Categorias usadas por las plantillas semilla (el Admin puede agregar mas
-- desde /categories). Se referencian por nombre via subquery mas abajo para
-- no depender del orden de insercion (AUTO_INCREMENT).
INSERT INTO categories (name) VALUES
    ('Comunicación efectiva'),
    ('Alineación de expectativas'),
    ('Verificación de comprensión'),
    ('Fomento de la independencia'),
    ('Desarrollo profesional'),
    ('Valor del aprendizaje'),
    ('Claridad y organización'),
    ('Cercanía individual'),
    ('Disponibilidad e interacción'),
    ('General');

-- Plantillas: una para Team Leader, una para Tutor
INSERT INTO forms (id, title, target_role_id) VALUES
    (1, 'Evaluación de Team Leader', 2),
    (2, 'Evaluación de Tutor', 3);

-- Preguntas de la plantilla de Team Leader (id=1)
-- Categorías del ICP para TL, basadas en el MCA-21 (competencias de mentoría).
-- Deben coincidir EXACTAMENTE con las categorías/pesos de docs/06-arquitectura.md.
-- 10 preguntas de escala con peso igual (10.00 cada una = 100.00); la de
-- texto no pondera (weight_percent queda en su default 0).
INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent) VALUES
    (1, '¿Tu Team Leader se comunica de forma clara y oportuna durante los dailies y ceremonias del Sprint?', (SELECT id FROM categories WHERE name = 'Comunicación efectiva'), 'scale', 1, 10.00),
    (1, '¿Sientes confianza para hablar con tu Team Leader cuando te atrasas con un reto o simulacro?', (SELECT id FROM categories WHERE name = 'Comunicación efectiva'), 'scale', 2, 10.00),
    (1, '¿Tu Team Leader deja claras las rúbricas y lo que se espera de ti en las entregas de Riwi?', (SELECT id FROM categories WHERE name = 'Alineación de expectativas'), 'scale', 3, 10.00),
    (1, '¿El ritmo de trabajo que acuerda contigo es realista frente a los tiempos de los Sprints?', (SELECT id FROM categories WHERE name = 'Alineación de expectativas'), 'scale', 4, 10.00),
    (1, '¿Verifica que dominas la lógica del código antes de dejarte avanzar al siguiente tema?', (SELECT id FROM categories WHERE name = 'Verificación de comprensión'), 'scale', 5, 10.00),
    (1, '¿Adapta su forma de mentoría cuando ve que tienes bloqueos técnicos severos?', (SELECT id FROM categories WHERE name = 'Verificación de comprensión'), 'scale', 6, 10.00),
    (1, '¿Te impulsa a buscar soluciones en la documentación antes de darte la respuesta al reto?', (SELECT id FROM categories WHERE name = 'Fomento de la independencia'), 'scale', 7, 10.00),
    (1, '¿Sientes que tu autonomía ha mejorado para afrontar los Filtros (exámenes) de Riwi?', (SELECT id FROM categories WHERE name = 'Fomento de la independencia'), 'scale', 8, 10.00),
    (1, '¿Te da retroalimentación técnica (code reviews) que te ayuda a mejorar tus buenas prácticas?', (SELECT id FROM categories WHERE name = 'Desarrollo profesional'), 'scale', 9, 10.00),
    (1, '¿Te orienta sobre cómo potenciar tus habilidades blandas (soft skills) para el mundo laboral?', (SELECT id FROM categories WHERE name = 'Desarrollo profesional'), 'scale', 10, 10.00),
    (1, 'Comentarios adicionales sobre tu Team Leader (¿qué debería mantener y qué debería cambiar?)', (SELECT id FROM categories WHERE name = 'General'), 'text', 11, 0);

-- Preguntas de la plantilla de Tutor (id=2)
-- Categorías del ICP para Tutor, basadas en el SEEQ (Marsh, 1982).
-- 8 preguntas de escala con peso igual (12.50 cada una = 100.00).
INSERT INTO questions (form_id, text, category_id, input_type, sort_order, weight_percent) VALUES
    (2, '¿Las clases de tu Tutor te dan las bases necesarias para resolver los retos de Riwi?', (SELECT id FROM categories WHERE name = 'Valor del aprendizaje'), 'scale', 1, 12.50),
    (2, '¿El contenido que explica el Tutor aporta valor técnico real y actualizado?', (SELECT id FROM categories WHERE name = 'Valor del aprendizaje'), 'scale', 2, 12.50),
    (2, '¿El Tutor estructura sus clases teóricas de forma ordenada y fácil de digerir?', (SELECT id FROM categories WHERE name = 'Claridad y organización'), 'scale', 3, 12.50),
    (2, '¿Los ejemplos de código en vivo (live coding) están bien preparados y explican el porqué?', (SELECT id FROM categories WHERE name = 'Claridad y organización'), 'scale', 4, 12.50),
    (2, '¿Te trata con paciencia y respeto cuando haces preguntas durante la clase?', (SELECT id FROM categories WHERE name = 'Cercanía individual'), 'scale', 5, 12.50),
    (2, '¿Fomenta un ambiente seguro donde los Coders no sienten pena de participar?', (SELECT id FROM categories WHERE name = 'Cercanía individual'), 'scale', 6, 12.50),
    (2, '¿El Tutor está disponible en los canales de soporte (Slack/Discord) dentro del horario?', (SELECT id FROM categories WHERE name = 'Disponibilidad e interacción'), 'scale', 7, 12.50),
    (2, '¿Resuelve tus bloqueos técnicos puntuales en un tiempo razonable cuando le consultas?', (SELECT id FROM categories WHERE name = 'Disponibilidad e interacción'), 'scale', 8, 12.50),
    (2, 'Comentarios adicionales sobre tu Tutor (¿qué debería mantener y qué debería cambiar?)', (SELECT id FROM categories WHERE name = 'General'), 'text', 9, 0);


-- Usuarios reales exportados de Esthercita
INSERT INTO users (id, full_name, email, password_hash, clan_id) VALUES
    (12, 'Juan José Álvarez Manjarrez', 'jlvarezmanjarrez12@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (13, 'Javier Alexander Ávila Rodríguez', 'jvilarodrguez13@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (14, 'Kerin Enrique Barranco Martínez', 'kbarrancomartnez14@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (15, 'Marlon José Castillo De La Hoz', 'mlahoz15@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (16, 'Yuranys Paola Castro Ruiz', 'ycastroruiz16@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (17, 'Carlos Eduardo Charris Yepes', 'ccharrisyepes17@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (18, 'Jorge Luis Corrales Barraza', 'jcorralesbarraza18@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (19, 'Andrés Felipe Cortés Zambrano', 'acortszambrano19@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (20, 'Cristian David Del Castillo Ruiz', 'ccastilloruiz20@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (21, 'José del Carmen Díaz Díaz', 'jdazdaz21@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (22, 'Milton Daniel Escamilla Carreño', 'mescamillacarreo22@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (23, 'Thomas Eaton García Navas', 'tgarcanavas23@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (24, 'Jorel Yessith Hernandez Muñoz', 'jhernandezmuoz24@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (25, 'Juan David Hernández Viana', 'jhernndezviana25@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (26, 'Brandon Styl Herrera', 'bstylherrera26@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (27, 'Jair Daniel Lastre Arrieta', 'jlastrearrieta27@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (28, 'Maria Jose Leal Brochero', 'mlealbrochero28@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (29, 'Jhon Michael Lopera Velasquez', 'jloperavelasquez29@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (30, 'Juan José Maldonado Navarro', 'jmaldonadonavarro30@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (31, 'Juan Diego Marchena Comas', 'jmarchenacomas31@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (32, 'Iván David Mejía Mendez', 'imejamendez32@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (33, 'Sebastian Mendoza Brieva', 'smendozabrieva33@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (34, 'Leonela Isabel Miranda López', 'lmirandalpez34@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (35, 'Ibrahim Monroy', 'iibrahimmonroy35@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (36, 'Dilant Antonio Murillo', 'dantoniomurillo36@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (37, 'Yesid Palacio', 'yyesidpalacio37@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (38, 'Lians Dylan Paternina Lopez', 'lpaterninalopez38@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (39, 'Manuel David Rincón Clavijo', 'mrincnclavijo39@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (40, 'Elian David Rivera Guaca', 'eriveraguaca40@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (41, 'Samuel Roncancio Bertel', 'sroncanciobertel41@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (42, 'Axel David Ruiz Polo', 'aruizpolo42@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (43, 'Manuel Andrés Vásquez Mendoza', 'mvsquezmendoza43@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (44, 'Cesar Julio Vega Morales', 'cjulio@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1),
    (45, 'Daniela Zapata Jiménez', 'dzapata@riwi.io', '$2b$12$X3lXI8.p1a.6ffVYMmvbX..HFvR7V6qL6BF/oG2ug8Oe8JPIB0M5m', 1);

INSERT INTO user_roles (user_id, role_id) VALUES
    (12, 1),
    (13, 1),
    (14, 1),
    (15, 1),
    (16, 1),
    (17, 1),
    (18, 1),
    (19, 1),
    (20, 1),
    (21, 1),
    (22, 1),
    (23, 1),
    (24, 1),
    (25, 1),
    (26, 1),
    (27, 1),
    (28, 1),
    (29, 1),
    (30, 1),
    (31, 1),
    (32, 1),
    (33, 1),
    (34, 1),
    (35, 1),
    (36, 1),
    (37, 1),
    (38, 1),
    (39, 1),
    (40, 1),
    (41, 1),
    (42, 1),
    (43, 1),
    (44, 1),
    (45, 1);


-- ---------------------------------------------------------------------
-- Configuracion global: fila unica id = 1 con los valores de fabrica.
--   settings_repository.py hace SELECT/UPDATE ... WHERE id = 1, asi que sin
--   esta fila GET /settings devuelve {} y la vista de admin no puede pintar.
--   Los valores coinciden con los DEFAULT declarados en 01_ddl.sql.
-- ---------------------------------------------------------------------
INSERT INTO system_settings (
    id, ai_temperature, ai_auto_summary,
    score_risk_threshold, score_excellent_threshold, weight_tolerance,
    strict_entity_lock, required_evaluations, log_retention_days
) VALUES
    (1, 0.70, TRUE, 60.00, 80.00, 0.01, TRUE, 3, 90);



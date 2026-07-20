-- =====================================================================
-- Datos Históricos Simulados (Periodos pasados y evaluaciones)
-- Ejecutar después de 01_ddl.sql y 02_dml.sql
-- =====================================================================

USE riwi_lead_trace;

-- =====================================================================
-- 1. Insertar Periodos Pasados solicitados
-- =====================================================================
INSERT INTO periods (name, starts_at, ends_at, is_active) VALUES
    ('Python (Febrero)', '2026-02-01', '2026-02-28', FALSE),
    ('HTML & CSS (Marzo)', '2026-03-01', '2026-03-31', FALSE),
    ('JavaScript (Abril - Mayo)', '2026-04-01', '2026-05-31', FALSE),
    ('Bases de Datos (Junio)', '2026-06-01', '2026-06-30', TRUE);

-- Nota: Sus IDs serán 2, 3, 4, 5 respectivamente (asumiendo que 2026-T1 tiene id 1).

-- =====================================================================
-- 2. Insertar Evaluaciones para el periodo PYTHON (id = 2)
-- =====================================================================
-- Evaluador 8 (Coder) evalúa a Evaluatee 2 (Team Leader)
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (8, 2, 1, 2, FALSE, 'submitted', '2026-02-25 10:00:00'),
    (9, 2, 1, 2, FALSE, 'submitted', '2026-02-26 11:30:00'),
    (10, 5, 2, 2, TRUE, 'submitted', '2026-02-27 15:45:00'), -- Coder 10 evalua Tutor 5
    (11, 5, 2, 2, FALSE, 'submitted', '2026-02-28 09:15:00');

-- Respuestas Eval 1 (Coder 8 -> TL 2)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (1, 1, 4, NULL), (1, 2, 5, NULL), (1, 3, 4, NULL), (1, 4, 3, NULL), 
    (1, 5, 5, NULL), (1, 6, 4, NULL), (1, 7, 5, NULL), (1, 8, 4, NULL), 
    (1, 9, 5, NULL), (1, 10, 4, NULL), 
    (1, 11, NULL, 'Excelente mentor, explicó muy bien la lógica de Python y las estructuras de datos, aunque a veces asume que ya sabemos ciertas cosas básicas.');

-- Respuestas Eval 2 (Coder 9 -> TL 2)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (2, 1, 5, NULL), (2, 2, 5, NULL), (2, 3, 5, NULL), (2, 4, 4, NULL), 
    (2, 5, 5, NULL), (2, 6, 5, NULL), (2, 7, 4, NULL), (2, 8, 5, NULL), 
    (2, 9, 5, NULL), (2, 10, 5, NULL), 
    (2, 11, NULL, 'Javier siempre estuvo ahí cuando me bloqueaba con los diccionarios. Me ayudó a ser mucho más independiente leyendo la documentación oficial de Python.');

-- Respuestas Eval 3 (Coder 10 -> Tutor 5) - Preguntas 12 a 20 son de Tutor
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (3, 12, 5, NULL), (3, 13, 5, NULL), (3, 14, 4, NULL), (3, 15, 5, NULL), 
    (3, 16, 4, NULL), (3, 17, 5, NULL), (3, 18, 5, NULL), (3, 19, 4, NULL), 
    (3, 20, NULL, 'Las clases de Python fueron increíbles. El live coding ayudó muchísimo a entender POO.');

-- =====================================================================
-- 3. Insertar Evaluaciones para el periodo HTML & CSS (id = 3)
-- =====================================================================
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (8, 5, 2, 3, FALSE, 'submitted', '2026-03-29 10:00:00'),
    (9, 5, 2, 3, FALSE, 'submitted', '2026-03-30 11:30:00'),
    (10, 2, 1, 3, TRUE, 'submitted', '2026-03-31 15:45:00');

-- Respuestas Eval 5 (Coder 8 -> Tutor 5)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (5, 12, 3, NULL), (5, 13, 4, NULL), (5, 14, 4, NULL), (5, 15, 3, NULL), 
    (5, 16, 5, NULL), (5, 17, 4, NULL), (5, 18, 5, NULL), (5, 19, 4, NULL), 
    (5, 20, NULL, 'Siento que fuimos un poco lento con Flexbox y Grid. Las clases fueron buenas pero me hubiera gustado ver más proyectos prácticos.');

-- Respuestas Eval 7 (Coder 10 -> TL 2)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (7, 1, 4, NULL), (7, 2, 4, NULL), (7, 3, 3, NULL), (7, 4, 3, NULL), 
    (7, 5, 4, NULL), (7, 6, 4, NULL), (7, 7, 5, NULL), (7, 8, 4, NULL), 
    (7, 9, 3, NULL), (7, 10, 4, NULL), 
    (7, 11, NULL, 'Me ayudó mucho con los layouts, pero a veces no respondía rápido en Slack durante las tardes.');

-- =====================================================================
-- 4. Insertar Evaluaciones para el periodo JAVASCRIPT (id = 4)
-- =====================================================================
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (8, 2, 1, 4, FALSE, 'submitted', '2026-05-28 10:00:00'),
    (11, 5, 2, 4, TRUE, 'submitted', '2026-05-29 11:30:00');

-- Respuestas Eval 8 (Coder 8 -> TL 2)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (8, 1, 5, NULL), (8, 2, 5, NULL), (8, 3, 5, NULL), (8, 4, 5, NULL), 
    (8, 5, 5, NULL), (8, 6, 5, NULL), (8, 7, 5, NULL), (8, 8, 5, NULL), 
    (8, 9, 5, NULL), (8, 10, 5, NULL), 
    (8, 11, NULL, 'El mejor módulo de todos. El TL me apoyó con Promises y Async/Await de una forma que finalmente lo entendí. ¡Crack total!');

-- Respuestas Eval 9 (Coder 11 -> Tutor 5)
INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (9, 12, 5, NULL), (9, 13, 5, NULL), (9, 14, 5, NULL), (9, 15, 5, NULL), 
    (9, 16, 5, NULL), (9, 17, 5, NULL), (9, 18, 5, NULL), (9, 19, 5, NULL), 
    (9, 20, NULL, 'Excelente manejo de JS Vanilla y manipulación del DOM.');

-- =====================================================================
-- 5. CASOS DE BORDE (EDGE CASES) - Periodo Bases de Datos (id = 5)
-- =====================================================================

-- CASO A: Evaluación en Borrador (Draft) - Coder 8 a Tutor 5
-- Solo guardó respuestas parciales y nunca la envió
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (8, 5, 2, 5, FALSE, 'draft', NULL);

INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (10, 12, 4, NULL), (10, 13, 5, NULL);

-- CASO B: Crítica Dura bajo Anonimato Real (evaluator_id = NULL) - Anónimo a TL 2
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (NULL, 2, 1, 5, TRUE, 'submitted', '2026-06-25 10:00:00');

INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (11, 1, 1, NULL), (11, 2, 1, NULL), (11, 3, 2, NULL), (11, 4, 1, NULL), 
    (11, 5, 1, NULL), (11, 6, 2, NULL), (11, 7, 1, NULL), (11, 8, 1, NULL), 
    (11, 9, 2, NULL), (11, 10, 1, NULL), 
    (11, 11, NULL, 'Falta muchísima empatía. Cuando pregunto algo asume que es una pregunta tonta y responde con ironía frente a todo el clan. Me desmotiva mucho a participar.');

-- CASO C & D: Outlier + Comentarios Basura - Coders a Tutor 5
-- Coder 9 le pone todo 5 a Tutor 5 (El promedio sube, evaluación perfecta)
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (9, 5, 2, 5, FALSE, 'submitted', '2026-06-26 10:00:00');

INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (12, 12, 5, NULL), (12, 13, 5, NULL), (12, 14, 5, NULL), (12, 15, 5, NULL), 
    (12, 16, 5, NULL), (12, 17, 5, NULL), (12, 18, 5, NULL), (12, 19, 5, NULL), 
    (12, 20, NULL, 'Excelente profesor, la normalización y SQL quedaron clarísimos.');

-- Coder 10 es el Outlier (todo en 1) y además deja comentario incoherente (para probar coherencia de IA)
INSERT INTO evaluations (evaluator_id, evaluatee_id, form_id, period_id, is_anonymous, status, submitted_at) VALUES
    (10, 5, 2, 5, TRUE, 'submitted', '2026-06-27 10:00:00');

INSERT INTO evaluation_answers (evaluation_id, question_id, score, comment) VALUES
    (13, 12, 1, NULL), (13, 13, 1, NULL), (13, 14, 1, NULL), (13, 15, 1, NULL), 
    (13, 16, 1, NULL), (13, 17, 1, NULL), (13, 18, 1, NULL), (13, 19, 1, NULL), 
    (13, 20, NULL, 'asdfg asdf nada que ver xd.');

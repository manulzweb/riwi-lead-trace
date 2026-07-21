-- 04_views.sql
-- Vistas Estratégicas para Abstracción y Rendimiento (CQRS)

-- 1. vw_users_with_roles
-- Abstrae la relación Many-to-Many de usuarios y roles. Útil para autenticación y listados.
CREATE OR REPLACE VIEW vw_users_with_roles AS
SELECT u.id, u.full_name AS name, u.email, u.password_hash, u.is_active, u.clan_id, 
       GROUP_CONCAT(r.name SEPARATOR ',') as roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;

-- 2. vw_evaluatees_summary
-- Vista que resuelve la complejidad de saber a qué clan(es) pertenece un Tutor o Team Leader.
CREATE OR REPLACE VIEW vw_evaluatees_summary AS
SELECT u.id, u.full_name AS name, u.email, r.name AS role,
       COALESCE(tutor_clan.name, tl_clans.clan_names) AS clan_name,
       COALESCE(tutor_cohort.name, tl_clans.cohort_names) AS cohort_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN clans tutor_clan ON tutor_clan.id = u.clan_id
LEFT JOIN cohorts tutor_cohort ON tutor_cohort.id = tutor_clan.cohort_id
LEFT JOIN (
    SELECT tlc.user_id, 
           GROUP_CONCAT(c.name SEPARATOR ', ') AS clan_names,
           GROUP_CONCAT(DISTINCT ch.name SEPARATOR ', ') AS cohort_names
    FROM team_leader_clans tlc
    JOIN clans c ON c.id = tlc.clan_id
    JOIN cohorts ch ON ch.id = c.cohort_id
    GROUP BY tlc.user_id
) tl_clans ON tl_clans.user_id = u.id
WHERE r.name IN ('team_leader', 'tutor')
GROUP BY u.id, r.name;

-- 3. vw_period_metrics
-- [VISTA CRÍTICA PARA RENDIMIENTO] 
-- Calcula el score promedio (escala 0-100) para cada usuario en cada periodo.
-- Pre-calcula el n+1 problem del backend.
--
-- IMPORTANTE - la vista NO filtra por número mínimo de evaluaciones.
-- Antes tenía `WHERE ec.n_evals >= 3` hardcodeado, pero ese mínimo es ahora un
-- ajuste configurable por el admin (`system_settings.required_evaluations`) y
-- MySQL no admite vistas parametrizadas. La vista expone `n_evals` sin filtrar y
-- QUIEN CONSULTA decide el umbral, pasándolo como parámetro ligado
-- (`:required_evaluations`) desde metrics_repository.py.
-- Si añades un consumidor nuevo, filtra tú por n_evals: leer esta vista en crudo
-- devuelve también a gente con 1 sola evaluación (ICP no significativo).
CREATE OR REPLACE VIEW vw_period_metrics AS
WITH evaluation_counts AS (
    SELECT evaluatee_id, period_id, COUNT(DISTINCT id) as n_evals
    FROM evaluations
    WHERE status = 'submitted'
    GROUP BY evaluatee_id, period_id
),
question_averages AS (
    SELECT 
        e.evaluatee_id, 
        e.period_id,
        a.question_id, 
        q.weight_percent, 
        AVG(a.score) AS avg_score
    FROM evaluation_details a
    JOIN questions q ON a.question_id = q.id
    JOIN evaluations e ON a.evaluation_id = e.id
    WHERE e.status = 'submitted'
      AND q.input_type = 'scale'
      AND a.score IS NOT NULL
    GROUP BY e.evaluatee_id, e.period_id, a.question_id, q.weight_percent
)
SELECT 
    qa.evaluatee_id,
    qa.period_id,
    ec.n_evals,
    CASE 
        WHEN SUM(qa.weight_percent) > 0 
        THEN ROUND( ( (SUM(qa.avg_score * qa.weight_percent) / SUM(qa.weight_percent)) - 1 ) / 4 * 100 )
        ELSE ROUND( ( (AVG(qa.avg_score)) - 1 ) / 4 * 100 )
    END as average_score
FROM question_averages qa
JOIN evaluation_counts ec ON qa.evaluatee_id = ec.evaluatee_id AND qa.period_id = ec.period_id
GROUP BY qa.evaluatee_id, qa.period_id, ec.n_evals;

-- 4. vw_evaluations_summary
-- Vista limpia de evaluaciones (con nombres y enmascaramiento listo)
--
-- El evaluador se obtiene a traves de evaluation_submissions. 
-- El enmascaramiento del anonimato se realiza mediante un CASE WHEN
-- para que ni los admins ni consultas directas vean quién evaluó.
CREATE OR REPLACE VIEW vw_evaluations_summary AS
SELECT
    e.id,
    CASE WHEN e.is_anonymous THEN NULL ELSE s.evaluator_id END AS evaluator_id,
    CASE WHEN e.is_anonymous THEN NULL ELSE u1.full_name END AS evaluator_name,
    e.evaluatee_id,
    u2.full_name AS evaluatee_name,
    e.period_id,
    p.name AS period_name,
    e.form_id,
    e.is_anonymous,
    e.status,
    e.created_at,
    e.submitted_at
FROM evaluations e
LEFT JOIN evaluation_submissions s ON s.evaluation_id = e.id
LEFT JOIN users u1 ON s.evaluator_id = u1.id
JOIN users u2 ON e.evaluatee_id = u2.id
JOIN periods p ON e.period_id = p.id;

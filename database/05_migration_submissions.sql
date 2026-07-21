-- =====================================================================
-- Riwi LeadTrace — MIGRACION: separar participacion de contenido
-- Motor: MySQL 8
--
--   evaluations.evaluator_id  ->  tabla nueva evaluation_submissions
--
-- =====================================================================
-- !! LEE ESTO ANTES DE EJECUTAR !!
-- =====================================================================
--
-- 1. HAZ BACKUP. Este script BORRA una columna con datos
--    (evaluations.evaluator_id). Una vez ejecutado el paso 5 no hay vuelta
--    atras sin el backup:
--
--        mysqldump -h <host> -P <port> -u <user> -p riwi_lead_trace \
--            > backup_pre_submissions.sql
--
-- 2. EL ORDEN IMPORTA. El script primero CREA la tabla, luego DIAGNOSTICA,
--    luego RELLENA y solo al final DESTRUYE. No reordenes los pasos ni
--    ejecutes trozos sueltos: si borras la columna antes de rellenar, los
--    evaluadores de TODAS las evaluaciones se pierden, no solo los anonimos.
--
-- 3. ES IDEMPOTENTE. Se puede volver a ejecutar entero sin romper nada:
--    cada paso comprueba si ya se aplico antes de tocar el esquema.
--
-- 4. DESPUES de correr este script, vuelve a ejecutar database/04_views.sql:
--    vw_evaluations_summary ya no puede leer evaluations.evaluator_id y
--    quedaria rota (una vista invalida en MySQL no falla al borrar la
--    columna, falla al consultarla).
--
-- 5. NO ejecutes este script sobre una base creada desde cero con
--    database/01_ddl.sql: ese archivo ya trae el esquema nuevo. Este script
--    es SOLO para bases que ya tienen datos (Railway).
-- =====================================================================

USE riwi_lead_trace;

-- =====================================================================
-- PASO 0 — Detectar si la migracion ya se aplico
--   Toda la logica destructiva cuelga de @has_col. Si la columna ya no
--   existe, los pasos se convierten en un SELECT informativo.
-- =====================================================================
SET @has_col = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'evaluations'
      AND COLUMN_NAME  = 'evaluator_id'
);

SELECT IF(@has_col = 1,
          'Columna evaluator_id presente: se va a migrar.',
          'Columna evaluator_id ausente: la migracion ya se aplico, los pasos se saltaran.'
       ) AS estado_inicial;

-- =====================================================================
-- PASO 1 — Crear evaluation_submissions
--   Definicion identica a la de database/01_ddl.sql. Si cambias una,
--   cambia la otra o divergen en silencio.
--
--   ON DELETE del FK a evaluations: SET NULL (no CASCADE, no RESTRICT).
--   CASCADE borraria la participacion junto con la evaluacion y reabriria
--   el agujero del duplicado; RESTRICT impediria borrar evaluaciones para
--   siempre; SET NULL conserva el registro de participacion y lo degrada a
--   la misma forma que una anonima ("participo, contenido no disponible").
-- =====================================================================
CREATE TABLE IF NOT EXISTS evaluation_submissions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id  INT NOT NULL,
    evaluatee_id  INT NOT NULL,
    period_id     INT NOT NULL,
    -- NULL cuando la evaluacion asociada es anonima (is_anonymous = TRUE)
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
    -- Una evaluacion no anonima pertenece a UN solo evaluador. Sin esto, dos
    -- participaciones podrian apuntar a la misma evaluacion y vw_evaluations_summary
    -- duplicaria filas. MySQL admite multiples NULL en un indice unico, asi que
    -- las anonimas (evaluation_id NULL) conviven sin restriccion.
    CONSTRAINT uq_submission_evaluation UNIQUE (evaluation_id)
);

-- =====================================================================
-- PASO 2 — DIAGNOSTICO: buscar duplicados que el bug ya dejo colar
--
--   El bug permitia que un mismo evaluador tuviera VARIAS evaluaciones
--   sobre el mismo evaluado en el mismo periodo. Si eso paso, el INSERT
--   del paso 3 chocaria contra uq_submission_once.
--
--   Esta consulta los lista. Si devuelve filas, el paso 2-bis ABORTA el
--   script a proposito, para que decidas TU que hacer con cada caso:
--
--     Opcion A (recomendada): quedarse con la evaluacion mas reciente
--       ('submitted' antes que 'draft') y borrar las otras. Al borrar la
--       evaluacion se borran sus evaluation_details en cascada
--       (fk_answer_eval ON DELETE CASCADE), asi que se pierde ese feedback
--       -- exportalo antes si te importa.
--
--     Opcion B: dejar las duplicadas y quedarse solo con una participacion.
--       Es lo que hace INSERT IGNORE por si solo, pero de forma
--       IMPREDECIBLE (gana la primera fila que el motor procese). Por eso
--       el script aborta en vez de confiar en el IGNORE.
--
--   Con los datos actuales conocidos (database/03_mock_history.sql) NO hay
--   duplicados; esto es una red de seguridad para la BD de Railway, que ha
--   recibido trafico real y no se ha podido inspeccionar desde aqui.
-- =====================================================================
SET @sql = IF(@has_col = 1,
    'SELECT evaluator_id, evaluatee_id, period_id, COUNT(*) AS n_evaluaciones,
            GROUP_CONCAT(id ORDER BY id) AS ids_evaluacion
     FROM evaluations
     WHERE evaluator_id IS NOT NULL
     GROUP BY evaluator_id, evaluatee_id, period_id
     HAVING COUNT(*) > 1',
    'SELECT ''migracion ya aplicada: sin diagnostico'' AS diagnostico');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- PASO 2-bis — Freno de mano
--   MySQL no permite SIGNAL fuera de un stored program, asi que la unica
--   forma de abortar un script plano es provocar un error a proposito.
--   Se referencia una tabla inexistente cuyo NOMBRE es el mensaje de error.
--   Si ves "Table '...ABORTADO...' doesn't exist", es intencional: hay
--   duplicados, resuelvelos y vuelve a empezar desde el paso 2.
-- ---------------------------------------------------------------------
SET @sql = IF(@has_col = 1,
    'SELECT COUNT(*) INTO @dups FROM (
        SELECT 1 FROM evaluations
        WHERE evaluator_id IS NOT NULL
        GROUP BY evaluator_id, evaluatee_id, period_id
        HAVING COUNT(*) > 1
     ) t',
    'SELECT 0 INTO @dups');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@dups > 0,
    'SELECT 1 FROM `ABORTADO_hay_duplicados_evaluador_evaluado_periodo_ver_paso_2`',
    'SELECT ''OK: sin duplicados, se puede continuar'' AS diagnostico');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
-- PASO 3 — Rellenar evaluation_submissions con lo que SI se puede recuperar
--
--   Se migran las evaluaciones con evaluator_id NOT NULL (las NO anonimas):
--   su participacion queda enlazada a la evaluacion (evaluation_id = e.id),
--   igual que en el modelo nuevo.
--
--   INSERT IGNORE aqui es solo por IDEMPOTENCIA (re-ejecutar el script no
--   duplica filas). NO es el mecanismo para tolerar duplicados: de eso se
--   encarga el freno del paso 2-bis, que ya aborto si los habia.
--
-- ---------------------------------------------------------------------
-- =====================================================================
-- ||                                                                 ||
-- ||   PROBLEMA SIN SOLUCION — LEELO, NO ES UN DESCUIDO              ||
-- ||                                                                 ||
-- =====================================================================
--
--   Las evaluaciones ANONIMAS que ya existen en la BD tienen
--   evaluator_id = NULL. Ese dato NUNCA se guardo: no esta "escondido",
--   no esta en otra tabla, no esta en un log. Se perdio para siempre, que
--   es exactamente lo que la regla 1 (anonimato real) buscaba.
--
--   CONSECUENCIA CONCRETA, y hay que decirla en voz alta:
--
--     Para cada evaluacion anonima historica NO se puede crear su fila en
--     evaluation_submissions. Como esa fila es la que bloquea el duplicado,
--     ese coder PODRA VOLVER A EVALUAR UNA VEZ MAS a esa misma persona en
--     ese mismo periodo. Una vez, no ilimitadas: en cuanto lo haga, el
--     modelo nuevo le crea su submission y a partir de ahi
--     uq_submission_once lo bloquea como a todos los demas.
--
--   Cuantas evaluaciones estan en esa situacion lo dice la consulta de mas
--   abajo. Con los datos mock conocidos serian 5.
--
--   ESTO NO ES UN BUG DEL DISENO NUEVO: es el coste, de una sola vez, de
--   arreglar el diseno viejo. El diseno nuevo si registra la participacion
--   del evaluador anonimo (con evaluation_id = NULL) sin revelar que
--   respondio. Solo los datos creados ANTES de esta migracion quedan asi.
--
--   Alternativas descartadas:
--     - Inventar un evaluador para las anonimas: falsearia datos y podria
--       acusar a un coder de una evaluacion que no escribio. Inaceptable.
--     - Bloquear a TODOS los coders del periodo por si acaso: castigaria a
--       quien no evaluo y falsearia el % de participacion.
--     - No migrar y dejar el bug: el bug actual es peor (evaluaciones
--       anonimas ILIMITADAS, para siempre, no una sola vez).
--   Se acepta el hueco de una sola vez.
-- =====================================================================

-- Cuantas evaluaciones anonimas pierden su evaluador de forma irrecuperable
SET @sql = IF(@has_col = 1,
    'SELECT COUNT(*) AS anonimas_sin_evaluador_recuperable,
            ''cada una habilita UNA re-evaluacion; ver comentario del paso 3'' AS nota
     FROM evaluations
     WHERE evaluator_id IS NULL',
    'SELECT ''migracion ya aplicada'' AS nota');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(@has_col = 1,
    'INSERT IGNORE INTO evaluation_submissions
         (evaluator_id, evaluatee_id, period_id, evaluation_id)
     SELECT e.evaluator_id, e.evaluatee_id, e.period_id, e.id
     FROM evaluations e
     WHERE e.evaluator_id IS NOT NULL',
    'SELECT ''paso 3 ya aplicado'' AS estado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verificacion: las filas migradas deben coincidir con las no anonimas
SET @sql = IF(@has_col = 1,
    'SELECT (SELECT COUNT(*) FROM evaluations WHERE evaluator_id IS NOT NULL) AS esperadas,
            (SELECT COUNT(*) FROM evaluation_submissions WHERE evaluation_id IS NOT NULL) AS migradas',
    'SELECT ''paso 3 ya aplicado'' AS estado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
-- PASO 4 — SOLO A PARTIR DE AQUI SE DESTRUYE
--   Si los dos numeros del paso 3 no coinciden, PARA y revisa antes de
--   seguir. A partir del paso 4.3 la columna ya no existe.
--
--   Orden obligatorio (MySQL lo exige):
--     4.1 la FK primero  — no se puede borrar un indice que una FK usa
--     4.2 el indice unico — contiene evaluator_id
--     4.3 la columna
-- =====================================================================

-- 4.1 — Borrar la FK fk_eval_evaluator
SET @sql = (
    SELECT IF(COUNT(*) > 0,
              'ALTER TABLE evaluations DROP FOREIGN KEY fk_eval_evaluator',
              'SELECT ''fk_eval_evaluator ya no existe'' AS estado')
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA     = DATABASE()
      AND TABLE_NAME       = 'evaluations'
      AND CONSTRAINT_NAME  = 'fk_eval_evaluator'
      AND CONSTRAINT_TYPE  = 'FOREIGN KEY'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.2 — Borrar el indice uq_eval_once
--   Ya no tiene sentido: sin evaluations.evaluator_id no hay nada que
--   indexar, y de todos modos nunca funciono para las anonimas (MySQL
--   admite multiples NULL en un indice UNIQUE). Su trabajo lo hace ahora
--   uq_submission_once, que si es un anti-duplicado real.
SET @sql = (
    SELECT IF(COUNT(*) > 0,
              'ALTER TABLE evaluations DROP INDEX uq_eval_once',
              'SELECT ''uq_eval_once ya no existe'' AS estado')
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'evaluations'
      AND INDEX_NAME   = 'uq_eval_once'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4.3 — Borrar la columna evaluations.evaluator_id
SET @sql = IF(@has_col = 1,
    'ALTER TABLE evaluations DROP COLUMN evaluator_id',
    'SELECT ''evaluations.evaluator_id ya no existe'' AS estado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================================
-- PASO 5 — Cierre
-- =====================================================================
SELECT 'Migracion terminada. AHORA ejecuta database/04_views.sql para
        recrear vw_evaluations_summary contra el esquema nuevo.' AS siguiente_paso;

SELECT (SELECT COUNT(*) FROM evaluations)             AS evaluaciones,
       (SELECT COUNT(*) FROM evaluation_submissions)  AS participaciones,
       (SELECT COUNT(*) FROM evaluation_submissions
        WHERE evaluation_id IS NULL)                  AS participaciones_anonimas;

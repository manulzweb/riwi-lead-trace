import re
import random
import datetime

# 1. Limpiar 02_dml.sql
with open("database/02_dml.sql", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "Manuel Andrés Vásquez Mendoza" in line:
        continue # saltar ID 43
    if "(43, 1)" in line:
        continue # saltar el rol para 43
    
    # buscar correos en la forma @riwi.io con un número antes
    match = re.search(r"\((\d+),\s*'([^']*)',\s*'([^']*)',\s*'(.*?)',\s*(.*)\)", line)
    if match and "INSERT" not in line:
        user_id = match.group(1)
        full_name = match.group(2)
        email = match.group(3)
        pwd = match.group(4)
        clan = match.group(5)
        
        # Limpiar email si tiene números y normalizar
        if any(char.isdigit() for char in email) and user_id not in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']:
            # Solo primera letra del nombre y el apellido
            parts = full_name.split()
            first_name = parts[0].lower()
            
            # Quitar tildes
            first_name = first_name.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
            
            last_name = ""
            if len(parts) > 1:
                # Si el nombre es "Juan José Álvarez", parts[2] es Álvarez si asumimos Juan José.
                # Mejor asumimos que el penúltimo o último es apellido, pero es complicado.
                # Hagamos primera letra de part[0] + part[1] (o part[2] si part[1] es un nombre medio)
                
                if len(parts) >= 3 and parts[1].lower() in ['jose', 'david', 'felipe', 'luis', 'diego', 'daniel']:
                    last_name = parts[2].lower()
                elif len(parts) >= 2:
                    last_name = parts[1].lower()
                    
                last_name = last_name.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u').replace('ñ', 'n')
                
            new_email = f"{first_name[0]}{last_name}@riwi.io"
            
            # Reemplazar la línea
            line = f"    ({user_id}, '{full_name}', '{new_email}', '{pwd}', {clan}),\n"
            # arreglar comas finales si era el final
            if clan.endswith(";"):
                line = line.replace("),\n", ");\n")
            elif clan.endswith("),"):
                pass
                
    new_lines.append(line)

# Arreglar la coma del usuario 42 (ya que borramos el 43 y 44/45 quedan)
# Espera, 44 y 45 están, así que 42 sigue con coma.
# Borramos el 43 de los user_roles.
with open("database/02_dml.sql", "w", encoding="utf-8") as f:
    f.writelines(new_lines)


# 2. Generar 03_mock_history.sql con las evaluaciones simuladas.
# 30 evaluaciones por TL y por Tutor. 4 Periodos.
# TL: ID 2, 3, 4
# Tutor: ID 5, 6, 7
# Manuel es ID 5 (Tutor).

tls = [2, 3, 4]
tutores = [5, 6, 7]
periodos = [1, 2, 3, 4]
# Formularios: 1 = TL, 2 = Tutor
# TL preguntas (10). Tutor preguntas (8). + 1 de texto cada uno.
# Preguntas TL IDs (asumiendo IDs 1 al 10 escala, 11 texto)
# Preguntas Tutor IDs (asumiendo IDs 12 al 19 escala, 20 texto)
# Wait, SQL auto_increments. Si son 10 + 1 = 11, entonces tutor es 12 a 20.
# Evaluadores: Coder IDs 12 al 42 y 44, 45 (vamos a usar 12 al 30 para variar).

sql = "-- Evaluaciones generadas\n"

# Obtener IDs de preguntas (mockearemos asumiendo 1 a 11 y 12 a 20)
# Pero podemos no poner el ID de evaluation y autogenerar, e ir haciendo inserts.
# Para evitar problemas con IDs autogenerados de SQLite, usaremos un counter de eval_id.
eval_id = 1
submission_id = 1

sql += "DELETE FROM evaluation_submissions;\nDELETE FROM evaluations;\n"

for target_id in tls + tutores:
    is_tl = target_id in tls
    form_id = 1 if is_tl else 2
    
    # 30 evaluaciones por persona
    for _ in range(30):
        period_id = random.choice(periodos)
        evaluator_id = random.randint(12, 40)
        
        # Calcular target promedio deseado
        if is_tl:
            # 70 a 90
            target_avg = random.uniform(70, 90)
        else:
            if target_id == 5:
                # Manuel Vasquez
                target_avg = random.uniform(78, 82)
            else:
                # 60 a 85
                target_avg = random.uniform(60, 85)
                
        # Insert evaluation
        sql += f"INSERT INTO evaluations (id, period_id, form_id, evaluator_id, evaluatee_id, status, created_at, updated_at) VALUES ({eval_id}, {period_id}, {form_id}, {evaluator_id}, {target_id}, 'submitted', '2026-06-15 10:00:00', '2026-06-15 10:10:00');\n"
        
        # Generar respuestas
        if is_tl:
            q_ids = list(range(1, 11))
            text_q = 11
        else:
            q_ids = list(range(12, 20))
            text_q = 20
            
        sum_score = 0
        for qid in q_ids:
            # score de 1 a 5, target_avg de 1 a 100 equivale a 1 a 5 (escala de 20)
            # 80 = 4.0
            base_score = target_avg / 20.0
            # dispersión pequeña
            ans_score = int(round(random.gauss(base_score, 0.5)))
            ans_score = max(1, min(5, ans_score))
            
            sql += f"INSERT INTO evaluation_submissions (id, evaluation_id, question_id, numeric_value, text_value) VALUES ({submission_id}, {eval_id}, {qid}, {ans_score}, NULL);\n"
            submission_id += 1
            
        # Pregunta de texto
        comentarios = [
            "Hace un buen trabajo, pero a veces explica muy rapido.",
            "Me gustaria que hiciera mas ejemplos practicos.",
            "Excelente, me ayuda mucho con mis dudas.",
            "Todo bien, explica claro.",
            "Falta un poco de orden en las clases.",
            "Siempre esta disponible, muy buen profe.",
            "Muy buen lider, siempre apoya al equipo.",
            "Deberia dar mas feedback en los PRs.",
            "Es paciente y se nota que sabe del tema."
        ]
        text_ans = random.choice(comentarios)
        sql += f"INSERT INTO evaluation_submissions (id, evaluation_id, question_id, numeric_value, text_value) VALUES ({submission_id}, {eval_id}, {text_q}, NULL, '{text_ans}');\n"
        submission_id += 1
        
        eval_id += 1

with open("database/03_mock_history.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Datos generados exitosamente.")

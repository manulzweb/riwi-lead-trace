import os
import re
import shutil

BASE_DIR = r"C:\Users\manue\Documents\Tutor\riwi-lead-trace"

# 1. Eliminar master_data_routes.py y crear cohort_routes.py y clan_routes.py
master_py = os.path.join(BASE_DIR, "backend", "app", "routes", "master_data_routes.py")
if os.path.exists(master_py):
    os.remove(master_py)

cohort_py_content = """from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/cohorts")

@router.get("/")
def get_cohorts(db = Depends(get_db)):
    query = text("SELECT id, number, name, city FROM cohorts ORDER BY number ASC")
    res = db.execute(query).fetchall()
    return [{"id": r[0], "number": r[1], "name": r[2], "city": r[3]} for r in res]
"""
with open(os.path.join(BASE_DIR, "backend", "app", "routes", "cohort_routes.py"), "w", encoding="utf-8") as f:
    f.write(cohort_py_content)

clan_py_content = """from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/clans")

@router.get("/")
def get_clans(db = Depends(get_db)):
    query = text(\"\"\"
        SELECT cl.id, cl.cohort_id, cl.number, cl.name as clan_name, co.name as cohort_name
        FROM clans cl
        JOIN cohorts co ON cl.cohort_id = co.id
        ORDER BY co.number ASC, cl.number ASC
    \"\"\")
    res = db.execute(query).fetchall()
    return [
        {
            "id": r[0],
            "cohort_id": r[1],
            "number": r[2],
            "name": r[3],
            "cohort_name": r[4]
        }
        for r in res
    ]
"""
with open(os.path.join(BASE_DIR, "backend", "app", "routes", "clan_routes.py"), "w", encoding="utf-8") as f:
    f.write(clan_py_content)

# 2. Actualizar main.py
main_py = os.path.join(BASE_DIR, "backend", "app", "main.py")
with open(main_py, "r", encoding="utf-8") as f:
    main_content = f.read()

main_content = main_content.replace("master_data_routes", "cohort_routes, clan_routes")
main_content = main_content.replace('app.include_router(master_data_routes.router, tags=["master-data"])', 'app.include_router(cohort_routes.router, tags=["cohorts"])\napp.include_router(clan_routes.router, tags=["clans"])')
with open(main_py, "w", encoding="utf-8") as f:
    f.write(main_content)

# 3. Eliminar master.service.js y crear cohorts.service.js y clans.service.js
master_js = os.path.join(BASE_DIR, "frontend", "src", "services", "master.service.js")
if os.path.exists(master_js):
    os.remove(master_js)

cohorts_js_content = """import { API_URL } from "../config";

export const cohortsService = {
  async get() {
    const res = await fetch(`${API_URL}/cohorts`);
    if (!res.ok) throw new Error("Error fetching cohorts");
    return res.json();
  }
};
"""
with open(os.path.join(BASE_DIR, "frontend", "src", "services", "cohorts.service.js"), "w", encoding="utf-8") as f:
    f.write(cohorts_js_content)

clans_js_content = """import { API_URL } from "../config";

export const clansService = {
  async get() {
    const res = await fetch(`${API_URL}/clans`);
    if (!res.ok) throw new Error("Error fetching clans");
    return res.json();
  }
};
"""
with open(os.path.join(BASE_DIR, "frontend", "src", "services", "clans.service.js"), "w", encoding="utf-8") as f:
    f.write(clans_js_content)


# 4. Actualizar metrics.view.js
metrics_js = os.path.join(BASE_DIR, "frontend", "src", "views", "admin", "metrics.view.js")
with open(metrics_js, "r", encoding="utf-8") as f:
    metrics_content = f.read()

metrics_content = metrics_content.replace('import { masterService } from "../../services/master.service";', 'import { cohortsService } from "../../services/cohorts.service";\nimport { clansService } from "../../services/clans.service";')
metrics_content = metrics_content.replace('masterService.getCohorts()', 'cohortsService.get()')
metrics_content = metrics_content.replace('masterService.getClans()', 'clansService.get()')
with open(metrics_js, "w", encoding="utf-8") as f:
    f.write(metrics_content)

# 5. Actualizar dashboard.view.js
dash_js = os.path.join(BASE_DIR, "frontend", "src", "views", "dashboard.view.js")
with open(dash_js, "r", encoding="utf-8") as f:
    dash_content = f.read()

dash_content = dash_content.replace('import { masterService } from "../services/master.service";', 'import { cohortsService } from "../services/cohorts.service";\nimport { clansService } from "../services/clans.service";')
dash_content = dash_content.replace('masterService.getCohorts()', 'cohortsService.get()')
dash_content = dash_content.replace('masterService.getClans()', 'clansService.get()')
with open(dash_js, "w", encoding="utf-8") as f:
    f.write(dash_content)

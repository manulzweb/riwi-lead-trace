from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.config.database import get_db

router = APIRouter(prefix="/cohorts")

@router.get(
    "",
    summary="Listar cohortes",
    description="Consulta y devuelve el catálogo de cohortes registradas en el sistema ordenadas ascendentemente por número.",
    response_description="Lista de objetos con identificador, número, nombre y ciudad de cada cohorte"
)
def get_cohorts(db = Depends(get_db)):
    query = text("SELECT id, number, name, city FROM cohorts ORDER BY number ASC")
    res = db.execute(query).fetchall()
    return [{"id": r[0], "number": r[1], "name": r[2], "city": r[3]} for r in res]

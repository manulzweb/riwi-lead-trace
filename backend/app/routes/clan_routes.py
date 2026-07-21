from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.config.database import get_db

router = APIRouter(prefix="/clans")

@router.get("/")
def get_clans(db = Depends(get_db)):
    query = text("""
        SELECT cl.id, cl.cohort_id, cl.number, cl.name as clan_name, co.name as cohort_name
        FROM clans cl
        JOIN cohorts co ON cl.cohort_id = co.id
        ORDER BY co.number ASC, cl.number ASC
    """)
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

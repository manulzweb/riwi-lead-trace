# Importar todos los modelos para que Base.metadata los registre
# y herramientas como Alembic o create_all() los detecten.
from app.models.role import Role
from app.models.cohort import Cohort
from app.models.clan import Clan
from app.models.user import User
from app.models.period import Period
from app.models.form_template import FormTemplate, Question
from app.models.evaluation import Evaluation, EvaluationAnswer
from app.models.ai_feedback_cache import AiFeedbackCache

__all__ = [
    "Role",
    "Cohort",
    "Clan",
    "User",
    "Period",
    "FormTemplate",
    "Question",
    "Evaluation",
    "EvaluationAnswer",
    "AiFeedbackCache",
]

from app.exceptions.base import ApplicationException


class EvaluationException(ApplicationException):
    """Base exception for evaluation module"""
    pass

class PeriodNotActiveException(EvaluationException):
    http_status = 409

class PeriodNotFoundException(EvaluationException):
    http_status = 404

class EvaluationAlreadyExistsException(EvaluationException):
    http_status = 409

class EvaluateeNotFoundException(EvaluationException):
    http_status = 404

class InvalidRoleException(EvaluationException):
    # 403, NO 422. La clase homonima de `form_exceptions` usa 422: son clases
    # distintas con el mismo nombre y no deben unificarse (ver base.py).
    http_status = 403

class InvalidClanException(EvaluationException):
    http_status = 403

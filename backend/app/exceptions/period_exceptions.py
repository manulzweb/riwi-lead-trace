from app.exceptions.base import ApplicationException


class PeriodException(ApplicationException):
    """Base exception for period module"""
    pass

class PeriodNotFoundException(PeriodException):
    http_status = 404

class PeriodHasEvaluationsException(PeriodException):
    http_status = 409

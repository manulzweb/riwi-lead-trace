class PeriodException(Exception):
    """Base exception for period module"""
    pass

class PeriodNotFoundException(PeriodException):
    pass

class PeriodHasEvaluationsException(PeriodException):
    pass

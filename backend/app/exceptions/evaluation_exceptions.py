class EvaluationException(Exception):
    """Base exception for evaluation module"""
    pass

class PeriodNotActiveException(EvaluationException):
    pass

class PeriodNotFoundException(EvaluationException):
    pass

class EvaluationAlreadyExistsException(EvaluationException):
    pass

class EvaluateeNotFoundException(EvaluationException):
    pass

class InvalidRoleException(EvaluationException):
    pass

class InvalidClanException(EvaluationException):
    pass

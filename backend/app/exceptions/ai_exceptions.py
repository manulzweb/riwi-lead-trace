from app.exceptions.base import ApplicationException


class AIException(ApplicationException):
    """Base exception for AI module"""
    pass

class InsufficientDataException(AIException):
    http_status = 400

class AIServiceUnavailableException(AIException):
    http_status = 503

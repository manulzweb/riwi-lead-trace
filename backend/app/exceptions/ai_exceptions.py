class AIException(Exception):
    """Base exception for AI module"""
    pass

class InsufficientDataException(AIException):
    pass

class AIServiceUnavailableException(AIException):
    pass

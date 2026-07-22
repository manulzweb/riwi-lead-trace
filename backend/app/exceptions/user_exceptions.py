from app.exceptions.base import ApplicationException


class UserException(ApplicationException):
    """Base exception for user module"""
    pass

class UserNotFoundException(UserException):
    http_status = 404

class EmailAlreadyExistsException(UserException):
    http_status = 409

class UserInUseException(UserException):
    """El usuario tiene evaluaciones o participaciones y las FK son RESTRICT."""
    http_status = 409

class UserException(Exception):
    """Base exception for user module"""
    pass

class UserNotFoundException(UserException):
    pass

class EmailAlreadyExistsException(UserException):
    pass

class UserInUseException(UserException):
    """El usuario tiene evaluaciones o participaciones y las FK son RESTRICT."""

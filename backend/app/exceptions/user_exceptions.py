class UserException(Exception):
    """Base exception for user module"""
    pass

class UserNotFoundException(UserException):
    pass

class EmailAlreadyExistsException(UserException):
    pass

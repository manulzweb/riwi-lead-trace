class AuthException(Exception):
    """Base exception for auth module"""
    pass

class UserNotFoundAuthException(AuthException):
    pass

class InvalidCredentialsException(AuthException):
    pass

class InactiveUserException(AuthException):
    pass

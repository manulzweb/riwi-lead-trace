from app.exceptions.base import ApplicationException


class AuthException(ApplicationException):
    """Base exception for auth module"""
    pass

class UserNotFoundAuthException(AuthException):
    http_status = 404

class InvalidCredentialsException(AuthException):
    http_status = 401

class InactiveUserException(AuthException):
    http_status = 401

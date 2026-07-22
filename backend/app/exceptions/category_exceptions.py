from app.exceptions.base import ApplicationException


class CategoryException(ApplicationException):
    """Base exception for category module"""
    pass

class CategoryAlreadyExistsException(CategoryException):
    http_status = 409

class CategoryNotFoundException(CategoryException):
    http_status = 404

class CategoryInUseException(CategoryException):
    http_status = 409

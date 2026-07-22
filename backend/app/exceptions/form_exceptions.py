from app.exceptions.base import ApplicationException


class FormException(ApplicationException):
    """Base exception for form module"""
    pass

class InvalidRoleException(FormException):
    # 422, NO 403. La clase homonima de `evaluation_exceptions` usa 403.
    http_status = 422

class InvalidWeightException(FormException):
    http_status = 422

class CategoryNotFoundException(FormException):
    http_status = 404

class FormNotFoundException(FormException):
    http_status = 404

class ActivePeriodExistsException(FormException):
    http_status = 409

class FormException(Exception):
    """Base exception for form module"""
    pass

class InvalidRoleException(FormException):
    pass

class InvalidWeightException(FormException):
    pass

class CategoryNotFoundException(FormException):
    pass

class FormNotFoundException(FormException):
    pass

class ActivePeriodExistsException(FormException):
    pass

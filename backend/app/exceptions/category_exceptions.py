class CategoryException(Exception):
    """Base exception for category module"""
    pass

class CategoryAlreadyExistsException(CategoryException):
    pass

class CategoryNotFoundException(CategoryException):
    pass

class CategoryInUseException(CategoryException):
    pass

class QuestionException(Exception):
    """Base exception for question module"""
    pass

class ActivePeriodExistsException(QuestionException):
    pass

class QuestionNotFoundException(QuestionException):
    pass

class QuestionAlreadyReplacedException(QuestionException):
    pass

class InvalidQuestionTypeException(QuestionException):
    pass

class SemanticsNotCoherentException(QuestionException):
    pass

class FormNotFoundException(QuestionException):
    pass

class CategoryNotFoundException(QuestionException):
    pass

class InvalidWeightsException(QuestionException):
    pass

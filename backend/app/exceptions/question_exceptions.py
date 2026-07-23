from app.exceptions.base import ApplicationException


class QuestionException(ApplicationException):
    """Base exception for question module"""
    pass

class ActivePeriodExistsException(QuestionException):
    http_status = 409

class QuestionNotFoundException(QuestionException):
    http_status = 404

class QuestionAlreadyReplacedException(QuestionException):
    http_status = 409

class InvalidQuestionTypeException(QuestionException):
    http_status = 400

class SemanticsNotCoherentException(QuestionException):
    http_status = 409

class FormNotFoundException(QuestionException):
    http_status = 404

class CategoryNotFoundException(QuestionException):
    http_status = 404

class InvalidWeightsException(QuestionException):
    http_status = 422

from fastapi import status


class NormalizationError(Exception):
    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class NormalizationValidationError(NormalizationError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class NormalizationNotFoundError(NormalizationError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)

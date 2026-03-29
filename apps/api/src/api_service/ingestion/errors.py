from fastapi import status


class IngestionError(Exception):
    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class IngestionValidationError(IngestionError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class IngestionNotFoundError(IngestionError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class IngestionExternalError(IngestionError):
    def __init__(self, detail: str, status_code: int = status.HTTP_502_BAD_GATEWAY) -> None:
        super().__init__(detail=detail, status_code=status_code)

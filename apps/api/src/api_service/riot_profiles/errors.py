from fastapi import status


class RiotProfileError(Exception):
    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class RiotProfileValidationError(RiotProfileError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


class RiotProfileNotFoundError(RiotProfileError):
    def __init__(self, detail: str = "Riot profile was not found.") -> None:
        super().__init__(detail=detail, status_code=status.HTTP_404_NOT_FOUND)


class RiotProfileConflictError(RiotProfileError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_409_CONFLICT)


class RiotConfigurationError(RiotProfileError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


class RiotApiUnavailableError(RiotProfileError):
    def __init__(self, detail: str, status_code: int = status.HTTP_502_BAD_GATEWAY) -> None:
        super().__init__(detail=detail, status_code=status_code)

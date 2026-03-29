class AnalyticsError(Exception):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class AnalyticsNotFoundError(AnalyticsError):
    status_code = 404


class AnalyticsValidationError(AnalyticsError):
    status_code = 400

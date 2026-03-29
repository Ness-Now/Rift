class ReportError(Exception):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class ReportNotFoundError(ReportError):
    status_code = 404


class ReportValidationError(ReportError):
    status_code = 400

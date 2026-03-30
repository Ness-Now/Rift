class ContextualChatError(Exception):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class ContextualChatNotFoundError(ContextualChatError):
    status_code = 404


class ContextualChatValidationError(ContextualChatError):
    status_code = 400

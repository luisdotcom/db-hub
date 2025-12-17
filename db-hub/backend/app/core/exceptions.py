"""
Custom exceptions for the application.
Provides clear error handling following clean code principles.
"""


class DatabaseConnectionError(Exception):
    """Raised when database connection fails."""
    pass


class QueryExecutionError(Exception):
    """Raised when query execution fails."""
    pass


class InvalidDatabaseTypeError(Exception):
    """Raised when an invalid database type is specified."""
    pass

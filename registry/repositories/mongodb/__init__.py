"""MongoDB CE 8.2+ native vector search repository package.

This package provides search repository implementations that leverage
MongoDB Community Edition 8.2's native $vectorSearch aggregation stage.
"""

from .search_repository import MongoDBSearchRepository

__all__ = ["MongoDBSearchRepository"]

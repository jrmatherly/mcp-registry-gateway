"""Embeddings module for vendor-agnostic embeddings generation."""

from .client import (
    EmbeddingsClient,
    LiteLLMClient,
    SentenceTransformersClient,
    create_embeddings_client,
)

__all__ = [
    "EmbeddingsClient",
    "LiteLLMClient",
    "SentenceTransformersClient",
    "create_embeddings_client",
]

"""MongoDB CE 8.2+ native vector search repository.

This repository implementation uses MongoDB Community Edition 8.2's native
$vectorSearch aggregation stage for efficient vector similarity search.

Key differences from DocumentDB/Atlas:
- Uses $vectorSearch (not $search.vectorSearch)
- Creates indexes via SearchIndexModel (not create_index with vectorOptions)
- Requires mongot process for vector indexing
"""

import logging
import re
from typing import Any

from pymongo.asynchronous.collection import AsyncCollection
from pymongo.operations import SearchIndexModel

from ...core.config import embedding_config, settings
from ...schemas.agent_models import AgentCard
from ..documentdb.client import get_collection_name, get_documentdb_client
from ..interfaces import SearchRepositoryBase

logger = logging.getLogger(__name__)


# Stopwords to filter out when tokenizing queries for keyword matching
_STOPWORDS: set[str] = {
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "for",
    "with",
    "about",
    "as",
    "into",
    "through",
    "from",
    "what",
    "when",
    "where",
    "who",
    "which",
    "how",
    "why",
    "get",
    "set",
    "put",
}


def _tokenize_query(query: str) -> list[str]:
    """Tokenize a query string into meaningful keywords.

    Splits on non-word characters, filters stopwords and short tokens.

    Args:
        query: The search query string

    Returns:
        List of lowercase tokens suitable for keyword matching
    """
    tokens = [
        token.lower()
        for token in re.split(r"\W+", query)
        if token and len(token) > 2 and token.lower() not in _STOPWORDS
    ]
    return tokens


def _tokens_match_text(
    tokens: list[str],
    text: str,
) -> bool:
    """Check if any token matches within the given text.

    Args:
        tokens: List of query tokens
        text: Text to search within

    Returns:
        True if any token is found in the text
    """
    if not tokens or not text:
        return False
    text_lower = text.lower()
    return any(token in text_lower for token in tokens)


class MongoDBSearchRepository(SearchRepositoryBase):
    """MongoDB CE 8.2+ implementation with native $vectorSearch.

    This repository uses MongoDB's native vector search capabilities
    introduced in Community Edition 8.2, which provides:
    - Native $vectorSearch aggregation stage
    - HNSW index support via mongot process
    - Full parity with Atlas Search vector capabilities
    """

    def __init__(self):
        self._collection: AsyncCollection | None = None
        self._collection_name = get_collection_name(
            f"mcp_embeddings_{settings.embeddings_model_dimensions}"
        )
        self._embedding_model = None
        self._vector_index_name = settings.mongodb_vector_index_name

    async def _get_collection(self) -> AsyncCollection:
        """Get MongoDB collection."""
        if self._collection is None:
            db = await get_documentdb_client()
            self._collection = db[self._collection_name]
        return self._collection

    async def _get_embedding_model(self):
        """Lazy load embedding model."""
        if self._embedding_model is None:
            from ...embeddings import create_embeddings_client

            self._embedding_model = create_embeddings_client(
                provider=settings.embeddings_provider,
                model_name=settings.embeddings_model_name,
                model_dir=settings.embeddings_model_dir,
                api_key=settings.effective_embeddings_api_key,
                api_base=settings.effective_embeddings_api_base,
                aws_region=settings.embeddings_aws_region,
                embedding_dimension=settings.embeddings_model_dimensions,
            )
        return self._embedding_model

    async def initialize(self) -> None:
        """Initialize the search service and create vector search index.

        Uses MongoDB CE 8.2's SearchIndexModel for creating vector indexes,
        which requires the mongot process to be running alongside mongod.
        """
        logger.info(
            f"Initializing MongoDB CE 8.2 native vector search on collection: "
            f"{self._collection_name}"
        )
        collection = await self._get_collection()

        try:
            # Check existing search indexes
            existing_indexes = []
            try:
                async for idx in collection.list_search_indexes():
                    existing_indexes.append(idx)
            except Exception as e:
                # list_search_indexes may fail if mongot is not available
                logger.warning(f"Could not list search indexes (mongot may not be running): {e}")

            index_names = [idx.get("name") for idx in existing_indexes]

            if self._vector_index_name not in index_names:
                logger.info(
                    f"Creating vector search index '{self._vector_index_name}' "
                    f"with {settings.embeddings_model_dimensions} dimensions..."
                )

                # MongoDB CE 8.2 uses SearchIndexModel for vector indexes
                search_index_model = SearchIndexModel(
                    definition={
                        "fields": [
                            {
                                "type": "vector",
                                "path": "embedding",
                                "numDimensions": settings.embeddings_model_dimensions,
                                "similarity": settings.mongodb_vector_similarity_metric,
                            }
                        ]
                    },
                    name=self._vector_index_name,
                    type="vectorSearch",
                )

                try:
                    result = await collection.create_search_index(model=search_index_model)
                    logger.info(f"Created vector search index: {result}")
                except Exception as create_error:
                    # Handle case where mongot is not available
                    if (
                        "mongot" in str(create_error).lower()
                        or "search" in str(create_error).lower()
                    ):
                        logger.warning(
                            f"Could not create vector search index (mongot process may not be "
                            f"running). Vector search will fall back to client-side similarity. "
                            f"Error: {create_error}"
                        )
                    else:
                        raise create_error
            else:
                logger.info(f"Vector search index '{self._vector_index_name}' already exists")

            # Create regular indexes for path lookups
            cursor = await collection.list_indexes()
            regular_indexes = await cursor.to_list(length=100)
            regular_index_names = [idx["name"] for idx in regular_indexes]

            if "path_idx" not in regular_index_names:
                await collection.create_index([("path", 1)], name="path_idx", unique=True)
                logger.info("Created path index")

            if "entity_type_idx" not in regular_index_names:
                await collection.create_index([("entity_type", 1)], name="entity_type_idx")
                logger.info("Created entity_type index")

        except Exception as e:
            logger.error(f"Failed to initialize search indexes: {e}", exc_info=True)

    async def index_server(
        self,
        path: str,
        server_info: dict[str, Any],
        is_enabled: bool = False,
    ) -> None:
        """Index a server for search."""
        collection = await self._get_collection()

        text_parts = [
            server_info.get("server_name", ""),
            server_info.get("description", ""),
        ]

        tags = server_info.get("tags", [])
        if tags:
            text_parts.append("Tags: " + ", ".join(tags))

        for tool in server_info.get("tool_list", []):
            text_parts.append(tool.get("name", ""))
            text_parts.append(tool.get("description", ""))

        text_for_embedding = " ".join(filter(None, text_parts))

        model = await self._get_embedding_model()
        embedding = model.encode([text_for_embedding])[0].tolist()

        doc = {
            "_id": path,
            "entity_type": "mcp_server",
            "path": path,
            "name": server_info.get("server_name", ""),
            "description": server_info.get("description", ""),
            "tags": server_info.get("tags", []),
            "is_enabled": is_enabled,
            "text_for_embedding": text_for_embedding,
            "embedding": embedding,
            "embedding_metadata": embedding_config.get_embedding_metadata(),
            "tools": [
                {
                    "name": t.get("name"),
                    "description": t.get("description"),
                    "inputSchema": t.get("inputSchema") or t.get("schema", {}),
                }
                for t in server_info.get("tool_list", [])
            ],
            "metadata": server_info,
            "indexed_at": server_info.get("updated_at", server_info.get("registered_at")),
        }

        try:
            await collection.replace_one({"_id": path}, doc, upsert=True)
            logger.info(f"Indexed server '{server_info.get('server_name')}' for search")
        except Exception as e:
            logger.error(f"Failed to index server in search: {e}", exc_info=True)

    async def index_agent(
        self,
        path: str,
        agent_card: AgentCard,
        is_enabled: bool = False,
    ) -> None:
        """Index an agent for search."""
        collection = await self._get_collection()

        text_parts = [
            agent_card.name,
            agent_card.description or "",
        ]

        tags = agent_card.tags or []
        if tags:
            text_parts.append("Tags: " + ", ".join(tags))

        if agent_card.capabilities:
            text_parts.append("Capabilities: " + ", ".join(agent_card.capabilities))

        if agent_card.skills:
            for skill in agent_card.skills:
                text_parts.append(skill.name)
                if skill.description:
                    text_parts.append(skill.description)

        text_for_embedding = " ".join(filter(None, text_parts))

        model = await self._get_embedding_model()
        embedding = model.encode([text_for_embedding])[0].tolist()

        doc = {
            "_id": path,
            "entity_type": "a2a_agent",
            "path": path,
            "name": agent_card.name,
            "description": agent_card.description or "",
            "tags": agent_card.tags or [],
            "is_enabled": is_enabled,
            "text_for_embedding": text_for_embedding,
            "embedding": embedding,
            "embedding_metadata": embedding_config.get_embedding_metadata(),
            "capabilities": agent_card.capabilities or [],
            "metadata": agent_card.model_dump(mode="json"),
            "indexed_at": agent_card.updated_at or agent_card.registered_at,
        }

        try:
            await collection.replace_one({"_id": path}, doc, upsert=True)
            logger.info(f"Indexed agent '{agent_card.name}' for search")
        except Exception as e:
            logger.error(f"Failed to index agent in search: {e}", exc_info=True)

    async def remove_entity(
        self,
        path: str,
    ) -> None:
        """Remove entity from search index."""
        collection = await self._get_collection()

        try:
            result = await collection.delete_one({"_id": path})
            if result.deleted_count > 0:
                logger.info(f"Removed entity '{path}' from search index")
            else:
                logger.warning(f"Entity '{path}' not found in search index")
        except Exception as e:
            logger.error(f"Failed to remove entity from search index: {e}", exc_info=True)

    def _calculate_cosine_similarity(
        self,
        vec1: list[float],
        vec2: list[float],
    ) -> float:
        """Calculate cosine similarity between two vectors.

        Returns a value between 0 and 1, where 1 is identical.
        """
        import math

        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2, strict=True))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    async def _client_side_search(
        self,
        query: str,
        query_embedding: list[float],
        entity_types: list[str] | None = None,
        max_results: int = 10,
    ) -> dict[str, list[dict[str, Any]]]:
        """Fallback search using client-side cosine similarity.

        This method is used when mongot is not available for native $vectorSearch.
        """
        collection = await self._get_collection()

        try:
            query_filter = {}
            if entity_types:
                query_filter["entity_type"] = {"$in": entity_types}

            cursor = collection.find(
                query_filter,
                {
                    "_id": 1,
                    "path": 1,
                    "entity_type": 1,
                    "name": 1,
                    "description": 1,
                    "tags": 1,
                    "tools": 1,
                    "metadata": 1,
                    "is_enabled": 1,
                    "embedding": 1,
                },
            )

            all_docs = await cursor.to_list(length=None)
            logger.info(f"Client-side search: Retrieved {len(all_docs)} documents")

            query_tokens = _tokenize_query(query)
            scored_docs = []

            for doc in all_docs:
                embedding = doc.get("embedding", [])
                if not embedding:
                    continue

                vector_score = self._calculate_cosine_similarity(query_embedding, embedding)

                # Calculate text boost
                text_boost = 0.0
                name = doc.get("name", "")
                description = doc.get("description", "")
                tags = doc.get("tags", [])
                tools = doc.get("tools", [])
                matching_tools = []
                path = doc.get("path", "")
                server_name_matched = False

                if path and _tokens_match_text(query_tokens, path):
                    text_boost += 5.0
                    server_name_matched = True
                if name and _tokens_match_text(query_tokens, name):
                    text_boost += 3.0
                    server_name_matched = True
                if description and _tokens_match_text(query_tokens, description):
                    text_boost += 2.0
                if tags and any(_tokens_match_text(query_tokens, tag) for tag in tags):
                    text_boost += 1.5

                for tool in tools:
                    tool_name = tool.get("name", "")
                    tool_desc = tool.get("description") or ""
                    tool_matched = _tokens_match_text(
                        query_tokens, tool_name
                    ) or _tokens_match_text(query_tokens, tool_desc)

                    if tool_matched:
                        text_boost += 1.0
                        matching_tools.append(
                            {
                                "tool_name": tool_name,
                                "description": tool_desc,
                                "relevance_score": 1.0,
                                "match_context": tool_desc or f"Tool: {tool_name}",
                            }
                        )
                    elif server_name_matched:
                        matching_tools.append(
                            {
                                "tool_name": tool_name,
                                "description": tool_desc,
                                "relevance_score": 0.8,
                                "match_context": tool_desc or f"Tool: {tool_name}",
                            }
                        )

                doc["_matching_tools"] = matching_tools

                normalized_vector_score = (vector_score + 1.0) / 2.0
                relevance_score = normalized_vector_score + (text_boost * 0.05)
                relevance_score = max(0.0, min(1.0, relevance_score))

                scored_docs.append(
                    {
                        "doc": doc,
                        "relevance_score": relevance_score,
                        "vector_score": vector_score,
                        "text_boost": text_boost,
                    }
                )

            scored_docs.sort(key=lambda x: x["relevance_score"], reverse=True)

            return self._format_search_results(scored_docs, max_results)

        except Exception as e:
            logger.error(f"Failed to perform client-side search: {e}", exc_info=True)
            return {"servers": [], "tools": [], "agents": []}

    def _format_search_results(
        self,
        scored_docs: list[dict[str, Any]],
        max_results: int = 10,
    ) -> dict[str, list[dict[str, Any]]]:
        """Format search results into the API response structure."""
        servers: list[dict[str, Any]] = []
        agents: list[dict[str, Any]] = []
        tools: list[dict[str, Any]] = []

        for item in scored_docs:
            doc = item["doc"]
            entity_type = doc.get("entity_type")

            if entity_type == "mcp_server" and len(servers) < 3:
                servers.append(item)
            elif entity_type == "a2a_agent" and len(agents) < 3:
                agents.append(item)
            elif entity_type == "mcp_tool" and len(tools) < 3:
                tools.append(item)

        grouped_results: dict[str, list[dict[str, Any]]] = {
            "servers": [],
            "tools": [],
            "agents": [],
        }

        tool_count = 0
        for item in servers:
            doc = item["doc"]
            relevance_score = item["relevance_score"]
            matching_tools = doc.get("_matching_tools", [])

            result_entry = {
                "entity_type": "mcp_server",
                "path": doc.get("path"),
                "server_name": doc.get("name"),
                "description": doc.get("description"),
                "tags": doc.get("tags", []),
                "num_tools": doc.get("metadata", {}).get("num_tools", 0),
                "is_enabled": doc.get("is_enabled", False),
                "relevance_score": relevance_score,
                "match_context": doc.get("description"),
                "matching_tools": matching_tools,
            }
            grouped_results["servers"].append(result_entry)

            original_tools = doc.get("tools", [])
            tool_schema_map = {t.get("name", ""): t.get("inputSchema", {}) for t in original_tools}

            server_path = doc.get("path", "")
            server_name = doc.get("name", "")
            for tool in matching_tools:
                if tool_count >= 3:
                    break
                tool_name = tool.get("tool_name", "")
                grouped_results["tools"].append(
                    {
                        "entity_type": "tool",
                        "server_path": server_path,
                        "server_name": server_name,
                        "tool_name": tool_name,
                        "description": tool.get("description", ""),
                        "inputSchema": tool_schema_map.get(tool_name, {}),
                        "relevance_score": tool.get("relevance_score", relevance_score),
                        "match_context": tool.get("match_context", ""),
                    }
                )
                tool_count += 1

        for item in agents:
            doc = item["doc"]
            relevance_score = item["relevance_score"]
            metadata = doc.get("metadata", {})

            result_entry = {
                "entity_type": "a2a_agent",
                "path": doc.get("path"),
                "agent_name": doc.get("name"),
                "description": doc.get("description"),
                "tags": doc.get("tags", []),
                "skills": metadata.get("skills", []),
                "visibility": metadata.get("visibility", "public"),
                "trust_level": metadata.get("trust_level"),
                "is_enabled": doc.get("is_enabled", False),
                "relevance_score": relevance_score,
                "match_context": doc.get("description"),
                "agent_card": metadata.get("agent_card", {}),
            }
            grouped_results["agents"].append(result_entry)

        for item in tools:
            doc = item["doc"]
            relevance_score = item["relevance_score"]

            result_entry = {
                "entity_type": "mcp_tool",
                "path": doc.get("path"),
                "tool_name": doc.get("name"),
                "description": doc.get("description"),
                "inputSchema": doc.get("inputSchema", {}),
                "relevance_score": relevance_score,
                "match_context": doc.get("description"),
            }
            grouped_results["tools"].append(result_entry)

        logger.info(
            f"Search returned "
            f"{len(grouped_results['servers'])} servers, "
            f"{len(grouped_results['tools'])} tools, "
            f"{len(grouped_results['agents'])} agents (top 3 per type)"
        )

        return grouped_results

    async def search(
        self,
        query: str,
        entity_types: list[str] | None = None,
        max_results: int = 10,
    ) -> dict[str, list[dict[str, Any]]]:
        """Perform hybrid search using MongoDB CE 8.2 native $vectorSearch.

        This uses the native $vectorSearch aggregation stage which requires:
        - MongoDB CE 8.2 or later
        - mongot process running alongside mongod
        - Vector search index created via SearchIndexModel
        """
        collection = await self._get_collection()

        try:
            model = await self._get_embedding_model()
            query_embedding = model.encode([query])[0].tolist()

            # Calculate numCandidates based on settings
            num_candidates = max_results * settings.mongodb_vector_num_candidates_multiplier

            # MongoDB CE 8.2 native $vectorSearch pipeline
            # Note: This is different from Atlas which uses $search.vectorSearch
            pipeline: list[dict[str, Any]] = [
                {
                    "$vectorSearch": {
                        "index": self._vector_index_name,
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": num_candidates,
                        "limit": max_results * 3,  # Get more for re-ranking
                    }
                }
            ]

            # Add vectorSearchScore to results
            pipeline.append({"$addFields": {"vector_score": {"$meta": "vectorSearchScore"}}})

            # Apply entity type filter if specified
            if entity_types:
                pipeline.append({"$match": {"entity_type": {"$in": entity_types}}})

            # Tokenize query for keyword boosting
            query_tokens = _tokenize_query(query)
            escaped_tokens = [re.escape(token) for token in query_tokens]
            token_regex = "|".join(escaped_tokens) if escaped_tokens else query

            # Add text-based scoring for hybrid search
            pipeline.append(
                {
                    "$addFields": {
                        "text_boost": {
                            "$add": [
                                # Path match: 5.0
                                {
                                    "$cond": [
                                        {
                                            "$regexMatch": {
                                                "input": {"$ifNull": ["$path", ""]},
                                                "regex": token_regex,
                                                "options": "i",
                                            }
                                        },
                                        5.0,
                                        0.0,
                                    ]
                                },
                                # Name match: 3.0
                                {
                                    "$cond": [
                                        {
                                            "$regexMatch": {
                                                "input": {"$ifNull": ["$name", ""]},
                                                "regex": token_regex,
                                                "options": "i",
                                            }
                                        },
                                        3.0,
                                        0.0,
                                    ]
                                },
                                # Description match: 2.0
                                {
                                    "$cond": [
                                        {
                                            "$regexMatch": {
                                                "input": {"$ifNull": ["$description", ""]},
                                                "regex": token_regex,
                                                "options": "i",
                                            }
                                        },
                                        2.0,
                                        0.0,
                                    ]
                                },
                                # Tags match: 1.5
                                {
                                    "$cond": [
                                        {
                                            "$gt": [
                                                {
                                                    "$size": {
                                                        "$filter": {
                                                            "input": {"$ifNull": ["$tags", []]},
                                                            "as": "tag",
                                                            "cond": {
                                                                "$regexMatch": {
                                                                    "input": "$$tag",
                                                                    "regex": token_regex,
                                                                    "options": "i",
                                                                }
                                                            },
                                                        }
                                                    }
                                                },
                                                0,
                                            ]
                                        },
                                        1.5,
                                        0.0,
                                    ]
                                },
                                # Tools match: 1.0 per matching tool
                                {
                                    "$size": {
                                        "$filter": {
                                            "input": {"$ifNull": ["$tools", []]},
                                            "as": "tool",
                                            "cond": {
                                                "$or": [
                                                    {
                                                        "$regexMatch": {
                                                            "input": {
                                                                "$ifNull": ["$$tool.name", ""]
                                                            },
                                                            "regex": token_regex,
                                                            "options": "i",
                                                        }
                                                    },
                                                    {
                                                        "$regexMatch": {
                                                            "input": {
                                                                "$ifNull": [
                                                                    "$$tool.description",
                                                                    "",
                                                                ]
                                                            },
                                                            "regex": token_regex,
                                                            "options": "i",
                                                        }
                                                    },
                                                ]
                                            },
                                        }
                                    }
                                },
                            ]
                        },
                        # Track matching tools for display
                        "matching_tools": {
                            "$map": {
                                "input": {
                                    "$filter": {
                                        "input": {"$ifNull": ["$tools", []]},
                                        "as": "tool",
                                        "cond": {
                                            "$or": [
                                                {
                                                    "$regexMatch": {
                                                        "input": {"$ifNull": ["$$tool.name", ""]},
                                                        "regex": token_regex,
                                                        "options": "i",
                                                    }
                                                },
                                                {
                                                    "$regexMatch": {
                                                        "input": {
                                                            "$ifNull": ["$$tool.description", ""]
                                                        },
                                                        "regex": token_regex,
                                                        "options": "i",
                                                    }
                                                },
                                            ]
                                        },
                                    }
                                },
                                "as": "tool",
                                "in": {
                                    "tool_name": "$$tool.name",
                                    "description": {"$ifNull": ["$$tool.description", ""]},
                                    "relevance_score": 1.0,
                                    "match_context": {
                                        "$cond": [
                                            {"$ne": ["$$tool.description", None]},
                                            "$$tool.description",
                                            {"$concat": ["Tool: ", "$$tool.name"]},
                                        ]
                                    },
                                },
                            }
                        },
                    }
                }
            )

            # Calculate hybrid relevance score
            pipeline.append(
                {
                    "$addFields": {
                        "relevance_score": {
                            "$min": [
                                1.0,
                                {"$add": ["$vector_score", {"$multiply": ["$text_boost", 0.1]}]},
                            ]
                        }
                    }
                }
            )

            # Sort by hybrid relevance score
            pipeline.append({"$sort": {"relevance_score": -1}})

            # Limit results
            pipeline.append({"$limit": max_results})

            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=max_results)

            # Format results
            scored_docs = []
            for doc in results:
                scored_docs.append(
                    {
                        "doc": doc,
                        "relevance_score": doc.get("relevance_score", 0.0),
                        "vector_score": doc.get("vector_score", 0.0),
                        "text_boost": doc.get("text_boost", 0.0),
                    }
                )

            logger.info(
                f"MongoDB CE 8.2 $vectorSearch for '{query}' returned {len(results)} results"
            )

            return self._format_search_results(scored_docs, max_results)

        except Exception as e:
            from pymongo.errors import OperationFailure

            # Check if this is a mongot/vector search not available error
            error_str = str(e).lower()
            if (
                isinstance(e, OperationFailure)
                or "vectorsearch" in error_str
                or "mongot" in error_str
            ):
                logger.warning(
                    f"Native $vectorSearch not available (mongot may not be running). "
                    f"Falling back to client-side similarity search. Error: {e}"
                )
                return await self._client_side_search(
                    query, query_embedding, entity_types, max_results
                )

            logger.error(f"Failed to perform vector search: {e}", exc_info=True)
            return {"servers": [], "tools": [], "agents": []}

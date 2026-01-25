#!/usr/bin/env python3
"""
Initialize MongoDB collections and indexes for MCP Gateway Registry.

This script creates all necessary vector indexes and standard indexes for
the MCP Gateway Registry MongoDB CE 8.2+ backend using native vector search.

For AWS DocumentDB, use init-documentdb-indexes.py instead.

Usage:
    # Using environment variables
    export DOCUMENTDB_HOST=localhost
    uv run python scripts/init-mongodb-indexes.py

    # Using command-line arguments
    uv run python scripts/init-mongodb-indexes.py --host localhost

    # With namespace
    uv run python scripts/init-mongodb-indexes.py --namespace tenant-a

    # Recreate indexes
    uv run python scripts/init-mongodb-indexes.py --recreate

Requires:
    - pymongo (AsyncMongoClient)
    - MongoDB CE 8.2+ with mongot for vector search
"""

import argparse
import asyncio
import json
import logging
import os
from pathlib import Path

from pymongo import AsyncMongoClient
from pymongo.operations import SearchIndexModel

# Configure logging with basicConfig
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s,p%(process)s,{%(filename)s:%(lineno)d},%(levelname)s,%(message)s",
)
logger = logging.getLogger(__name__)


# Collection names
COLLECTION_SERVERS = "mcp_servers"
COLLECTION_AGENTS = "mcp_agents"
COLLECTION_SCOPES = "mcp_scopes"
COLLECTION_EMBEDDINGS = "mcp_embeddings_1536"
COLLECTION_SECURITY_SCANS = "mcp_security_scans"
COLLECTION_FEDERATION_CONFIG = "mcp_federation_config"

# Default embedding dimensions (can be overridden by environment variable)
DEFAULT_EMBEDDING_DIMENSIONS = 384


def _build_connection_string(
    host: str,
    port: int,
    database: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> str:
    """Build MongoDB connection string.

    Args:
        host: MongoDB host
        port: MongoDB port
        database: Database name
        username: Optional username
        password: Optional password
        direct_connection: Whether to use directConnection for single-node setup

    Returns:
        MongoDB connection string
    """
    if username and password:
        connection_string = (
            f"mongodb://{username}:{password}@{host}:{port}/{database}?"
            f"authMechanism=SCRAM-SHA-256&authSource=admin"
        )
    else:
        connection_string = f"mongodb://{host}:{port}/{database}"

    if direct_connection:
        separator = "&" if "?" in connection_string else "?"
        connection_string += f"{separator}directConnection=true"

    return connection_string


async def _create_vector_search_index(
    collection,
    collection_name: str,
    index_name: str,
    dimensions: int,
    similarity: str,
    recreate: bool,
) -> None:
    """Create vector search index using MongoDB CE 8.2 SearchIndexModel.

    MongoDB CE 8.2+ uses a separate search index API that requires mongot
    to be running. This is different from DocumentDB's vectorOptions approach.

    Args:
        collection: MongoDB collection
        collection_name: Name of the collection
        index_name: Name for the vector search index
        dimensions: Number of embedding dimensions
        similarity: Similarity metric (cosine, euclidean, dotProduct)
        recreate: Whether to recreate existing index
    """
    try:
        # Check existing search indexes
        existing_indexes = []
        try:
            # list_search_indexes() returns a coroutine that yields an AsyncCommandCursor
            cursor = await collection.list_search_indexes()
            async for idx in cursor:
                existing_indexes.append(idx)
        except Exception as e:
            error_msg = str(e).lower()
            if "mongot" in error_msg or "search" in error_msg:
                logger.warning(
                    f"mongot process not available - vector search indexes cannot be created. "
                    f"Vector search will use client-side fallback. Error: {e}"
                )
                return
            raise

        existing_names = [idx.get("name") for idx in existing_indexes]

        if index_name in existing_names:
            if recreate:
                logger.info(f"Dropping existing vector search index '{index_name}'...")
                try:
                    await collection.drop_search_index(index_name)
                    logger.info(f"Dropped vector search index '{index_name}'")
                    # Wait for index to be fully dropped
                    await asyncio.sleep(1)
                except Exception as drop_err:
                    logger.warning(f"Failed to drop vector search index: {drop_err}")
            else:
                logger.info(
                    f"Vector search index '{index_name}' already exists on {collection_name}"
                )
                return

        # Create vector search index using SearchIndexModel
        logger.info(
            f"Creating vector search index '{index_name}' on {collection_name} "
            f"({dimensions} dimensions, {similarity} similarity)..."
        )

        search_index_model = SearchIndexModel(
            definition={
                "fields": [
                    {
                        "type": "vector",
                        "path": "embedding",
                        "numDimensions": dimensions,
                        "similarity": similarity,
                    }
                ]
            },
            name=index_name,
            type="vectorSearch",
        )

        result = await collection.create_search_index(model=search_index_model)
        logger.info(f"Created vector search index: {result}")

    except Exception as e:
        error_msg = str(e).lower()
        if "mongot" in error_msg or "search" in error_msg:
            logger.warning(
                f"Could not create vector search index on {collection_name}. "
                f"mongot process may not be running. Vector search will use "
                f"client-side fallback. Error: {e}"
            )
        else:
            logger.error(
                f"Failed to create vector search index on {collection_name}: {e}",
                exc_info=True,
            )
            raise


async def _create_embeddings_indexes(
    collection,
    collection_name: str,
    recreate: bool,
    embedding_dimensions: int,
    similarity_metric: str,
    vector_index_name: str,
) -> None:
    """Create all indexes for embeddings collection."""
    # Create vector search index
    await _create_vector_search_index(
        collection=collection,
        collection_name=collection_name,
        index_name=vector_index_name,
        dimensions=embedding_dimensions,
        similarity=similarity_metric,
        recreate=recreate,
    )

    # Create regular indexes
    indexes = [
        ("name", 1, False),
        ("path", 1, True),  # Unique index on path
        ("entity_type", 1, False),
    ]

    for field, order, unique in indexes:
        index_name = f"{field}_idx"

        if recreate:
            try:
                await collection.drop_index(index_name)
                logger.info(f"Dropped existing index '{index_name}' from {collection_name}")
            except Exception:
                pass  # Index may not exist

        try:
            await collection.create_index(
                [(field, order)],
                name=index_name,
                unique=unique,
            )
            logger.info(
                f"Created {'unique ' if unique else ''}index '{index_name}' on {collection_name}"
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Index '{index_name}' already exists on {collection_name}")
            else:
                logger.error(f"Failed to create index '{index_name}' on {collection_name}: {e}")


async def _create_servers_indexes(
    collection,
    collection_name: str,
    recreate: bool,
) -> None:
    """Create all indexes for servers collection."""
    indexes = [
        ("server_name", 1, False),
        ("is_enabled", 1, False),
        ("version", 1, False),
        ("tags", 1, False),
    ]

    for field, order, unique in indexes:
        index_name = f"{field}_idx"

        if recreate:
            try:
                await collection.drop_index(index_name)
                logger.info(f"Dropped existing index '{index_name}' from {collection_name}")
            except Exception:
                pass

        try:
            await collection.create_index(
                [(field, order)],
                name=index_name,
                unique=unique,
            )
            logger.info(
                f"Created {'unique ' if unique else ''}index '{index_name}' on {collection_name}"
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Index '{index_name}' already exists on {collection_name}")
            else:
                logger.error(f"Failed to create index '{index_name}' on {collection_name}: {e}")


async def _create_agents_indexes(
    collection,
    collection_name: str,
    recreate: bool,
) -> None:
    """Create all indexes for agents collection."""
    indexes = [
        ("name", 1, False),
        ("is_enabled", 1, False),
        ("version", 1, False),
        ("tags", 1, False),
    ]

    for field, order, unique in indexes:
        index_name = f"{field}_idx"

        if recreate:
            try:
                await collection.drop_index(index_name)
                logger.info(f"Dropped existing index '{index_name}' from {collection_name}")
            except Exception:
                pass

        try:
            await collection.create_index(
                [(field, order)],
                name=index_name,
                unique=unique,
            )
            logger.info(
                f"Created {'unique ' if unique else ''}index '{index_name}' on {collection_name}"
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Index '{index_name}' already exists on {collection_name}")
            else:
                logger.error(f"Failed to create index '{index_name}' on {collection_name}: {e}")


async def _create_scopes_indexes(
    collection,
    collection_name: str,
    recreate: bool,
) -> None:
    """Create all indexes for scopes collection."""
    indexes = [
        ("name", 1, False),
    ]

    for field, order, unique in indexes:
        index_name = f"{field}_idx"

        if recreate:
            try:
                await collection.drop_index(index_name)
                logger.info(f"Dropped existing index '{index_name}' from {collection_name}")
            except Exception:
                pass

        try:
            await collection.create_index(
                [(field, order)],
                name=index_name,
                unique=unique,
            )
            logger.info(
                f"Created {'unique ' if unique else ''}index '{index_name}' on {collection_name}"
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Index '{index_name}' already exists on {collection_name}")
            else:
                logger.error(f"Failed to create index '{index_name}' on {collection_name}: {e}")


async def _create_security_scans_indexes(
    collection,
    collection_name: str,
    recreate: bool,
) -> None:
    """Create all indexes for security scans collection."""
    indexes = [
        ("entity_path", 1, False),
        ("entity_type", 1, False),
        ("scan_status", 1, False),
        ("scanned_at", 1, False),
    ]

    for field, order, unique in indexes:
        index_name = f"{field}_idx"

        if recreate:
            try:
                await collection.drop_index(index_name)
                logger.info(f"Dropped existing index '{index_name}' from {collection_name}")
            except Exception:
                pass

        try:
            await collection.create_index(
                [(field, order)],
                name=index_name,
                unique=unique,
            )
            logger.info(
                f"Created {'unique ' if unique else ''}index '{index_name}' on {collection_name}"
            )
        except Exception as e:
            if "already exists" in str(e).lower():
                logger.info(f"Index '{index_name}' already exists on {collection_name}")
            else:
                logger.error(f"Failed to create index '{index_name}' on {collection_name}: {e}")


async def _create_federation_config_indexes(
    collection,
    collection_name: str,
    recreate: bool,
) -> None:
    """Create all indexes for federation config collection."""
    # No additional indexes needed - _id is automatically indexed
    logger.info(f"No additional indexes to create for {collection_name} (_id is auto-indexed)")


async def _load_default_scopes(
    db,
    namespace: str,
) -> None:
    """Load default admin scope from JSON file into scopes collection.

    Args:
        db: Database connection
        namespace: Collection namespace
    """
    collection_name = f"{COLLECTION_SCOPES}_{namespace}"
    collection = db[collection_name]

    # Find the registry-admins.json file in the same directory as this script
    script_dir = Path(__file__).parent
    admin_scope_file = script_dir / "registry-admins.json"

    if not admin_scope_file.exists():
        logger.warning(f"Default admin scope file not found: {admin_scope_file}")
        return

    try:
        with open(admin_scope_file) as f:
            admin_scope = json.load(f)

        logger.info(f"Loading default admin scope from {admin_scope_file}")

        # Upsert the admin scope document
        result = await collection.update_one(
            {"_id": admin_scope["_id"]},
            {"$set": admin_scope},
            upsert=True,
        )

        if result.upserted_id:
            logger.info(f"Inserted admin scope: {admin_scope['_id']}")
        elif result.modified_count > 0:
            logger.info(f"Updated admin scope: {admin_scope['_id']}")
        else:
            logger.info(f"Admin scope already up-to-date: {admin_scope['_id']}")

        logger.info(f"Admin scope group_mappings: {admin_scope.get('group_mappings', [])}")

    except Exception as e:
        logger.error(f"Failed to load default admin scope: {e}", exc_info=True)


async def _print_collection_summary(
    db,
    namespace: str,
) -> None:
    """Print summary of all collections and their indexes."""
    logger.info("=" * 80)
    logger.info("MONGODB COLLECTIONS AND INDEXES SUMMARY")
    logger.info("=" * 80)

    collection_names = [
        f"{COLLECTION_SERVERS}_{namespace}",
        f"{COLLECTION_AGENTS}_{namespace}",
        f"{COLLECTION_SCOPES}_{namespace}",
        f"{COLLECTION_EMBEDDINGS}_{namespace}",
        f"{COLLECTION_SECURITY_SCANS}_{namespace}",
        f"{COLLECTION_FEDERATION_CONFIG}_{namespace}",
    ]

    for coll_name in collection_names:
        try:
            collection = db[coll_name]

            # Get document count
            count = await collection.count_documents({})

            # Get regular indexes
            cursor = await collection.list_indexes()
            indexes = await cursor.to_list(None)

            # Get search indexes (vector indexes)
            search_indexes = []
            try:
                # list_search_indexes() returns a coroutine
                cursor = await collection.list_search_indexes()
                async for idx in cursor:
                    search_indexes.append(idx)
            except Exception:
                pass  # mongot may not be available

            logger.info(f"\nCollection: {coll_name}")
            logger.info(f"  Documents: {count}")
            logger.info(f"  Regular Indexes ({len(indexes)}):")

            for idx in indexes:
                idx_name = idx.get("name")
                keys = idx.get("key", {})
                unique = " UNIQUE" if idx.get("unique", False) else ""
                logger.info(f"    - {idx_name} on {keys}{unique}")

            if search_indexes:
                logger.info(f"  Vector Search Indexes ({len(search_indexes)}):")
                for idx in search_indexes:
                    idx_name = idx.get("name")
                    idx_type = idx.get("type", "unknown")
                    status = idx.get("status", "unknown")
                    definition = idx.get("latestDefinition", idx.get("definition", {}))
                    fields = definition.get("fields", [])

                    dims = "unknown"
                    sim = "unknown"
                    for field in fields:
                        if field.get("type") == "vector":
                            dims = field.get("numDimensions", "unknown")
                            sim = field.get("similarity", "unknown")

                    logger.info(
                        f"    - {idx_name} ({idx_type}, dims={dims}, "
                        f"similarity={sim}, status={status})"
                    )

        except Exception as e:
            logger.error(f"Error getting info for {coll_name}: {e}")

    logger.info("=" * 80)


async def _initialize_collections(
    db,
    namespace: str,
    recreate: bool,
    embedding_dimensions: int,
    similarity_metric: str,
    vector_index_name: str,
) -> None:
    """Initialize all collections and indexes.

    Args:
        db: Database connection
        namespace: Collection namespace
        recreate: Whether to recreate existing indexes
        embedding_dimensions: Number of embedding dimensions
        similarity_metric: Vector similarity metric
        vector_index_name: Name for the vector search index
    """
    # Define collection configurations
    collection_configs = [
        (COLLECTION_SERVERS, _create_servers_indexes),
        (COLLECTION_AGENTS, _create_agents_indexes),
        (COLLECTION_SCOPES, _create_scopes_indexes),
        (COLLECTION_SECURITY_SCANS, _create_security_scans_indexes),
        (COLLECTION_FEDERATION_CONFIG, _create_federation_config_indexes),
    ]

    for base_name, create_indexes_func in collection_configs:
        collection_name = f"{base_name}_{namespace}"
        collection = db[collection_name]

        logger.info(f"Creating indexes for collection: {collection_name}")

        try:
            # Check if collection exists
            existing_collections = await db.list_collection_names()
            if collection_name not in existing_collections:
                logger.info(f"Creating collection: {collection_name}")
                await db.create_collection(collection_name)
                logger.info(f"Collection {collection_name} created successfully")
            else:
                logger.info(f"Collection {collection_name} already exists")
        except Exception as e:
            logger.warning(f"Could not create collection {collection_name}: {e}")

        try:
            await create_indexes_func(collection, collection_name, recreate)
            logger.info(f"Successfully created indexes for {collection_name}")
        except Exception as e:
            logger.error(f"Failed to create indexes for {collection_name}: {e}", exc_info=True)
            continue

    # Handle embeddings collection separately (needs vector index)
    embeddings_collection_name = f"{COLLECTION_EMBEDDINGS}_{namespace}"
    embeddings_collection = db[embeddings_collection_name]

    logger.info(f"Creating indexes for collection: {embeddings_collection_name}")

    try:
        existing_collections = await db.list_collection_names()
        if embeddings_collection_name not in existing_collections:
            logger.info(f"Creating collection: {embeddings_collection_name}")
            await db.create_collection(embeddings_collection_name)
            logger.info(f"Collection {embeddings_collection_name} created successfully")
    except Exception as e:
        logger.warning(f"Could not create collection {embeddings_collection_name}: {e}")

    try:
        await _create_embeddings_indexes(
            collection=embeddings_collection,
            collection_name=embeddings_collection_name,
            recreate=recreate,
            embedding_dimensions=embedding_dimensions,
            similarity_metric=similarity_metric,
            vector_index_name=vector_index_name,
        )
        logger.info(f"Successfully created indexes for {embeddings_collection_name}")
    except Exception as e:
        logger.error(
            f"Failed to create indexes for {embeddings_collection_name}: {e}",
            exc_info=True,
        )

    # Load default admin scope after scopes collection is initialized
    logger.info("Loading default admin scope...")
    await _load_default_scopes(db, namespace)


async def main() -> int:
    """Main initialization function."""
    parser = argparse.ArgumentParser(
        description="Initialize MongoDB collections and indexes for MCP Gateway Registry (CE 8.2+)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
    # Using environment variables
    export DOCUMENTDB_HOST=localhost
    uv run python scripts/init-mongodb-indexes.py

    # Using command-line arguments
    uv run python scripts/init-mongodb-indexes.py --host localhost

    # With namespace
    uv run python scripts/init-mongodb-indexes.py --namespace tenant-a

    # Custom embedding dimensions
    uv run python scripts/init-mongodb-indexes.py --embedding-dimensions 768
""",
    )

    parser.add_argument(
        "--host",
        default=os.getenv("DOCUMENTDB_HOST", "localhost"),
        help="MongoDB host (default: from DOCUMENTDB_HOST env var or 'localhost')",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("DOCUMENTDB_PORT", "27017")),
        help="MongoDB port (default: from DOCUMENTDB_PORT env var or 27017)",
    )
    parser.add_argument(
        "--database",
        default=os.getenv("DOCUMENTDB_DATABASE", "mcp_registry"),
        help="Database name (default: from DOCUMENTDB_DATABASE env var or 'mcp_registry')",
    )
    parser.add_argument(
        "--username",
        default=os.getenv("DOCUMENTDB_USERNAME"),
        help="MongoDB username (default: from DOCUMENTDB_USERNAME env var)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("DOCUMENTDB_PASSWORD"),
        help="MongoDB password (default: from DOCUMENTDB_PASSWORD env var)",
    )
    parser.add_argument(
        "--direct-connection",
        action="store_true",
        default=os.getenv("DOCUMENTDB_DIRECT_CONNECTION", "true").lower() == "true",
        help="Use directConnection for single-node MongoDB (default: true)",
    )
    parser.add_argument(
        "--namespace",
        default=os.getenv("DOCUMENTDB_NAMESPACE", "default"),
        help="Namespace for collection names (default: from DOCUMENTDB_NAMESPACE env var or 'default')",
    )
    parser.add_argument(
        "--embedding-dimensions",
        type=int,
        default=int(os.getenv("EMBEDDINGS_MODEL_DIMENSIONS", str(DEFAULT_EMBEDDING_DIMENSIONS))),
        help=f"Number of embedding dimensions (default: {DEFAULT_EMBEDDING_DIMENSIONS})",
    )
    parser.add_argument(
        "--similarity-metric",
        default=os.getenv("MONGODB_VECTOR_SIMILARITY_METRIC", "cosine"),
        choices=["cosine", "euclidean", "dotProduct"],
        help="Vector similarity metric (default: cosine)",
    )
    parser.add_argument(
        "--vector-index-name",
        default=os.getenv("MONGODB_VECTOR_INDEX_NAME", "vector_index"),
        help="Name for the vector search index (default: vector_index)",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        default=False,
        help="Drop and recreate indexes if they exist (default: False)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Initializing MongoDB collections and indexes (CE 8.2+ with native vector search)")
    logger.info(f"Host: {args.host}:{args.port}")
    logger.info(f"Database: {args.database}")
    logger.info(f"Namespace: {args.namespace}")
    logger.info(f"Embedding dimensions: {args.embedding_dimensions}")
    logger.info(f"Similarity metric: {args.similarity_metric}")
    logger.info(f"Vector index name: {args.vector_index_name}")
    logger.info(f"Recreate indexes: {args.recreate}")

    try:
        connection_string = _build_connection_string(
            host=args.host,
            port=args.port,
            database=args.database,
            username=args.username,
            password=args.password,
            direct_connection=args.direct_connection,
        )

        client = AsyncMongoClient(connection_string)
        db = client[args.database]

        server_info = await client.server_info()
        version = server_info.get("version", "unknown")
        logger.info(f"Connected to MongoDB {version}")

        # Check MongoDB version
        version_parts = version.split(".")
        if len(version_parts) >= 2:
            major, minor = int(version_parts[0]), int(version_parts[1])
            if major < 8 or (major == 8 and minor < 2):
                logger.warning(
                    f"MongoDB {version} does not support native vector search. "
                    f"MongoDB 8.2+ is required. Vector search will use client-side fallback."
                )

        await _initialize_collections(
            db=db,
            namespace=args.namespace,
            recreate=args.recreate,
            embedding_dimensions=args.embedding_dimensions,
            similarity_metric=args.similarity_metric,
            vector_index_name=args.vector_index_name,
        )

        logger.info(f"MongoDB initialization complete for namespace '{args.namespace}'")

        # Print summary of collections and indexes
        await _print_collection_summary(db, args.namespace)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to initialize MongoDB: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    import sys

    sys.exit(asyncio.run(main()))

#!/usr/bin/env python3
"""
Inspect MongoDB collections and indexes.

This script is designed for MongoDB CE 8.2+ with native vector search support.
For AWS DocumentDB, use inspect-documentdb.py instead.

Usage:
    # Using environment variables
    export DOCUMENTDB_HOST=localhost
    export DOCUMENTDB_DATABASE=mcp_registry
    uv run python -m registry.scripts.inspect-mongodb

    # With custom host
    DOCUMENTDB_HOST=mongodb.local uv run python -m registry.scripts.inspect-mongodb

    # With debug output
    uv run python -m registry.scripts.inspect-mongodb --debug
"""

import argparse
import asyncio
import json
import logging
import os
import sys

from pymongo import AsyncMongoClient

# Configure logging with basicConfig
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s,p%(process)s,{%(filename)s:%(lineno)d},%(levelname)s,%(message)s",
)
logger = logging.getLogger(__name__)


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


async def _inspect_vector_search_indexes(
    collection,
    collection_name: str,
) -> None:
    """Inspect vector search indexes for a collection.

    MongoDB CE 8.2+ uses SearchIndexModel for vector indexes, which are
    separate from regular indexes and require mongot to be running.
    """
    try:
        search_indexes = []
        # list_search_indexes() returns a coroutine that yields an AsyncCommandCursor
        cursor = await collection.list_search_indexes()
        async for idx in cursor:
            search_indexes.append(idx)

        if search_indexes:
            print(f"\nVector Search Indexes ({len(search_indexes)}):")
            print("-" * 60)

            for idx in search_indexes:
                idx_name = idx.get("name", "unknown")
                idx_type = idx.get("type", "unknown")
                status = idx.get("status", "unknown")

                print(f"\n  Index: {idx_name}")
                print(f"    Type: {idx_type}")
                print(f"    Status: {status}")

                # Parse the definition for vector fields
                definition = idx.get("latestDefinition", idx.get("definition", {}))
                fields = definition.get("fields", [])

                for field in fields:
                    if field.get("type") == "vector":
                        print(f"    Vector Field: {field.get('path')}")
                        print(f"      Dimensions: {field.get('numDimensions')}")
                        print(f"      Similarity: {field.get('similarity')}")

    except Exception as e:
        error_msg = str(e).lower()
        if "mongot" in error_msg or "search" in error_msg:
            print("\n  (Vector search indexes unavailable - mongot not running)")
            logger.debug(f"Vector search index error: {e}")
        else:
            logger.warning(f"Could not list vector search indexes: {e}")


async def inspect_mongodb(
    host: str,
    port: int,
    database: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
    show_sample: bool = True,
) -> None:
    """Inspect MongoDB collections and indexes.

    Args:
        host: MongoDB host
        port: MongoDB port
        database: Database name
        username: Optional username for authentication
        password: Optional password for authentication
        direct_connection: Use directConnection for single-node MongoDB
        show_sample: Whether to show sample documents
    """
    print("=" * 80)
    print("MongoDB Inspection (CE 8.2+ with Native Vector Search)")
    print("=" * 80)
    print(f"Host: {host}:{port}")
    print(f"Database: {database}")
    print(f"Direct Connection: {direct_connection}")
    print("=" * 80)
    print()

    connection_string = _build_connection_string(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
        direct_connection=direct_connection,
    )

    # Connect to MongoDB
    print("Connecting to MongoDB...")
    client = AsyncMongoClient(connection_string)
    db = client[database]

    try:
        # Test connection
        server_info = await client.server_info()
        version = server_info.get("version", "unknown")
        print(f"Connected to MongoDB version: {version}")

        # Check MongoDB version for vector search support
        version_parts = version.split(".")
        if len(version_parts) >= 2:
            major, minor = int(version_parts[0]), int(version_parts[1])
            if major < 8 or (major == 8 and minor < 2):
                print(
                    f"\n[WARN] MongoDB {version} does not support native vector search. "
                    f"MongoDB 8.2+ is required for $vectorSearch."
                )
        print()

        # List all collections
        collections = await db.list_collection_names()
        print(f"Collections ({len(collections)}):")
        print("-" * 80)
        for coll_name in sorted(collections):
            print(f"  - {coll_name}")
        print()

        # Inspect each collection
        for coll_name in sorted(collections):
            print("=" * 80)
            print(f"Collection: {coll_name}")
            print("=" * 80)

            collection = db[coll_name]

            # Count documents
            count = await collection.count_documents({})
            print(f"Document count: {count}")

            # Get collection stats if available
            try:
                stats = await db.command("collStats", coll_name)
                size_bytes = stats.get("size", 0)
                size_mb = size_bytes / (1024 * 1024)
                print(f"Collection size: {size_mb:.2f} MB")
            except Exception:
                pass

            # List regular indexes
            cursor = await collection.list_indexes()
            indexes = await cursor.to_list(None)
            print(f"\nRegular Indexes ({len(indexes)}):")
            print("-" * 60)

            for idx in indexes:
                idx_name = idx.get("name")
                print(f"\n  Index: {idx_name}")

                # Check if it's a legacy DocumentDB-style vector index
                if "vectorOptions" in idx:
                    vector_opts = idx["vectorOptions"]
                    print("    Type: Vector Index (DocumentDB/Atlas style HNSW)")
                    print(f"    Dimensions: {vector_opts.get('dimensions')}")
                    print(f"    Similarity: {vector_opts.get('similarity')}")
                    print(f"    Vector Type: {vector_opts.get('type')}")
                else:
                    print("    Type: Standard Index")
                    if "key" in idx:
                        keys = idx["key"]
                        key_str = ", ".join(f"{k}: {v}" for k, v in keys.items())
                        print(f"    Keys: {{{key_str}}}")

                if idx.get("unique"):
                    print("    Unique: True")

                if idx.get("sparse"):
                    print("    Sparse: True")

            # List vector search indexes (MongoDB CE 8.2+)
            await _inspect_vector_search_indexes(collection, coll_name)

            print()

            # Show sample document (if any exist)
            if show_sample and count > 0:
                print("Sample document:")
                print("-" * 60)
                sample = await collection.find_one({})
                if sample:
                    # Convert ObjectId to string and handle embedding arrays
                    sample_clean: dict[str, object] = {}
                    for key, value in sample.items():
                        if key == "_id":
                            sample_clean[key] = str(value)
                        elif key == "embedding" and isinstance(value, list):
                            # Truncate embedding for display
                            if len(value) > 5:
                                sample_clean[key] = (
                                    f"[{value[0]:.4f}, {value[1]:.4f}, ... "
                                    f"({len(value)} dimensions)]"
                                )
                            else:
                                sample_clean[key] = value
                        else:
                            sample_clean[key] = value

                    print(json.dumps(sample_clean, indent=2, default=str))
                print()

        print("=" * 80)
        print("Inspection complete!")
        print("=" * 80)

    finally:
        await client.close()


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Inspect MongoDB collections and indexes (CE 8.2+ with vector search)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example usage:
    # Inspect local MongoDB
    uv run python -m registry.scripts.inspect-mongodb

    # Inspect with custom host
    DOCUMENTDB_HOST=mongodb.local uv run python -m registry.scripts.inspect-mongodb

    # With authentication (using environment variable)
    uv run python -m registry.scripts.inspect-mongodb --username admin --password "$DOCUMENTDB_PASSWORD"

    # Skip sample documents
    uv run python -m registry.scripts.inspect-mongodb --no-sample
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
        "--no-sample",
        action="store_true",
        help="Skip showing sample documents",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        asyncio.run(
            inspect_mongodb(
                host=args.host,
                port=args.port,
                database=args.database,
                username=args.username,
                password=args.password,
                direct_connection=args.direct_connection,
                show_sample=not args.no_sample,
            )
        )
        return 0
    except Exception as e:
        logger.error(f"ERROR: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())

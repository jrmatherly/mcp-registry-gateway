#!/usr/bin/env python3
"""
Manage MongoDB collections and documents for MCP Gateway Registry.

This script is designed for MongoDB CE 8.2+ for local development.
For AWS DocumentDB, use manage-documentdb.py instead.

Usage:
    # List all collections
    uv run python scripts/manage-mongodb.py list

    # Inspect specific collection
    uv run python scripts/manage-mongodb.py inspect --collection mcp_servers_default

    # Count documents in collection
    uv run python scripts/manage-mongodb.py count --collection mcp_servers_default

    # Search documents in collection
    uv run python scripts/manage-mongodb.py search --collection mcp_servers_default --limit 5

    # Show sample document from collection
    uv run python scripts/manage-mongodb.py sample --collection mcp_servers_default

    # Query with filter
    uv run python scripts/manage-mongodb.py query --collection mcp_servers_default --filter '{"is_enabled": true}'

    # Drop a collection (with confirmation)
    uv run python scripts/manage-mongodb.py drop --collection mcp_scopes_default --confirm

    # Show vector search index status
    uv run python scripts/manage-mongodb.py vector-status --collection mcp_embeddings_1536_default
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from typing import Any

from pymongo import AsyncMongoClient

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


async def _get_client(
    host: str,
    port: int,
    database: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> AsyncMongoClient:
    """Create MongoDB async client."""
    connection_string = _build_connection_string(
        host=host,
        port=port,
        database=database,
        username=username,
        password=password,
        direct_connection=direct_connection,
    )

    return AsyncMongoClient(connection_string)


async def list_collections(
    host: str,
    port: int,
    database: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """List all collections in the MongoDB database."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]

        # Verify connection
        server_info = await client.server_info()
        logger.info(f"Connected to MongoDB {server_info.get('version', 'unknown')}")

        # Get all collection names
        collection_names = await db.list_collection_names()

        if not collection_names:
            logger.info(f"No collections found in database '{database}'")
            await client.close()
            return 0

        # Sort by name
        collection_names.sort()

        print("\n" + "=" * 100)
        print(f"Found {len(collection_names)} collections in database '{database}'")
        print("=" * 100)

        # Get document counts for each collection
        for coll_name in collection_names:
            collection = db[coll_name]
            doc_count = await collection.count_documents({})

            print(f"\nCollection: {coll_name}")
            print(f"  Documents: {doc_count}")

            # Get estimated size (if available)
            try:
                stats = await db.command("collStats", coll_name)
                size_bytes = stats.get("size", 0)
                size_mb = size_bytes / (1024 * 1024)
                print(f"  Size: {size_mb:.2f} MB")
            except Exception:
                pass

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to list collections: {e}", exc_info=True)
        return 1


async def inspect_collection(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Inspect a specific collection (schema and stats)."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        # Check if collection exists
        collection_names = await db.list_collection_names()
        if collection_name not in collection_names:
            logger.error(f"Collection '{collection_name}' does not exist")
            await client.close()
            return 1

        # Get document count
        doc_count = await collection.count_documents({})

        print("\n" + "=" * 100)
        print(f"Collection: {collection_name}")
        print("=" * 100)

        print(f"\nDocument Count: {doc_count}")

        # Get collection stats
        try:
            stats = await db.command("collStats", collection_name)
            print("\n--- Collection Statistics ---")
            print(f"Size: {stats.get('size', 0) / (1024 * 1024):.2f} MB")
            print(f"Storage Size: {stats.get('storageSize', 0) / (1024 * 1024):.2f} MB")
            print(f"Total Index Size: {stats.get('totalIndexSize', 0) / (1024 * 1024):.2f} MB")
            print(f"Average Object Size: {stats.get('avgObjSize', 0)} bytes")
        except Exception as e:
            logger.warning(f"Could not get collection stats: {e}")

        # Get regular indexes
        try:
            cursor = await collection.list_indexes()
            indexes = await cursor.to_list(length=None)
            print("\n--- Regular Indexes ---")
            for idx in indexes:
                print(f"\nIndex: {idx.get('name', 'unknown')}")
                print(f"  Keys: {json.dumps(idx.get('key', {}), indent=4)}")
                if idx.get("unique"):
                    print("  Unique: True")
        except Exception as e:
            logger.warning(f"Could not get indexes: {e}")

        # Get vector search indexes (MongoDB CE 8.2+)
        try:
            search_indexes = []
            # list_search_indexes() returns a coroutine
            cursor = await collection.list_search_indexes()
            async for idx in cursor:
                search_indexes.append(idx)

            if search_indexes:
                print("\n--- Vector Search Indexes ---")
                for idx in search_indexes:
                    print(f"\nIndex: {idx.get('name', 'unknown')}")
                    print(f"  Type: {idx.get('type', 'unknown')}")
                    print(f"  Status: {idx.get('status', 'unknown')}")

                    definition = idx.get("latestDefinition", idx.get("definition", {}))
                    fields = definition.get("fields", [])
                    for field in fields:
                        if field.get("type") == "vector":
                            print(f"  Vector Field: {field.get('path')}")
                            print(f"    Dimensions: {field.get('numDimensions')}")
                            print(f"    Similarity: {field.get('similarity')}")
        except Exception as e:
            error_msg = str(e).lower()
            if "mongot" not in error_msg and "search" not in error_msg:
                logger.warning(f"Could not get search indexes: {e}")

        # Get sample document to infer schema
        try:
            sample_doc = await collection.find_one({})
            if sample_doc:
                print("\n--- Sample Document Schema ---")
                print(json.dumps(_get_schema(sample_doc), indent=2))
        except Exception as e:
            logger.warning(f"Could not get sample document: {e}")

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to inspect collection: {e}", exc_info=True)
        return 1


async def count_documents(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Count documents in a collection."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        # Get document count
        doc_count = await collection.count_documents({})

        print("\n" + "=" * 100)
        print(f"Collection: {collection_name}")
        print(f"Document Count: {doc_count}")
        print("=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to count documents: {e}", exc_info=True)
        return 1


async def search_documents(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    limit: int,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Search/list documents in a collection."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        # Get documents
        cursor = collection.find({}).limit(limit)
        documents = await cursor.to_list(length=limit)

        print("\n" + "=" * 100)
        print(f"Collection: {collection_name}")
        print(f"Showing {len(documents)} documents (limit: {limit})")
        print("=" * 100)

        for i, doc in enumerate(documents, 1):
            print(f"\n--- Document {i} ---")
            # Handle embeddings specially
            doc_display = _format_doc_for_display(doc)
            print(json.dumps(doc_display, indent=2, default=str))

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to search documents: {e}", exc_info=True)
        return 1


async def sample_document(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Show a sample document from a collection."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        # Get one sample document
        sample_doc = await collection.find_one({})

        print("\n" + "=" * 100)
        print(f"Collection: {collection_name}")
        print("Sample Document:")
        print("=" * 100)

        if sample_doc:
            doc_display = _format_doc_for_display(sample_doc)
            print(json.dumps(doc_display, indent=2, default=str))
        else:
            print("No documents found in collection")

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to get sample document: {e}", exc_info=True)
        return 1


async def query_documents(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    filter_json: str,
    limit: int,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Query documents with a filter."""
    try:
        # Parse filter JSON
        filter_dict = json.loads(filter_json)

        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        # Get documents matching filter
        cursor = collection.find(filter_dict).limit(limit)
        documents = await cursor.to_list(length=limit)

        print("\n" + "=" * 100)
        print(f"Collection: {collection_name}")
        print(f"Filter: {filter_json}")
        print(f"Found {len(documents)} documents (limit: {limit})")
        print("=" * 100)

        for i, doc in enumerate(documents, 1):
            print(f"\n--- Document {i} ---")
            doc_display = _format_doc_for_display(doc)
            print(json.dumps(doc_display, indent=2, default=str))

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON filter: {e}")
        return 1
    except Exception as e:
        logger.error(f"Failed to query documents: {e}", exc_info=True)
        return 1


async def drop_collection(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    confirm: bool,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Drop a collection from the database."""
    if not confirm:
        logger.error(
            "Drop operation requires --confirm flag. "
            "This will permanently delete all documents in the collection."
        )
        return 1

    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]

        # Check if collection exists
        collection_names = await db.list_collection_names()
        if collection_name not in collection_names:
            logger.error(f"Collection '{collection_name}' does not exist")
            await client.close()
            return 1

        # Get document count before dropping
        collection = db[collection_name]
        doc_count = await collection.count_documents({})

        print("\n" + "=" * 100)
        print(f"Dropping collection: {collection_name}")
        print(f"Documents to be deleted: {doc_count}")
        print("=" * 100)

        # Drop the collection
        await db.drop_collection(collection_name)

        logger.info(f"Successfully dropped collection '{collection_name}'")
        print(f"\nCollection '{collection_name}' has been dropped.")
        print("=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to drop collection: {e}", exc_info=True)
        return 1


async def vector_status(
    host: str,
    port: int,
    database: str,
    collection_name: str,
    username: str | None,
    password: str | None,
    direct_connection: bool,
) -> int:
    """Show vector search index status for a collection."""
    try:
        client = await _get_client(host, port, database, username, password, direct_connection)

        db = client[database]
        collection = db[collection_name]

        print("\n" + "=" * 100)
        print(f"Vector Search Index Status: {collection_name}")
        print("=" * 100)

        try:
            search_indexes = []
            # list_search_indexes() returns a coroutine
            cursor = await collection.list_search_indexes()
            async for idx in cursor:
                search_indexes.append(idx)

            if not search_indexes:
                print("\nNo vector search indexes found.")
                print("(mongot process may not be running or indexes not created)")
            else:
                for idx in search_indexes:
                    print(f"\nIndex: {idx.get('name', 'unknown')}")
                    print(f"  Type: {idx.get('type', 'unknown')}")
                    print(f"  Status: {idx.get('status', 'unknown')}")
                    print(f"  Queryable: {idx.get('queryable', 'unknown')}")

                    definition = idx.get("latestDefinition", idx.get("definition", {}))
                    fields = definition.get("fields", [])

                    print("  Fields:")
                    for field in fields:
                        field_type = field.get("type", "unknown")
                        path = field.get("path", "unknown")
                        print(f"    - {path} ({field_type})")

                        if field_type == "vector":
                            print(f"        Dimensions: {field.get('numDimensions')}")
                            print(f"        Similarity: {field.get('similarity')}")

        except Exception as e:
            error_msg = str(e).lower()
            if "mongot" in error_msg or "search" in error_msg:
                print("\nVector search indexes unavailable.")
                print("The mongot process is not running alongside mongod.")
                print("\nTo enable vector search in MongoDB CE 8.2+:")
                print("  1. Ensure mongot binary is available")
                print("  2. Start mongot alongside your mongod process")
                print("  3. Configure replica set (required for search indexes)")
            else:
                logger.error(f"Failed to get vector search status: {e}")
                return 1

        print("\n" + "=" * 100)

        await client.close()
        return 0

    except Exception as e:
        logger.error(f"Failed to get vector status: {e}", exc_info=True)
        return 1


def _get_schema(doc: dict[str, Any], prefix: str = "") -> dict[str, str]:
    """Infer schema from a document."""
    schema = {}

    for key, value in doc.items():
        full_key = f"{prefix}.{key}" if prefix else key

        if isinstance(value, dict):
            schema.update(_get_schema(value, full_key))
        elif isinstance(value, list):
            if value and isinstance(value[0], dict):
                schema[full_key] = "array[object]"
            else:
                schema[full_key] = f"array[{type(value[0]).__name__ if value else 'unknown'}]"
        else:
            schema[full_key] = type(value).__name__

    return schema


def _format_doc_for_display(doc: dict[str, Any]) -> dict[str, Any]:
    """Format a document for display, handling special fields like embeddings."""
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result[key] = str(value)
        elif key == "embedding" and isinstance(value, list):
            # Truncate embedding for display
            if len(value) > 5:
                result[key] = f"[{value[0]:.4f}, {value[1]:.4f}, ... ({len(value)} dimensions)]"
            else:
                result[key] = value
        else:
            result[key] = value
    return result


async def main() -> int:
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Manage MongoDB collections for MCP Gateway Registry (CE 8.2+)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # List all collections
    uv run python scripts/manage-mongodb.py list

    # Inspect a collection
    uv run python scripts/manage-mongodb.py inspect --collection mcp_servers_default

    # Count documents
    uv run python scripts/manage-mongodb.py count --collection mcp_servers_default

    # Search documents
    uv run python scripts/manage-mongodb.py search --collection mcp_servers_default --limit 5

    # Sample document
    uv run python scripts/manage-mongodb.py sample --collection mcp_servers_default

    # Query with filter
    uv run python scripts/manage-mongodb.py query --collection mcp_servers_default --filter '{"is_enabled": true}'

    # Check vector search index status
    uv run python scripts/manage-mongodb.py vector-status --collection mcp_embeddings_1536_default
""",
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # List command
    subparsers.add_parser("list", help="List all collections")

    # Inspect command
    inspect_parser = subparsers.add_parser("inspect", help="Inspect a collection")
    inspect_parser.add_argument("--collection", required=True, help="Collection name")

    # Count command
    count_parser = subparsers.add_parser("count", help="Count documents in collection")
    count_parser.add_argument("--collection", required=True, help="Collection name")

    # Search command
    search_parser = subparsers.add_parser("search", help="Search documents")
    search_parser.add_argument("--collection", required=True, help="Collection name")
    search_parser.add_argument(
        "--limit", type=int, default=10, help="Number of documents to return"
    )

    # Sample command
    sample_parser = subparsers.add_parser("sample", help="Show sample document")
    sample_parser.add_argument("--collection", required=True, help="Collection name")

    # Query command
    query_parser = subparsers.add_parser("query", help="Query with filter")
    query_parser.add_argument("--collection", required=True, help="Collection name")
    query_parser.add_argument("--filter", required=True, help="MongoDB filter as JSON")
    query_parser.add_argument("--limit", type=int, default=10, help="Number of documents to return")

    # Drop command
    drop_parser = subparsers.add_parser("drop", help="Drop a collection")
    drop_parser.add_argument("--collection", required=True, help="Collection name to drop")
    drop_parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirm the drop operation (required)",
    )

    # Vector status command
    vector_parser = subparsers.add_parser("vector-status", help="Show vector search index status")
    vector_parser.add_argument("--collection", required=True, help="Collection name")

    # Common arguments
    parser.add_argument(
        "--host",
        default=os.getenv("DOCUMENTDB_HOST", "localhost"),
        help="MongoDB host",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("DOCUMENTDB_PORT", "27017")),
        help="MongoDB port",
    )
    parser.add_argument(
        "--database",
        default=os.getenv("DOCUMENTDB_DATABASE", "mcp_registry"),
        help="Database name",
    )
    parser.add_argument(
        "--username",
        default=os.getenv("DOCUMENTDB_USERNAME"),
        help="MongoDB username",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("DOCUMENTDB_PASSWORD"),
        help="MongoDB password",
    )
    parser.add_argument(
        "--direct-connection",
        action="store_true",
        default=os.getenv("DOCUMENTDB_DIRECT_CONNECTION", "true").lower() == "true",
        help="Use directConnection for single-node MongoDB (default: true)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if not args.command:
        parser.print_help()
        return 1

    logger.info(f"Executing command: {args.command}")
    logger.info(f"Host: {args.host}:{args.port}")
    logger.info(f"Database: {args.database}")

    try:
        if args.command == "list":
            return await list_collections(
                args.host,
                args.port,
                args.database,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "inspect":
            return await inspect_collection(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "count":
            return await count_documents(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "search":
            return await search_documents(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.limit,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "sample":
            return await sample_document(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "query":
            return await query_documents(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.filter,
                args.limit,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "drop":
            return await drop_collection(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.confirm,
                args.username,
                args.password,
                args.direct_connection,
            )
        elif args.command == "vector-status":
            return await vector_status(
                args.host,
                args.port,
                args.database,
                args.collection,
                args.username,
                args.password,
                args.direct_connection,
            )
        else:
            logger.error(f"Unknown command: {args.command}")
            return 1

    except Exception as e:
        logger.error(f"Command failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

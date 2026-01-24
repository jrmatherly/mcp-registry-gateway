#!/usr/bin/env python3
"""
Initialize MongoDB CE for local development.

This script:
1. Initializes replica set (rs0) using authenticated connection
2. Creates collections and indexes
3. Loads default admin scopes from JSON files

Prerequisites:
- MongoDB must be started with MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD
  environment variables, which automatically create the admin user on first startup.
- The same credentials must be passed via DOCUMENTDB_USERNAME/PASSWORD.

Usage:
    python init-mongodb-ce.py

Environment Variables:
    DOCUMENTDB_HOST: MongoDB host (default: mongodb)
    DOCUMENTDB_PORT: MongoDB port (default: 27017)
    DOCUMENTDB_DATABASE: Database name (default: mcp_registry)
    DOCUMENTDB_USERNAME: Admin username for auth (default: admin)
    DOCUMENTDB_PASSWORD: Admin password for auth (default: admin)
    DOCUMENTDB_NAMESPACE: Collection namespace suffix (default: default)
"""

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

from pymongo import ASCENDING, AsyncMongoClient
from pymongo.errors import ServerSelectionTimeoutError

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


def _get_config_from_env() -> dict:
    """Get MongoDB CE configuration from environment variables."""
    return {
        "host": os.getenv("DOCUMENTDB_HOST", "mongodb"),
        "port": int(os.getenv("DOCUMENTDB_PORT", "27017")),
        "database": os.getenv("DOCUMENTDB_DATABASE", "mcp_registry"),
        "namespace": os.getenv("DOCUMENTDB_NAMESPACE", "default"),
        "username": os.getenv("DOCUMENTDB_USERNAME", ""),
        "password": os.getenv("DOCUMENTDB_PASSWORD", ""),
        "replicaset": os.getenv("DOCUMENTDB_REPLICA_SET", "rs0"),
    }


def _initialize_replica_set(
    host: str,
    port: int,
    username: str,
    password: str,
) -> None:
    """Initialize MongoDB replica set using pymongo (synchronous).

    When MongoDB is started with --auth and MONGO_INITDB_ROOT_* environment variables,
    the Docker entrypoint creates the admin user automatically. This function then
    connects WITH authentication to initialize the replica set if needed.
    """
    from pymongo import MongoClient
    from pymongo.errors import OperationFailure

    logger.info("Checking/initializing MongoDB replica set...")

    try:
        # Connect WITH authentication (user created by MONGO_INITDB_ROOT_*)
        client = MongoClient(
            f"mongodb://{username}:{password}@{host}:{port}/?authSource=admin",
            serverSelectionTimeoutMS=10000,
            directConnection=True,
        )

        # Check replica set status
        try:
            status = client.admin.command("replSetGetStatus")
            logger.info(
                f"Replica set already initialized, state: {status.get('myState', 'unknown')}"
            )
            client.close()
            return
        except OperationFailure as e:
            error_msg = str(e).lower()
            if "no replset config has been received" in error_msg:
                logger.info("Replica set not yet initialized, proceeding...")
            else:
                raise

        # Initialize replica set
        config = {"_id": "rs0", "members": [{"_id": 0, "host": f"{host}:{port}"}]}
        result = client.admin.command("replSetInitiate", config)
        logger.info(f"Replica set initialized: {result}")

        # Wait for replica set to elect primary
        logger.info("Waiting for replica set to elect primary...")
        time.sleep(10)

        client.close()

    except Exception as e:
        logger.error(f"Error initializing replica set: {e}")
        raise


async def _create_standard_indexes(
    collection,
    collection_name: str,
    namespace: str,
) -> None:
    """Create standard indexes for collections."""
    full_name = f"{collection_name}_{namespace}"

    if collection_name == COLLECTION_SERVERS:
        # Note: path is stored as _id, so no separate path index needed
        await collection.create_index([("enabled", ASCENDING)])
        await collection.create_index([("tags", ASCENDING)])
        await collection.create_index([("manifest.serverInfo.name", ASCENDING)])
        logger.info(f"Created indexes for {full_name}")

    elif collection_name == COLLECTION_AGENTS:
        # Note: path is stored as _id, so no separate path index needed
        await collection.create_index([("enabled", ASCENDING)])
        await collection.create_index([("tags", ASCENDING)])
        await collection.create_index([("card.name", ASCENDING)])
        logger.info(f"Created indexes for {full_name}")

    elif collection_name == COLLECTION_SCOPES:
        # No additional indexes needed - scopes use _id as primary key
        # group_mappings is an array, not indexed
        logger.info(f"Created indexes for {full_name}")

    elif collection_name == COLLECTION_EMBEDDINGS:
        # Note: path is stored as _id, so no separate path index needed
        await collection.create_index([("entity_type", ASCENDING)])
        logger.info(f"Created indexes for {full_name} (vector search via app code)")

    elif collection_name == COLLECTION_SECURITY_SCANS:
        await collection.create_index([("server_path", ASCENDING)])
        await collection.create_index([("scan_status", ASCENDING)])
        await collection.create_index([("scanned_at", ASCENDING)])
        logger.info(f"Created indexes for {full_name}")

    elif collection_name == COLLECTION_FEDERATION_CONFIG:
        await collection.create_index([("registry_name", ASCENDING)], unique=True)
        await collection.create_index([("enabled", ASCENDING)])
        logger.info(f"Created indexes for {full_name}")


async def _load_default_scopes(
    db,
    namespace: str,
) -> None:
    """Load default scopes from JSON files into scopes collection.

    This loads all scope JSON files from the scripts directory:
    - registry-admins.json: Bootstrap admin scope with full permissions
    - mcp-registry-admin.json: MCP registry admin scope (Keycloak group)
    - mcp-servers-unrestricted-read.json: Read-only access to all servers
    - mcp-servers-unrestricted-execute.json: Full CRUD access to all servers
    """
    collection_name = f"{COLLECTION_SCOPES}_{namespace}"
    collection = db[collection_name]

    # Find scope files in the same directory as this script
    script_dir = Path(__file__).parent

    # List of scope files to load (order matters - base scopes first)
    scope_files = [
        "registry-admins.json",
        "mcp-registry-admin.json",
        "mcp-servers-unrestricted-read.json",
        "mcp-servers-unrestricted-execute.json",
    ]

    loaded_count = 0
    for scope_filename in scope_files:
        scope_file = script_dir / scope_filename

        if not scope_file.exists():
            logger.warning(f"Scope file not found: {scope_file}")
            continue

        try:
            with open(scope_file) as f:
                scope_data = json.load(f)

            logger.info(f"Loading scope from {scope_filename}")

            # Upsert the scope document
            result = await collection.update_one(
                {"_id": scope_data["_id"]}, {"$set": scope_data}, upsert=True
            )

            if result.upserted_id:
                logger.info(f"Inserted scope: {scope_data['_id']}")
                loaded_count += 1
            elif result.modified_count > 0:
                logger.info(f"Updated scope: {scope_data['_id']}")
                loaded_count += 1
            else:
                logger.info(f"Scope already up-to-date: {scope_data['_id']}")

            if "group_mappings" in scope_data:
                logger.info(f"  group_mappings: {scope_data.get('group_mappings', [])}")

        except Exception as e:
            logger.error(f"Failed to load scope from {scope_filename}: {e}", exc_info=True)

    logger.info(f"Loaded {loaded_count} scopes into {collection_name}")


async def _initialize_mongodb_ce() -> None:
    """Main initialization function."""
    config = _get_config_from_env()

    logger.info("=" * 60)
    logger.info("MongoDB CE Initialization for MCP Gateway")
    logger.info("=" * 60)
    logger.info(f"Host: {config['host']}:{config['port']}")
    logger.info(f"Database: {config['database']}")
    logger.info(f"Namespace: {config['namespace']}")
    logger.info("")

    # Wait for MongoDB to be ready
    logger.info("Waiting for MongoDB to be ready...")
    time.sleep(10)

    # Initialize replica set (synchronous) - user is created by MONGO_INITDB_ROOT_* env vars
    _initialize_replica_set(config["host"], config["port"], config["username"], config["password"])

    # Connect with motor for async operations
    connection_string = f"mongodb://{config['username']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}?replicaSet={config['replicaset']}&authMechanism=SCRAM-SHA-256&authSource=admin"
    try:
        client = AsyncMongoClient(
            connection_string,
            serverSelectionTimeoutMS=10000,
        )

        # Verify connection
        await client.admin.command("ping")
        logger.info("Connected to MongoDB successfully")

        db = client[config["database"]]
        namespace = config["namespace"]

        # Create collections and indexes
        logger.info("Creating collections and indexes...")

        collections = [
            COLLECTION_SERVERS,
            COLLECTION_AGENTS,
            COLLECTION_SCOPES,
            COLLECTION_EMBEDDINGS,
            COLLECTION_SECURITY_SCANS,
            COLLECTION_FEDERATION_CONFIG,
        ]

        for coll_name in collections:
            full_name = f"{coll_name}_{namespace}"

            # Check if collection already exists
            existing_collections = await db.list_collection_names()

            if full_name in existing_collections:
                logger.info(f"Collection {full_name} already exists, skipping creation")
            else:
                logger.info(f"Creating collection: {full_name}")
                await db.create_collection(full_name)

            # Create indexes (idempotent - MongoDB handles duplicates)
            collection = db[full_name]
            await _create_standard_indexes(collection, coll_name, namespace)

        # Load default admin scope
        await _load_default_scopes(db, namespace)

        logger.info("")
        logger.info("=" * 60)
        logger.info("MongoDB CE Initialization Complete!")
        logger.info("=" * 60)
        logger.info("Collections created:")
        for coll_name in collections:
            if coll_name == COLLECTION_EMBEDDINGS:
                logger.info(f"  - {coll_name}_{namespace} (with vector search)")
            else:
                logger.info(f"  - {coll_name}_{namespace}")
        logger.info("")
        logger.info("To use MongoDB CE:")
        logger.info("  export STORAGE_BACKEND=mongodb-ce")
        logger.info("  docker-compose up registry")
        logger.info("")
        logger.info("Or for AWS DocumentDB:")
        logger.info("  export STORAGE_BACKEND=documentdb")
        logger.info("  docker-compose up registry")
        logger.info("=" * 60)

        await client.close()

    except ServerSelectionTimeoutError as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        logger.error("Make sure MongoDB is running and accessible")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        raise


def main() -> None:
    """Entry point."""
    asyncio.run(_initialize_mongodb_ce())


if __name__ == "__main__":
    main()

import secrets
from datetime import UTC
from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",  # Ignore extra environment variables
    )

    # Auth settings
    secret_key: str = ""
    admin_user: str = "admin"
    admin_password: str = "password"
    session_cookie_name: str = "mcp_gateway_session"
    session_max_age_seconds: int = 60 * 60 * 8  # 8 hours
    session_cookie_secure: bool = False  # Set to True in production with HTTPS
    session_cookie_domain: str | None = None  # e.g., ".example.com" for cross-subdomain sharing
    auth_server_url: str = "http://localhost:8888"
    auth_server_external_url: str = "http://localhost:8888"  # External URL for OAuth redirects

    # Global LLM settings (defaults for all LLM operations)
    llm_provider: str = "litellm"
    llm_model: str = "openai/gpt-4o-mini"
    llm_api_key: str | None = None
    llm_api_base: str | None = None

    # Embeddings settings [Default]
    embeddings_provider: str = "sentence-transformers"  # 'sentence-transformers' or 'litellm'
    embeddings_model_name: str = "all-MiniLM-L6-v2"
    embeddings_model_dimensions: int = 384  # 384 for default and 1024 for bedrock titan v2

    # LiteLLM-specific settings (only used when embeddings_provider='litellm')
    # For Bedrock: Set to None and configure AWS credentials via standard methods
    # (IAM roles, AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars, or ~/.aws/credentials)
    embeddings_api_key: str | None = None
    embeddings_secret_key: str | None = None
    embeddings_api_base: str | None = None
    embeddings_aws_region: str | None = "us-east-1"

    # Health check settings
    health_check_interval_seconds: int = (
        300  # 5 minutes for automatic background checks (configurable via env var)
    )
    health_check_timeout_seconds: int = 2  # Very fast timeout for user-driven actions

    # WebSocket performance settings
    max_websocket_connections: int = 100  # Reasonable limit for development/testing
    websocket_send_timeout_seconds: float = 2.0  # Allow slightly more time per connection
    websocket_broadcast_interval_ms: int = 10  # Very responsive - 10ms minimum between broadcasts
    websocket_max_batch_size: int = 20  # Smaller batches for faster updates
    websocket_cache_ttl_seconds: int = 1  # 1 second cache for near real-time user feedback

    # Well-known discovery settings
    enable_wellknown_discovery: bool = True
    wellknown_cache_ttl: int = 300  # 5 minutes

    # Security scanning settings (MCP Servers)
    security_scan_enabled: bool = True
    security_scan_on_registration: bool = True
    security_block_unsafe_servers: bool = True
    security_analyzers: str = "yara"  # Comma-separated: yara, llm, or yara,llm
    security_scan_timeout: int = 60  # 1 minutes
    security_add_pending_tag: bool = True
    mcp_scanner_llm_api_key: str = ""  # Optional LLM API key for advanced analysis
    mcp_scanner_llm_model: str = "openai/gpt-4o-mini"  # LLM model for security analysis
    mcp_scanner_llm_base_url: str | None = None  # Custom LLM base URL (mcp-scanner convention)

    # Agent security scanning settings (A2A Agents)
    agent_security_scan_enabled: bool = True
    agent_security_scan_on_registration: bool = True
    agent_security_block_unsafe_agents: bool = True
    agent_security_analyzers: str = (
        "yara,spec"  # Comma-separated: yara, spec, heuristic, llm, endpoint
    )
    agent_security_scan_timeout: int = 60  # 1 minute
    agent_security_add_pending_tag: bool = True
    a2a_scanner_llm_api_key: str = ""  # Optional Azure OpenAI API key for LLM-based analysis
    a2a_scanner_llm_model: str = "openai/gpt-4o-mini"  # LLM model for agent security analysis
    a2a_scanner_llm_api_base: str | None = None  # Custom API base URL (e.g., LiteLLM proxy)

    # Storage Backend Configuration
    # Options:
    #   - "file": File-based storage with FAISS for vector search
    #   - "documentdb": AWS DocumentDB with $search.vectorSearch
    #   - "mongodb-ce": MongoDB CE < 8.2 with client-side vector similarity
    #   - "mongodb": MongoDB CE 8.2+ with native $vectorSearch (requires mongot)
    storage_backend: str = "file"

    # MongoDB CE 8.2 Vector Search Configuration (only used when storage_backend="mongodb-ce-82")
    # Enables native $vectorSearch aggregation stage instead of keyword-based search
    mongodb_ce_82_native_search: bool = True
    # Name of the vector search index created via SearchIndexModel
    mongodb_vector_index_name: str = "vector_index"
    # Multiplier for numCandidates in $vectorSearch (numCandidates = limit * multiplier)
    mongodb_vector_num_candidates_multiplier: int = 10
    # Similarity metric for vector search: "cosine", "euclidean", or "dotProduct"
    mongodb_vector_similarity_metric: str = "cosine"

    # DocumentDB Configuration (only used when storage_backend="documentdb")
    documentdb_host: str = "localhost"
    documentdb_port: int = 27017
    documentdb_database: str = "mcp_registry"
    documentdb_username: str | None = None
    documentdb_password: str | None = None
    documentdb_use_tls: bool = True
    documentdb_tls_ca_file: str = "global-bundle.pem"
    documentdb_use_iam: bool = False
    documentdb_replica_set: str | None = None
    documentdb_read_preference: str = "secondaryPreferred"
    documentdb_direct_connection: bool = False  # Set to True only for single-node MongoDB (tests)

    # DocumentDB Namespace (for multi-tenancy support)
    documentdb_namespace: str = "default"

    # Container paths - adjust for local development
    container_app_dir: Path = Path("/app")
    container_registry_dir: Path = Path("/app/registry")
    container_log_dir: Path = Path("/app/logs")

    # Local development mode detection
    @property
    def is_local_dev(self) -> bool:
        """Check if running in local development mode."""
        return not Path("/app").exists()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Generate secret key if not provided
        if not self.secret_key:
            self.secret_key = secrets.token_hex(32)

    @property
    def embeddings_model_dir(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / "registry" / "models" / self.embeddings_model_name
        return self.container_registry_dir / "models" / self.embeddings_model_name

    @property
    def servers_dir(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / "registry" / "servers"
        return self.container_registry_dir / "servers"

    @property
    def static_dir(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / "registry" / "static"
        return self.container_registry_dir / "static"

    @property
    def templates_dir(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / "registry" / "templates"
        return self.container_registry_dir / "templates"

    @property
    def nginx_config_path(self) -> Path:
        return Path("/etc/nginx/conf.d/nginx_rev_proxy.conf")

    @property
    def state_file_path(self) -> Path:
        return self.servers_dir / "server_state.json"

    @property
    def log_dir(self) -> Path:
        """Get log directory based on environment."""
        if self.is_local_dev:
            return Path.cwd() / "logs"
        return self.container_log_dir

    @property
    def log_file_path(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / "logs" / "registry.log"
        return self.container_log_dir / "registry.log"

    @property
    def faiss_index_path(self) -> Path:
        return self.servers_dir / "service_index.faiss"

    @property
    def faiss_metadata_path(self) -> Path:
        return self.servers_dir / "service_index_metadata.json"

    @property
    def dotenv_path(self) -> Path:
        if self.is_local_dev:
            return Path.cwd() / ".env"
        return self.container_registry_dir / ".env"

    @property
    def agents_dir(self) -> Path:
        """Directory for agent card storage."""
        if self.is_local_dev:
            return Path.cwd() / "registry" / "agents"
        return self.container_registry_dir / "agents"

    @property
    def agent_state_file_path(self) -> Path:
        """Path to agent state file (enabled/disabled tracking)."""
        return self.agents_dir / "agent_state.json"

    # --- Effective LLM settings with fallback logic ---

    @property
    def effective_embeddings_api_key(self) -> str | None:
        """Get embeddings API key, falling back to global LLM API key."""
        return self.embeddings_api_key or self.llm_api_key

    @property
    def effective_embeddings_api_base(self) -> str | None:
        """Get embeddings API base, falling back to global LLM API base."""
        return self.embeddings_api_base or self.llm_api_base

    @property
    def effective_mcp_scanner_api_key(self) -> str | None:
        """Get MCP scanner API key, falling back to global LLM API key."""
        return self.mcp_scanner_llm_api_key or self.llm_api_key

    @property
    def effective_mcp_scanner_base_url(self) -> str | None:
        """Get MCP scanner base URL, falling back to global LLM API base."""
        return self.mcp_scanner_llm_base_url or self.llm_api_base

    @property
    def effective_a2a_scanner_api_key(self) -> str | None:
        """Get A2A scanner API key, falling back to global LLM API key."""
        return self.a2a_scanner_llm_api_key or self.llm_api_key

    @property
    def effective_a2a_scanner_api_base(self) -> str | None:
        """Get A2A scanner API base, falling back to global LLM API base."""
        return self.a2a_scanner_llm_api_base or self.llm_api_base

    @property
    def effective_mcp_scanner_model(self) -> str:
        """Get MCP scanner model, falling back to global LLM model."""
        return self.mcp_scanner_llm_model or self.llm_model

    @property
    def effective_a2a_scanner_model(self) -> str:
        """Get A2A scanner model, falling back to global LLM model."""
        return self.a2a_scanner_llm_model or self.llm_model


class EmbeddingConfig:
    """Helper class for embedding configuration and metadata generation."""

    def __init__(self, settings_instance: Settings):
        self.settings = settings_instance

    @property
    def model_family(self) -> str:
        """Extract model family from model name.

        Examples:
            - "openai/text-embedding-ada-002" -> "openai"
            - "all-MiniLM-L6-v2" -> "sentence-transformers"
            - "amazon.titan-embed-text-v2:0" -> "amazon-bedrock"
        """
        model_name = self.settings.embeddings_model_name

        if "/" in model_name:
            # Format: "provider/model-name"
            return model_name.split("/")[0]
        elif "amazon." in model_name or "titan" in model_name.lower():
            return "amazon-bedrock"
        elif self.settings.embeddings_provider == "litellm":
            return "litellm"
        else:
            return self.settings.embeddings_provider

    @property
    def index_name(self) -> str:
        """Generate dimension-specific collection/index name.

        Returns index name in format: mcp-embeddings-{dimensions}-{namespace}
        Example: mcp-embeddings-1536-default
        """
        base_name = "mcp-embeddings"
        dimensions = self.settings.embeddings_model_dimensions
        namespace = self.settings.documentdb_namespace

        # Replace base name with dimension-specific name
        return f"{base_name}-{dimensions}-{namespace}"

    def get_embedding_metadata(self) -> dict:
        """Generate embedding metadata for document storage.

        Returns:
            Dictionary with embedding metadata including:
            - provider: Embedding provider (e.g., "litellm", "sentence-transformers")
            - model: Full model name
            - model_family: Extracted model family
            - dimensions: Embedding dimension count
            - version: Model version (extracted if available, else "v1")
            - created_at: Current timestamp in ISO format
            - indexing_strategy: Search strategy (currently "hybrid")
        """
        from datetime import datetime

        model_name = self.settings.embeddings_model_name

        # Extract version if present in model name
        version = "v1"
        if "v2" in model_name.lower():
            version = "v2"
        elif "v3" in model_name.lower():
            version = "v3"
        elif "ada-002" in model_name:
            version = "ada-002"

        return {
            "provider": self.settings.embeddings_provider,
            "model": model_name,
            "model_family": self.model_family,
            "dimensions": self.settings.embeddings_model_dimensions,
            "version": version,
            "created_at": datetime.now(UTC).isoformat(),
            "indexing_strategy": "hybrid",
        }


# Global settings instance
settings = Settings()

# Global embedding config instance
embedding_config = EmbeddingConfig(settings)

"""Application configuration with validation using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration with environment variable support and validation."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database settings
    SQLITE_DB_PATH: str = Field(
        default="/var/lib/sqlite/metrics.db",
        description="Path to SQLite database file",
    )
    METRICS_RETENTION_DAYS: int = Field(
        default=90,
        ge=1,
        le=3650,
        description="Number of days to retain metrics data",
    )
    DB_CONNECTION_TIMEOUT: int = Field(
        default=30,
        ge=1,
        le=300,
        description="Database connection timeout in seconds",
    )
    DB_MAX_RETRIES: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum database connection retries",
    )

    # Service settings
    METRICS_SERVICE_PORT: int = Field(
        default=8890,
        ge=1,
        le=65535,
        description="Port for metrics service",
    )
    METRICS_SERVICE_HOST: str = Field(
        default="0.0.0.0",
        description="Host address for metrics service",
    )

    # OpenTelemetry settings
    OTEL_SERVICE_NAME: str = Field(
        default="mcp-metrics-service",
        description="OpenTelemetry service name",
    )
    OTEL_PROMETHEUS_ENABLED: bool = Field(
        default=True,
        description="Enable Prometheus metrics export",
    )
    OTEL_PROMETHEUS_PORT: int = Field(
        default=9465,
        ge=1,
        le=65535,
        description="Port for Prometheus metrics endpoint",
    )
    OTEL_OTLP_ENDPOINT: str | None = Field(
        default=None,
        description="OpenTelemetry OTLP endpoint URL",
    )

    # API Security
    METRICS_RATE_LIMIT: int = Field(
        default=1000,
        ge=1,
        le=100000,
        description="Default rate limit (requests per minute)",
    )
    API_KEY_HASH_ALGORITHM: str = Field(
        default="sha256",
        description="Hash algorithm for API keys",
    )

    # Performance
    BATCH_SIZE: int = Field(
        default=100,
        ge=1,
        le=10000,
        description="Batch size for metrics processing",
    )
    FLUSH_INTERVAL_SECONDS: int = Field(
        default=30,
        ge=1,
        le=3600,
        description="Interval for flushing metrics buffer",
    )
    MAX_REQUEST_SIZE: str = Field(
        default="10MB",
        description="Maximum request body size",
    )

    # Background task intervals (extracted from magic numbers)
    RATE_LIMIT_CLEANUP_INTERVAL_SECONDS: int = Field(
        default=3600,
        ge=60,
        le=86400,
        description="Interval for rate limit bucket cleanup (default: 1 hour)",
    )
    RETENTION_CLEANUP_INTERVAL_SECONDS: int = Field(
        default=86400,
        ge=3600,
        le=604800,
        description="Interval for data retention cleanup (default: 24 hours)",
    )
    METRICS_FLUSH_INTERVAL_SECONDS: int = Field(
        default=5,
        ge=1,
        le=300,
        description="Interval for metrics buffer flush (default: 5 seconds)",
    )

    @property
    def DATABASE_URL(self) -> str:
        """Generate database URL from path."""
        return f"sqlite:///{self.SQLITE_DB_PATH}"


settings = Settings()

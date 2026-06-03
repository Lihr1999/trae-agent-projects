from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "消防演练疏散模拟系统"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "消防演练疏散模拟后端API"
    DATABASE_URL: str = "sqlite:///./fire_drill.db"
    SECRET_KEY: str = "fire-drill-evacuation-sim-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]
    API_V1_PREFIX: str = "/api/v1"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

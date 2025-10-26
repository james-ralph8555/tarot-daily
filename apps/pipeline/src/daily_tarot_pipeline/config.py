from __future__ import annotations
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class EnvironmentSettings(BaseSettings):
    """Pipeline environment variables."""

    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    groq_api_base: str = Field("https://api.groq.com/openai/v1", env="GROQ_API_BASE")
    groq_dev_model: Literal["groq/openai/gpt-oss-20b", "groq/openai/gpt-oss-120b"] = Field(
        "groq/openai/gpt-oss-20b", env="GROQ_DEV_MODEL"
    )
    groq_prod_model: Literal["groq/openai/gpt-oss-20b", "groq/openai/gpt-oss-120b"] = Field(
        "groq/openai/gpt-oss-120b", env="GROQ_PROD_MODEL"
    )
    postgres_host: str = Field("localhost", env="POSTGRES_HOST")
    postgres_port: int = Field(5432, env="POSTGRES_PORT")
    postgres_user: str = Field("tarot", env="POSTGRES_USER")
    postgres_password: str = Field("tarot123", env="POSTGRES_PASSWORD")
    postgres_database: str = Field("daily_tarot", env="POSTGRES_DB")
    prompt_workspace: Path = Field(Path("var/prompts"), env="PROMPT_WORKSPACE")
    dataset_workspace: Path = Field(Path("var/datasets"), env="DATASET_WORKSPACE")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class PromptVersion(BaseModel):
    id: str
    status: Literal["draft", "candidate", "promoted", "rolled_back"]
    optimizer: str


@lru_cache()
def get_settings() -> EnvironmentSettings:
    settings = EnvironmentSettings()
    settings.prompt_workspace.mkdir(parents=True, exist_ok=True)
    settings.dataset_workspace.mkdir(parents=True, exist_ok=True)
    return settings


def groq_headers(api_key: str | None = None) -> dict[str, str]:
    key = api_key or get_settings().groq_api_key
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

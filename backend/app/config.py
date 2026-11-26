from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "super_secret_jwt_key_change_me_in_production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    class Config:
        env_file = ".env"

settings = Settings()
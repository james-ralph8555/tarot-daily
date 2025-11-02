uv run --with mlflow mlflow server \
        --host 0.0.0.0 \
        --port 5000 \
        --backend-store-uri sqlite:///./data/mlflow.db \
        --default-artifact-root ./data/mlartifacts \
        --serve-artifacts 

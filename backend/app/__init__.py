from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db, bcrypt
from minio import Minio
import os


minio_client = Minio(
    os.getenv("MINIO_ENDPOINT", "minio:9000"),
    access_key=os.getenv("MINIO_ROOT_USER", "minioadmin"),
    secret_key=os.getenv("MINIO_ROOT_PASSWORD", "minioadmin"),
    secure=False
)
BUCKET_NAME = "marketing-images"


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, supports_credentials=True, origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
    ])

    db.init_app(app)
    bcrypt.init_app(app)

    @app.before_request
    def ensure_minio_is_ready():
        if not hasattr(app, 'minio_checked'):
            try:
                if not minio_client.bucket_exists(BUCKET_NAME):
                    minio_client.make_bucket(BUCKET_NAME)
                app.minio_checked = True
                print("Successfully connected to MinIO and verified bucket.")
            except Exception as e:
                print(f"MinIO initialization failed: {e}")

    from app.routes import register_routes
    register_routes(app)

    with app.app_context():
        db.create_all()

    return app

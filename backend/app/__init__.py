from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.extensions import db, bcrypt,minio_client,BUCKET_NAME
import os


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

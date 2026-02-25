from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt  # 確保有這行

db = SQLAlchemy()
bcrypt = Bcrypt()  # 確保有這行，且名稱全是小寫
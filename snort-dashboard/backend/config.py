import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'snort-dashboard-secret-key'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://snort:snort@localhost/snort'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key'
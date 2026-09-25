import os

from  dotenv import load_dotenv
from flask import Flask

def create_app():
    load_dotenv()
    
    app =  Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static"
    )
    app.secret_key = os.getenv("FLASK_SECRET_KEY")
    
    

    from .routes.pages import pages_bp
    from .routes.auth import auth_bp
    from .routes.chats import chats_bp
    
    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(chats_bp)
    
    return app
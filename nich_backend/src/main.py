# src/main.py

import os
import sys
# DON\'T CHANGE THIS !!!
# Adiciona o diretório pai ao sys.path para permitir importações absolutas como src.models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS # Importar Flask-CORS
# from src.models.niche_data import db # Removido - DB não está sendo usado
from src.routes.user import user_bp
from src.routes.youtube import youtube_bp
from src.routes.stripe_payment import payment_bp
from src.routes.viral_search import viral_search_bp # <<< ADICIONADO IMPORT
# from src.scheduler import init_scheduler # Removido - Scheduler não está sendo usado

# Inicializa a aplicação Flask
# static_folder aponta para onde os arquivos estáticos do frontend (React build) estarão
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "default_secret_key_for_dev") # Chave secreta para sessões, etc.

# Configurar CORS para permitir requisições da origem do frontend
# Em desenvolvimento, permita a origem específica do servidor de desenvolvimento do frontend.
# Para produção, você pode querer restringir a `origins` para o seu domínio de produção.
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}) # Ajuste a porta se o seu frontend rodar em outra

# Registrar Blueprints (rotas modulares)
app.register_blueprint(user_bp, url_prefix="/api") # Rotas de usuário (se houver)
app.register_blueprint(youtube_bp, url_prefix="/api/youtube") # Rotas da API do YouTube
app.register_blueprint(payment_bp, url_prefix="/api/payment") # Rotas de pagamento Stripe
app.register_blueprint(viral_search_bp, url_prefix="/api/search") # <<< ADICIONADO REGISTRO DO BLUEPRINT

# --- Configuração do Banco de Dados (Desativado) ---
# A funcionalidade que usava o DB foi removida.
# Mantenha comentado caso precise reativar no futuro.
# app.config["SQLALCHEMY_DATABASE_URI"] = f"mysql+pymysql://{os.getenv("DB_USERNAME", "root")}:{os.getenv("DB_PASSWORD", "password")}@{os.getenv("DB_HOST", "localhost")}:{os.getenv("DB_PORT", "3306")}/{os.getenv("DB_NAME", "mydb")}"
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# db.init_app(app)
# with app.app_context():
#     db.create_all()
# ----------------------------------------------------

# --- Inicialização do Scheduler (Desativado) ---
# A funcionalidade de tarefas agendadas foi removida.
# scheduler = init_scheduler(app)
# ------------------------------------------------

# Rota para servir o frontend React (build estático) - Esta parte não é usada quando o frontend está em modo de desenvolvimento (pnpm dev)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    """Serve arquivos estáticos do frontend ou o index.html para roteamento no lado do cliente."""
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    # Se o caminho existir no diretório estático, serve o arquivo diretamente
    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        # Caso contrário, serve o index.html (para permitir que o React Router funcione)
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            # Se nem o index.html existir, retorna erro
            return "index.html not found", 404

# Ponto de entrada para execução direta (ex: python src/main.py)
if __name__ == '__main__':
    # Executa o servidor Flask em modo de debug (NÃO USAR COM WAITRESS)
    # host='0.0.0.0' permite acesso de fora do container/máquina
    app.run(host='0.0.0.0', port=5000, debug=True)
    # Use waitress-serve em vez disso para produção:
    # waitress-serve --host=0.0.0.0 --port=5000 src.main:app


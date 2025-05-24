# src/models/niche_data.py

# ATENÇÃO: Este módulo e seus modelos (NicheData, TrendingNiche) NÃO estão sendo usados atualmente.
# A funcionalidade de "Top 10 Nichos" que utilizaria este módulo foi removida a pedido do usuário.
# O código é mantido aqui para referência futura, caso a funcionalidade seja reativada.

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Supondo que \'db\' seja inicializado em main.py ou em um arquivo de extensão
# from src.main import db # Evitar import circular, melhor inicializar em um local central
# Por enquanto, vamos assumir que db é um objeto SQLAlchemy válido passado ou importado

db = SQLAlchemy() # Placeholder - idealmente importado de onde foi inicializado

class NicheData(db.Model):
    """Modelo para armazenar dados brutos de vídeos/canais encontrados.
    
    Atualmente NÃO UTILIZADO.
    """
    __tablename__ = \'niche_data\'

    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(255), nullable=False, index=True)
    channel_id = db.Column(db.String(255), nullable=False, index=True)
    video_id = db.Column(db.String(255), nullable=False, unique=True) # Vídeo único
    channel_name = db.Column(db.String(255))
    video_title = db.Column(db.String(500))
    subscriber_count = db.Column(db.Integer)
    view_count = db.Column(db.Integer)
    views_per_subscriber = db.Column(db.Float)
    video_published_at = db.Column(db.DateTime)
    data_collected_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return f\'<NicheData {self.keyword} - {self.channel_name} - {self.video_title}>\'

# Poderíamos adicionar outra tabela para agregar os dados semanais do Top 10
class TrendingNiche(db.Model):
    """Modelo para armazenar os resultados calculados dos nichos em tendência.
    
    Atualmente NÃO UTILIZADO.
    """
    __tablename__ = \'trending_niches\'

    id = db.Column(db.Integer, primary_key=True)
    week_start_date = db.Column(db.Date, nullable=False, index=True)
    rank = db.Column(db.Integer, nullable=False)
    keyword = db.Column(db.String(255), nullable=False)
    # Métricas que definem o "trending" (ex: crescimento médio de views/sub)
    trend_score = db.Column(db.Float)
    # Outros dados relevantes (ex: número de vídeos/canais analisados)
    notes = db.Column(db.Text)

    def __repr__(self):
        return f\'<TrendingNiche Week {self.week_start_date} Rank {self.rank} - {self.keyword}>\'

# Função para inicializar o db (se não for feito em main.py)
# def init_db(app):
#     db.init_app(app)
#     with app.app_context():
#         db.create_all()


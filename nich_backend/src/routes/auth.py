# src/routes/auth.py

import os
import jwt
import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.user import User, db
from functools import wraps

# Criar Blueprint para rotas de autenticação
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Carregar chave secreta para JWT
JWT_SECRET = os.getenv("JWT_SECRET", "default_jwt_secret_key_for_dev")

# Função para gerar token JWT
def generate_token(user_id):
    """Gera um token JWT para o usuário."""
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30),
        'iat': datetime.datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm='HS256'
    )

# Decorator para proteger rotas que exigem autenticação
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Verificar se o token está no header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Decodificar o token
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user = User.query.get(data['sub'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
        
        # Passar o usuário atual para a função protegida
        return f(current_user, *args, **kwargs)
    
    return decorated

# Endpoint para registro de usuário
@auth_bp.route('/register', methods=['POST'])
def register():
    """Registra um novo usuário."""
    data = request.json
    
    # Verificar se todos os campos necessários estão presentes
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields!'}), 400
    
    # Verificar se o usuário já existe
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({'message': 'User already exists!'}), 409
    
    # Criar novo usuário
    hashed_password = generate_password_hash(data['password'], method='sha256')
    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=hashed_password,
        is_subscribed=False,
        subscription_status='inactive'
    )
    
    # Salvar usuário no banco de dados
    db.session.add(new_user)
    db.session.commit()
    
    # Gerar token para o novo usuário
    token = generate_token(new_user.id)
    
    # Retornar token e dados do usuário
    return jsonify({
        'message': 'User registered successfully!',
        'token': token,
        'user': {
            'id': new_user.id,
            'name': new_user.name,
            'email': new_user.email,
            'is_subscribed': new_user.is_subscribed,
            'subscription_status': new_user.subscription_status,
            'subscription_end_date': new_user.subscription_end_date
        }
    }), 201

# Endpoint para login de usuário
@auth_bp.route('/login', methods=['POST'])
def login():
    """Autentica um usuário e retorna um token JWT."""
    data = request.json
    
    # Verificar se todos os campos necessários estão presentes
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password!'}), 400
    
    # Buscar usuário pelo email
    user = User.query.filter_by(email=data['email']).first()
    
    # Verificar se o usuário existe e a senha está correta
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'message': 'Invalid email or password!'}), 401
    
    # Gerar token para o usuário
    token = generate_token(user.id)
    
    # Retornar token e dados do usuário
    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'is_subscribed': user.is_subscribed,
            'subscription_status': user.subscription_status,
            'subscription_end_date': user.subscription_end_date
        }
    })

# Endpoint para verificar o status da assinatura do usuário
@auth_bp.route('/check-subscription', methods=['GET'])
@token_required
def check_subscription(current_user):
    """Verifica se o usuário atual tem uma assinatura ativa."""
    return jsonify({
        'is_subscribed': current_user.is_subscribed,
        'subscription_status': current_user.subscription_status,
        'subscription_end_date': current_user.subscription_end_date,
        'user': {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email
        }
    })

# Endpoint para obter dados do usuário atual
@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    """Retorna os dados do usuário autenticado."""
    return jsonify({
        'id': current_user.id,
        'name': current_user.name,
        'email': current_user.email,
        'is_subscribed': current_user.is_subscribed,
        'subscription_status': current_user.subscription_status,
        'subscription_end_date': current_user.subscription_end_date
    })

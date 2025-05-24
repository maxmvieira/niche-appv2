# src/routes/stripe_payment.py

import os
import stripe
from flask import Blueprint, request, jsonify, redirect, current_app
from dotenv import load_dotenv

# Carregar variáveis de ambiente do arquivo .env
# Necessário para STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET, FRONTEND_URL
load_dotenv()

# Configurar Blueprint para rotas de pagamento
payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")

# Configurar a chave secreta do Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# --- Variáveis de Configuração (Idealmente via .env) ---

# ID do Preço no Stripe: Substitua pelo ID real do seu preço de assinatura (ex: $5/mês) criado no Stripe Dashboard.
# Crie um produto e um preço recorrente no Stripe: https://dashboard.stripe.com/products
STRIPE_PRICE_ID = os.getenv("STRIPE_PRICE_ID")

# URL Base do Frontend: Usada para construir as URLs de sucesso e cancelamento.
# Deve apontar para onde seu frontend React está rodando ou será implantado.
DOMAIN_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") # Default para desenvolvimento local

# URLs de Redirecionamento Pós-Checkout:
# O {CHECKOUT_SESSION_ID} é uma variável do Stripe que será substituída pelo ID da sessão.
SUCCESS_URL = f"{DOMAIN_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
CANCEL_URL = f"{DOMAIN_URL}/payment/cancel"

# Segredo do Webhook: Usado para verificar a autenticidade dos webhooks recebidos do Stripe.
# Crie um endpoint de webhook no Stripe Dashboard e obtenha o segredo: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# --- Endpoints --- 

@payment_bp.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    """Cria uma sessão de checkout do Stripe para iniciar o processo de assinatura.
    
    Recebe uma requisição POST (sem corpo necessário por enquanto).
    Retorna um JSON com o ID da sessão de checkout para o frontend redirecionar o usuário.
    
    TODO: Associar a sessão a um usuário logado (obter user_id, buscar/criar cliente Stripe).
    """
    # Placeholder para lógica de usuário:
    # user_id = get_current_user_id() # Obter ID do usuário da sessão/token
    # if not user_id:
    #     return jsonify({"error": "Usuário não autenticado"}), 401
    # stripe_customer_id = get_or_create_stripe_customer(user_id)
    # if not stripe_customer_id:
    #     return jsonify({"error": "Falha ao obter/criar cliente Stripe"}), 500

    if not STRIPE_PRICE_ID or not stripe.api_key:
         return jsonify({"error": "Configuração do Stripe incompleta no servidor."}), 500

    try:
        checkout_session = stripe.checkout.Session.create(
            # customer=stripe_customer_id, # Associar ao cliente Stripe para gerenciar assinaturas
            line_items=[
                {
                    # Usa o ID do preço configurado
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                },
            ],
            mode="subscription", # Define que é uma assinatura recorrente
            success_url=SUCCESS_URL, # URL para onde o usuário é redirecionado após sucesso
            cancel_url=CANCEL_URL,   # URL para onde o usuário é redirecionado após cancelar
            # metadata={ # Metadados opcionais para associar a sessão ao seu usuário interno
            #     \"user_id\": user_id 
            # }
        )
        # Retorna apenas o ID da sessão para o frontend
        return jsonify({"sessionId": checkout_session.id})
    except Exception as e:
        # Log detalhado do erro
        current_app.logger.error(f"Erro ao criar sessão de checkout Stripe: {str(e)}", exc_info=True)
        # Retorna um erro genérico para o frontend, detalhes ficam no log do servidor
        return jsonify({"error": "Falha ao iniciar processo de pagamento."}), 500

@payment_bp.route("/webhook", methods=["POST"])
def stripe_webhook():
    """Recebe e processa eventos (webhooks) enviados pelo Stripe.
    
    Essencial para atualizar o status da assinatura no seu sistema (ex: pagamento confirmado, falhou, cancelado).
    Verifica a assinatura do webhook para garantir que a requisição veio do Stripe.
    
    Requer configuração de um endpoint de webhook no Stripe Dashboard apontando para esta URL
    e a configuração da variável de ambiente STRIPE_WEBHOOK_SECRET.
    """
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    if not STRIPE_WEBHOOK_SECRET:
        current_app.logger.error("Webhook Stripe recebido, mas STRIPE_WEBHOOK_SECRET não está configurado.")
        return jsonify(success=False, error="Webhook secret not configured"), 500

    try:
        # Verifica a assinatura do evento usando o segredo do endpoint
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Payload inválido
        current_app.logger.error(f"Webhook Stripe - Payload inválido: {e}")
        return jsonify(success=False, error="Invalid payload"), 400
    except stripe.error.SignatureVerificationError as e:
        # Assinatura inválida - a requisição pode não ter vindo do Stripe
        current_app.logger.error(f"Webhook Stripe - Assinatura inválida: {e}")
        return jsonify(success=False, error="Invalid signature"), 400
    except Exception as e:
        current_app.logger.error(f"Erro ao construir evento de webhook Stripe: {e}")
        return jsonify(success=False, error="Webhook processing error"), 500

    # --- Manipulação de Eventos Específicos --- 
    # Adicione lógica para os eventos relevantes para sua aplicação.
    
    event_type = event["type"]
    data_object = event["data"]["object"] # O objeto do Stripe relacionado ao evento

    current_app.logger.info(f"Webhook Stripe recebido: {event_type}")

    if event_type == "checkout.session.completed":
        # Pagamento inicial da assinatura foi bem-sucedido.
        session = data_object
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        # user_id = session.get("metadata", {}).get("user_id") # Se você passou metadados
        
        current_app.logger.info(f"Checkout session completed: {session.id}, Subscription: {subscription_id}, Customer: {customer_id}")
        # TODO: Implementar lógica para marcar o usuário como assinante ativo no seu banco de dados.
        # Ex: mark_user_as_subscribed(user_id, subscription_id, customer_id)

    elif event_type == "customer.subscription.deleted":
        # Assinatura foi cancelada (pelo usuário ou por falha de pagamento).
        subscription = data_object
        customer_id = subscription.get("customer")
        current_app.logger.info(f"Subscription deleted: {subscription.id}, Customer: {customer_id}")
        # TODO: Implementar lógica para marcar o usuário como não assinante no seu banco de dados.
        # Ex: mark_user_as_unsubscribed(customer_id)
        
    elif event_type == "customer.subscription.updated":
        # Assinatura foi atualizada (ex: mudança de plano, status mudou para past_due, etc.).
        subscription = data_object
        customer_id = subscription.get("customer")
        status = subscription.get("status")
        current_app.logger.info(f"Subscription updated: {subscription.id}, Customer: {customer_id}, Status: {status}")
        # TODO: Implementar lógica para atualizar o status da assinatura no seu banco de dados.
        # Ex: update_subscription_status(customer_id, status)
        # Se status for \"active\", garantir que o usuário está marcado como ativo.
        # Se status for \"past_due\" ou \"canceled\", marcar como inativo.

    elif event_type == "invoice.payment_failed":
        # Falha no pagamento de uma fatura de renovação.
        invoice = data_object
        customer_id = invoice.get("customer")
        subscription_id = invoice.get("subscription")
        current_app.logger.warning(f"Invoice payment failed: {invoice.id}, Subscription: {subscription_id}, Customer: {customer_id}")
        # TODO: Implementar lógica para notificar o usuário ou marcar a assinatura como pendente/em risco.
        # O Stripe geralmente tenta cobrar novamente algumas vezes antes de cancelar.
        # Você pode querer atualizar o status no seu DB para \"past_due\".

    elif event_type == "invoice.payment_succeeded":
        # Pagamento de uma fatura de renovação foi bem-sucedido.
        invoice = data_object
        customer_id = invoice.get("customer")
        subscription_id = invoice.get("subscription")
        current_app.logger.info(f"Invoice payment succeeded: {invoice.id}, Subscription: {subscription_id}, Customer: {customer_id}")
        # TODO: Garantir que o usuário está marcado como assinante ativo no seu banco de dados.
        # Ex: mark_user_as_subscribed(user_id_from_customer_id, subscription_id, customer_id)

    else:
        # Evento não tratado especificamente
        current_app.logger.info(f"Webhook Stripe - Evento não tratado: {event_type}")

    # Retorna sucesso para o Stripe saber que o webhook foi recebido
    return jsonify(success=True)

# --- Endpoint de Verificação de Assinatura (Exemplo) --- 

# Este endpoint é um placeholder. A lógica real dependeria de como você armazena
# o status da assinatura do usuário (associado ao ID do usuário logado).
@payment_bp.route("/check-subscription", methods=["GET"])
def check_subscription():
    """Verifica se o usuário atual (logado) possui uma assinatura ativa.
    
    Retorna: JSON com {\"isSubscribed\": boolean}.
    
    ATENÇÃO: Esta é uma implementação de placeholder. Requer lógica de autenticação
             e consulta ao banco de dados para verificar o status real da assinatura.
    """
    # Placeholder: Obter ID do usuário logado (requer sistema de autenticação)
    # user_id = get_current_user_id_from_session_or_token()
    # if not user_id:
    #     return jsonify({"isSubscribed": False, "error": "Not authenticated"}), 401
    
    # Placeholder: Consultar seu banco de dados para verificar o status da assinatura
    # is_active = check_user_subscription_status_in_db(user_id)
    is_active = False # Placeholder - Assume não assinante por padrão
    
    current_app.logger.debug(f"Check subscription status: {is_active}")
    return jsonify({"isSubscribed": is_active})

# --- Funções Auxiliares de Banco de Dados (Placeholders) ---
# Estas funções precisam ser implementadas com base no seu sistema de usuários e ORM/DB.

# def get_current_user_id_from_session_or_token():
#     # Exemplo: usar Flask-Login, Flask-JWT-Extended, etc.
#     # from flask_login import current_user
#     # if current_user.is_authenticated:
#     #     return current_user.id
#     return None

# def get_or_create_stripe_customer(user_id):
#     # 1. Verificar se o usuário no seu DB já tem um \"stripe_customer_id\".
#     # user = User.query.get(user_id)
#     # if user and user.stripe_customer_id:
#     #     return user.stripe_customer_id
#     # 2. Se não tiver, criar um novo cliente no Stripe.
#     # try:
#     #     customer = stripe.Customer.create(
#     #         # email=user.email, # Opcional
#     #         # name=user.name,   # Opcional
#     #         metadata={\"user_id\": user_id} # Vincular ao seu ID de usuário
#     #     )
#     #     # 3. Salvar o customer.id no registro do usuário no seu DB.
#     #     # user.stripe_customer_id = customer.id
#     #     # db.session.commit()
#     #     # return customer.id
#     # except Exception as e:
#     #     current_app.logger.error(f"Erro ao criar cliente Stripe para user {user_id}: {e}")
#     #     return None
#     return None # Placeholder

# def mark_user_as_subscribed(user_id, subscription_id, customer_id):
#     # Encontrar o usuário pelo user_id (ou customer_id se for mais fácil)
#     # Atualizar um campo no seu modelo de usuário (ex: is_subscribed = True, subscription_status = \"active\")
#     # Salvar subscription_id e customer_id pode ser útil.
#     # user = User.query.get(user_id)
#     # if user:
#     #     user.is_subscribed = True
#     #     user.subscription_status = \"active\"
#     #     user.stripe_subscription_id = subscription_id
#     #     user.stripe_customer_id = customer_id
#     #     db.session.commit()
#     #     current_app.logger.info(f"Usuário {user_id} marcado como inscrito.")
#     pass # Placeholder

# def mark_user_as_unsubscribed(customer_id):
#     # Encontrar o usuário pelo stripe_customer_id.
#     # user = User.query.filter_by(stripe_customer_id=customer_id).first()
#     # if user:
#     #     user.is_subscribed = False
#     #     user.subscription_status = \"canceled\" # ou \"deleted\"
#     #     # user.stripe_subscription_id = None # Opcional: limpar ID da assinatura
#     #     db.session.commit()
#     #     current_app.logger.info(f"Usuário {user.id} (Customer {customer_id}) marcado como não inscrito.")
#     pass # Placeholder

# def update_subscription_status(customer_id, status):
#     # Encontrar o usuário pelo stripe_customer_id.
#     # user = User.query.filter_by(stripe_customer_id=customer_id).first()
#     # if user:
#     #     user.subscription_status = status
#     #     user.is_subscribed = (status == \"active\") # Atualiza is_subscribed baseado no status
#     #     db.session.commit()
#     #     current_app.logger.info(f"Status da assinatura do usuário {user.id} atualizado para {status}.")
#     pass # Placeholder

# def check_user_subscription_status_in_db(user_id):
#     # Consultar o status do usuário no seu banco de dados.
#     # user = User.query.get(user_id)
#     # return user and user.is_subscribed and user.subscription_status == \"active\"
#     return False # Placeholder


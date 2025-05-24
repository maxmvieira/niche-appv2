# Nich - Backend (Flask)

Este é o backend da aplicação Nich, desenvolvido em Flask. Ele fornece a API para o frontend React buscar e filtrar dados do YouTube e gerenciar pagamentos com Stripe.

## Funcionalidades

*   **Busca de Nichos no YouTube:** Endpoint `/api/youtube/find_niches` que busca canais com base em keywords, filtra por data de criação e número de inscritos, e encontra vídeos recentes com alto número de visualizações nesses canais.
*   **Integração com Stripe:** Endpoints `/api/payment/create-checkout-session` e `/api/payment/webhook` para gerenciar assinaturas mensais de $5 via Stripe Checkout.
*   **Servir Frontend:** Serve os arquivos estáticos do build do frontend React.

## Estrutura do Projeto

```
nich_backend/
├── venv/                   # Ambiente virtual Python
├── src/
│   ├── models/             # Modelos SQLAlchemy (atualmente não usados)
│   │   ├── __init__.py
│   │   └── niche_data.py   # Modelo para dados de nicho (desativado)
│   │   └── user.py         # Modelo de usuário (placeholder)
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── stripe_payment.py # Rotas para integração com Stripe
│   │   ├── user.py         # Rotas de usuário (placeholder)
│   │   └── youtube.py      # Rotas para API do YouTube
│   ├── static/             # Pasta para arquivos estáticos (geralmente vazia, frontend é servido)
│   ├── __init__.py
│   └── main.py             # Ponto de entrada da aplicação Flask, configuração e blueprints
│   └── scheduler.py        # Módulo de agendamento (desativado)
├── .env                    # Arquivo para variáveis de ambiente (NÃO versionar)
├── requirements.txt        # Dependências Python
└── ...                     # Outros arquivos de configuração
```

## Configuração

1.  **Clonar o repositório** (ou obter os arquivos).
2.  **Criar e ativar um ambiente virtual:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate # Linux/macOS
    # venv\Scripts\activate # Windows
    ```
3.  **Instalar dependências:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Criar o arquivo `.env`** na raiz do diretório `nich_backend` com as seguintes variáveis:
    ```dotenv
    # Chave da API do YouTube Data v3 (Obrigatório)
    # Crie em: https://console.cloud.google.com/apis/credentials
    YOUTUBE_API_KEY="AIzaSy..."

    # Chaves do Stripe (Obrigatório para pagamento)
    # Obtenha em: https://dashboard.stripe.com/apikeys (use chaves de teste)
    STRIPE_PUBLISHABLE_KEY="pk_test_..."
    STRIPE_SECRET_KEY="sk_test_..."

    # ID do Preço do Stripe (Obrigatório para pagamento)
    # Crie um produto e um preço recorrente no Stripe Dashboard
    STRIPE_PRICE_ID="price_..."

    # Segredo do Webhook Stripe (Obrigatório para processar eventos de pagamento)
    # Crie um endpoint de webhook no Stripe Dashboard apontando para http://SEU_DOMINIO/api/payment/webhook
    STRIPE_WEBHOOK_SECRET="whsec_..."

    # URL do Frontend (Opcional, default: http://localhost:3000)
    # Usado para redirecionamentos do Stripe
    FRONTEND_URL="http://localhost:3000"

    # Chave Secreta do Flask (Opcional, gera uma default se não definida)
    FLASK_SECRET_KEY="uma_chave_secreta_forte_e_aleatoria"
    ```

## Execução (Desenvolvimento)

Com o ambiente virtual ativado e o `.env` configurado:

```bash
python src/main.py
```

O backend estará rodando em `http://localhost:5000`.

## Implantação (Exemplo com Gunicorn)

1.  **Gerar `requirements.txt` atualizado:**
    ```bash
    pip freeze > requirements.txt
    ```
2.  **Instalar Gunicorn:**
    ```bash
    pip install gunicorn
    ```
3.  **Executar com Gunicorn:**
    ```bash
    gunicorn --bind 0.0.0.0:5000 "src.main:app"
    ```
    (Ajuste a porta e adicione workers conforme necessário para produção)

4.  **Configurar um proxy reverso (Nginx, Apache)** para servir a aplicação e lidar com HTTPS.
5.  **Configurar o endpoint de webhook no Stripe** para apontar para a URL pública do seu backend (`https://SEU_DOMINIO/api/payment/webhook`).

## Endpoints da API

*   `GET /api/youtube/find_niches`: Busca nichos. (Requer assinatura)
    *   Query Params: `keywords`, `date_range`, `max_subs`, `min_views`.
*   `POST /api/payment/create-checkout-session`: Cria sessão de checkout Stripe.
*   `POST /api/payment/webhook`: Recebe webhooks do Stripe.
*   `GET /api/payment/check-subscription`: Verifica status da assinatura (Placeholder).
*   `GET /`: Serve o `index.html` do frontend.
*   `GET /<path:path>`: Serve arquivos estáticos do frontend.

## TODO / Melhorias

*   Implementar sistema de autenticação de usuários.
*   Associar clientes e assinaturas Stripe aos usuários autenticados.
*   Implementar a lógica real de `check-subscription`.
*   Adicionar tratamento de erros mais granular.
*   Considerar paginação ou limites mais robustos para o endpoint `find_niches` para evitar timeouts.
*   Melhorar logs.


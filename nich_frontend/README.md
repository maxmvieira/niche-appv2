# Nich - Frontend (React/Next.js)

Este é o frontend da aplicação Nich, desenvolvido com React (usando o template `create-react-app` que utiliza Next.js por baixo dos panos) e Tailwind CSS com componentes shadcn/ui. Ele fornece a interface do usuário para interagir com o backend Flask, buscar nichos no YouTube e gerenciar assinaturas.

## Funcionalidades

*   **Interface de Filtros:** Permite ao usuário inserir keywords e selecionar filtros (data de criação do canal, máx. inscritos, mín. visualizações do vídeo).
*   **Dashboard de Resultados:** Exibe os canais e vídeos encontrados em uma tabela, ordenados pela métrica views/inscrito.
*   **Exportação CSV:** Botão para exportar os resultados da tabela para um arquivo CSV.
*   **Integração com Stripe:**
    *   Exibe um banner e bloqueia a funcionalidade de busca para usuários não assinantes.
    *   Botão "Assinar Agora" que redireciona para o checkout do Stripe.
    *   (Placeholder) Lógica para verificar o status da assinatura do usuário.

## Estrutura do Projeto (Simplificada)

```
nich_frontend/
├── public/               # Arquivos estáticos públicos
├── src/
│   ├── app/              # Diretório principal do App Router (Next.js)
│   │   ├── globals.css   # Estilos globais
│   │   ├── layout.tsx    # Layout principal da aplicação
│   │   └── page.tsx      # Componente da página principal (onde está toda a lógica)
│   ├── components/         # Componentes reutilizáveis (shadcn/ui)
│   │   └── ui/           # Componentes base do shadcn/ui
│   └── lib/
│       └── utils.ts      # Utilitários (ex: `cn` para classnames)
├── .env.local            # Arquivo para variáveis de ambiente locais (NÃO versionar)
├── next.config.mjs       # Configuração do Next.js
├── package.json          # Dependências e scripts do projeto
├── pnpm-lock.yaml        # Lockfile do pnpm
├── postcss.config.js     # Configuração do PostCSS (Tailwind)
├── tailwind.config.ts    # Configuração do Tailwind CSS
├── tsconfig.json         # Configuração do TypeScript
└── README.md             # Este arquivo
```

## Configuração

1.  **Clonar o repositório** (ou obter os arquivos).
2.  **Instalar dependências** (usando pnpm, conforme o template):
    ```bash
    pnpm install
    ```
3.  **Criar o arquivo `.env.local`** na raiz do diretório `nich_frontend` (opcional, mas recomendado para produção):
    ```dotenv
    # URL do Backend Flask (Obrigatório se o backend rodar em outra porta/domínio)
    NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"

    # Chave Publicável do Stripe (Obrigatório)
    # ATENÇÃO: Esta chave é pública, mas é melhor usar variável de ambiente.
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
    ```
    *Nota: Variáveis prefixadas com `NEXT_PUBLIC_` são expostas ao navegador.* 

## Execução (Desenvolvimento)

Com as dependências instaladas:

```bash
pnpm run dev
```

O frontend estará rodando em `http://localhost:3000` (ou outra porta, se a 3000 estiver ocupada).

**Importante:** Certifique-se de que o backend Flask esteja rodando (normalmente em `http://localhost:5000`) para que as chamadas de API funcionem.

## Build para Produção

```bash
pnpm run build
```

Isso gerará uma versão otimizada e estática (por padrão) na pasta `.next/`. No entanto, como estamos servindo o frontend através do backend Flask, o processo de implantação é um pouco diferente:

1.  Execute `pnpm run build` no diretório `nich_frontend`.
2.  Copie o conteúdo da pasta `nich_frontend/out/` (gerada pelo build estático do Next.js) para a pasta `nich_backend/src/static/`.
3.  Implante o backend Flask. Ele servirá os arquivos estáticos do frontend a partir da pasta `src/static/`.

*Alternativa (Implantação Separada):* Você pode implantar o frontend Next.js separadamente em plataformas como Vercel ou Netlify e configurar o `NEXT_PUBLIC_BACKEND_URL` para apontar para a URL pública do seu backend Flask implantado. Nesse caso, você precisará configurar CORS no backend Flask para permitir requisições do domínio do frontend.

## Dependências Principais

*   **React/Next.js:** Framework para construção da interface.
*   **Tailwind CSS:** Framework CSS utilitário.
*   **shadcn/ui:** Coleção de componentes React reutilizáveis construídos sobre Tailwind e Radix UI.
*   **@stripe/stripe-js:** Biblioteca oficial do Stripe para interações no frontend.
*   **file-saver:** Para iniciar downloads de arquivos (CSV).
*   **papaparse:** Para converter JSON em CSV.

## TODO / Melhorias

*   Implementar lógica real de verificação de assinatura (requer autenticação).
*   Criar páginas/componentes dedicados para sucesso e cancelamento do pagamento.
*   Adicionar tratamento de estado mais robusto (ex: Zustand, Redux Toolkit) se a aplicação crescer.
*   Melhorar feedback visual durante carregamento e erros.
*   Implementar autenticação de usuários.


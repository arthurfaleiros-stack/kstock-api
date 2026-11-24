# 📦 KStock-API (KeepStock)

> **API RESTful Corporativa para Gestão Inteligente de Estoque, Movimentações Atômicas, Rastreamento Preditivo de Ruptura e Controle de Acesso Baseado em Perfis (RBAC).**

Desenvolvida como núcleo de backend para sistemas de controle de inventário de alta confiabilidade, a **KStock-API** atende às demandas operacionais de empresas que necessitam de consistência estrita de dados em tempo real, rastreabilidade completa (auditoria de ponta a ponta), segurança em conformidade com as melhores práticas de mercado e previsibilidade analítica para reposição de mercadorias.

---

## 📑 Sumário

1. [Visão Geral e Propósito do Projeto](#-visão-geral-e-propósito-do-projeto)
2. [Stack Tecnológica e Justificativas](#-stack-tecnológica-e-justificativas)
3. [Arquitetura de Software e Padrões de Projeto](#-arquitetura-de-software-e-padrões-de-projeto)
4. [Modelo de Dados e Engenharia de Banco de Dados](#-modelo-de-dados-e-engenharia-de-banco-de-dados)
5. [Mecanismos Críticos do Negócio](#-mecanismos-críticos-do-negócio)
   - [Consistência Transacional e Concorrência de Estoque (ACID)](#1-consistência-transacional-e-concorrência-de-estoque-acid)
   - [Motor Preditivo de Risco e Ruptura de Inventário](#2-motor-preditivo-de-risco-e-ruptura-de-inventário)
   - [Segurança, Autenticação JWT e RBAC](#3-segurança-autenticação-jwt-e-rbac)
   - [Recuperação Segura de Senha e Serviço de E-mail](#4-recuperação-segura-de-senha-e-serviço-de-e-mail)
   - [Gestão de Assinaturas e Planos SaaS](#5-gestão-de-assinaturas-e-planos-saas)
6. [Catálogo Completo de Endpoints da API](#-catálogo-completo-de-endpoints-da-api)
7. [Tratamento Padronizado de Erros](#-tratamento-padronizado-de-erros)
8. [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
   - [Ambiente Local (Node.js + MySQL)](#execução-em-ambiente-local)
   - [Ambiente Conteinerizado (Docker & Docker Compose)](#execução-via-docker-compose)
9. [Variáveis de Ambiente](#-variáveis-de-ambiente)
10. [Testes Automatizados](#-testes-automatizados)

---

## 🎯 Visão Geral e Propósito do Projeto

O controle inadequado de estoque é uma das principais causas de perdas financeiras em empresas de diversos segmentos — seja por ruptura de inventário (quando um item essencial esgota sem reposição planejada) ou por desvios, erros de digitação e inconsistências concorrentes durante picos operacionais.

A **KStock-API** foi projetada para sanar esses gargalos operacionais fornecendo:
- **Integridade Absoluta dos Dados**: Nenhuma movimentação é confirmada sem passar por validação de saldo e travas pessimistas contra condições de corrida (*race conditions*).
- **Rastreabilidade Irretratável**: Registro automático de eventos na tabela de auditoria (`historico`), garantindo conformidade e transparência sobre quem alterou, inseriu ou removeu registros.
- **Análise Preditiva de Esgotamento**: Métricas em tempo real sobre a velocidade de saída dos itens, permitindo aos gestores antecipar compras antes que os produtos atinjam o esgotamento total.
- **Modelo de Licenciamento SaaS Multi-plano**: Suporte nativo a assinaturas de usuários em diferentes categorias de serviços (`FREE`, `BASIC`, `PRO`, `ENTERPRISE`).

---

## 🛠️ Stack Tecnológica e Justificativas

| Componente | Tecnologia | Papel no Projeto e Justificativa |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v24.x LTS) | Execução JavaScript assíncrona orientada a eventos, com I/O não bloqueante de alto desempenho para operações simultâneas. |
| **Framework Web** | Express.js (v4.21) | Framework minimalista e extensível para definição de roteamento HTTP, tratamento modular de middlewares e pipeline de requisições. |
| **Banco de Dados** | MySQL 8.0 (InnoDB) | RDBMS relacional maduro com suporte a transações ACID, integridade referencial nativa via chaves estrangeiras e índices B-Tree otimizados. |
| **Driver de Banco** | `mysql2/promise` | Driver performático com suporte nativo a Promises, *Prepared Statements* (combate a SQL Injection) e pool de conexões reutilizáveis. |
| **Segurança & Criptografia** | `bcryptjs` + `jsonwebtoken` (JWT) | Algoritmo de derivação de chave baseado em Blowfish com Salt configurável para senhas e tokens assinados criptograficamente para sessões Stateless. |
| **Proteção HTTP** | `helmet` + `cors` | Configuração de cabeçalhos HTTP defensivos (X-Content-Type-Options, X-Frame-Options, HSTS) e controle de origens cruzadas. |
| **Manipulação de Uploads** | `multer` | Middleware para parsing de `multipart/form-data`, validação estrita de MIME Types de imagens e limites de tamanho em disco. |
| **Envio Transacional de E-mail** | `nodemailer` + MailerSend API | Arquitetura de mensageria com fallback duplo (API REST e transporte SMTP padrão) para redefinições de credenciais. |
| **Documentação da API** | Swagger UI (`swagger-ui-express`) | Documentação interativa e navegável aderente ao padrão OpenAPI 3.0. |
| **Conteinerização** | Docker & Docker Compose | Ambientes reproduzíveis e isolados para API e banco de dados, com healthchecks ativos de conectividade. |

---

## 🏛️ Arquitetura de Software e Padrões de Projeto

A aplicação adota o padrão de **Arquitetura em Camadas (Layered Architecture)** com separação estrita de responsabilidades (*Separation of Concerns*), permitindo fácil manutenção, evolução e testabilidade:

```
[ Cliente HTTP (Frontend / Mobile / Postman) ]
                     │
                     ▼
       ┌───────────────────────────┐
       │   Middlewares Globais     │ ◄── Helmet, CORS, Express JSON, Static Uploads
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │   Roteamento (/api/v1/*)  │ ◄── Encaminhamento modular de rotas
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │   Middlewares de Rota     │ ◄── verifyJWT, verifyRole (RBAC), validateBody, Multer
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │        Controllers        │ ◄── Recepção de requisições, parsing e formatação de resposta
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │         Services          │ ◄── Lógica de negócio, regras transacionais, orquestração
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │       Repositories        │ ◄── Queries SQL parametrizadas, abstração de persistência
       └─────────────┬─────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │  Pool de Conexões MySQL   │ ◄── Conexões persistentes, transações ACID (COMMIT / ROLLBACK)
       └───────────────────────────┘
```

### Detalhamento das Camadas

- **Presentation / Entrypoint (`src/index.js` & `src/server.js`)**:
  - `src/index.js` gerencia a inicialização, valida a conectividade prévia com o MySQL via `ping()`, trata colisões de porta (`EADDRINUSE`) e intercepta sinais operacionais (`SIGTERM`, `SIGINT`) para encerramento gracioso (*graceful shutdown*).
  - `src/server.js` configura os middlewares globais, rotas estáticas (`/uploads`), documentação (`/api/docs`), endpoint de saúde (`/health`) e o interceptador de erros global.
- **Roteamento (`src/routes/`)**: Módulos independentes para cada domínio da aplicação (`auth`, `usuarios`, `assinaturas`, `categorias`, `fornecedores`, `produtos`, `movimentacoes`, `historico`).
- **Middlewares (`src/middlewares/`)**:
  - `verifyJWT`: Garante que o cabeçalho `Authorization: Bearer <token>` seja válido e dentro do prazo de expiração.
  - `verifyRole`: Assegura que o perfil do usuário tenha autorização para o recurso.
  - `validate`: Valida a presença de campos mandatórios no corpo da requisição e validação algorítmica de formatos (como CNPJ válido e e-mail).
  - `upload`: Intercepta e filtra arquivos de fotos de produtos em disco.
  - `errorHandler`: Captura qualquer exceção não tratada ou instâncias de `AppError` e normaliza a resposta JSON.
- **Controllers (`src/controllers/`)**: Extraem dados de `req.body`, `req.params`, `req.query` e `req.user`, delegam a execução para o Service correspondente e enviam respostas HTTP com os códigos semânticos adequados (200, 201, 204, etc.).
- **Services (`src/services/`)**: Detêm todas as regras do domínio, cálculos analíticos, validações de negócio, orquestração de e-mails e gerenciamento do ciclo de vida das transações com o banco.
- **Repositories (`src/repositories/`)**: Camada de persistência pura. Executa instruções SQL utilizando *Prepared Statements* com marcadores `?`, isolando as entidades e tabelas do restante do código.
- **Database Helper (`src/db/connect.js`)**: Fornece o pool de conexões e o método auxiliar `withTransaction(callback)`, garantindo que transações comecem com `beginTransaction()`, sejam confirmadas com `commit()` ou revertidas com `rollback()` em caso de falha.

---

## 🗄️ Modelo de Dados e Engenharia de Banco de Dados

O banco de dados relacional foi concebido sob a engine **InnoDB**, com suporte pleno a integridade referencial via chaves estrangeiras (FK), índices secundários para aceleração de buscas e regras estritas de deleção.

### Diagrama Entidade-Relacionamento (Conceitual)

```
┌──────────────────┐       1:N        ┌──────────────────┐
│     USUARIO      │─────────────────<│    ASSINATURA    │
└────────┬─────────┘                  └──────────────────┘
         │
         │ 1:N (Responsável)
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌──────────────────┐       1:N        ┌──────────────────┐
│   MOVIMENTACAO   │>─────────────────│     HISTORICO    │
└────────┬─────────┘                  │    (Auditoria)   │
         │                            └──────────────────┘
         │ N:1 (Produto)                    ▲
         ▼                                  │ 1:N
┌──────────────────┐                        │
│     PRODUTO      │────────────────────────┘
└────────┬─────────┘
         │
         ├──────────────────────────┐
         │ N:1                      │ N:1
         ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│    CATEGORIA     │       │    FORNECEDOR    │
└──────────────────┘       └──────────────────┘
```

### Dicionário de Tabelas

1. **`usuario`**: Cadastro central de operadores e administradores do sistema.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `nome` (VARCHAR(150) NOT NULL)
   - `email` (VARCHAR(191) NOT NULL UNIQUE)
   - `senha_hash` (VARCHAR(255) NOT NULL)
   - `senha_reset_token` (VARCHAR(255) NULL)
   - `reset_token_expira` (DATETIME NULL)
   - `perfil` (ENUM('ADMIN', 'GERENTE', 'OPERADOR') NOT NULL DEFAULT 'OPERADOR')
   - `criado_em` / `atualizado_em` (DATETIME)
2. **`assinatura`**: Planos de acesso e licenciamento por usuário (modelo SaaS).
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `usuario_id` (BIGINT NOT NULL FK -> `usuario.id` ON DELETE CASCADE)
   - `plano` (ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE') DEFAULT 'FREE')
   - `data_inicio` (DATE NOT NULL)
   - `data_fim` (DATE NULL)
   - `status` (ENUM('ATIVO', 'INATIVO', 'CANCELADO', 'PENDENTE') DEFAULT 'ATIVO')
3. **`categoria`**: Classificação taxonômica dos produtos.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `nome` (VARCHAR(150) NOT NULL UNIQUE)
   - `descricao` (TEXT NULL)
4. **`fornecedor`**: Parceiros comerciais e distribuidores.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `nome` (VARCHAR(150) NOT NULL)
   - `cnpj` (VARCHAR(20) NOT NULL UNIQUE)
   - `contato` (VARCHAR(150) NULL)
   - `endereco` (VARCHAR(255) NULL)
5. **`produto`**: Entidade principal de estoque.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `categoria_id` (BIGINT NOT NULL FK -> `categoria.id` ON DELETE RESTRICT)
   - `fornecedor_id` (BIGINT NOT NULL FK -> `fornecedor.id` ON DELETE RESTRICT)
   - `nome` (VARCHAR(200) NOT NULL)
   - `codigo` (VARCHAR(100) NOT NULL UNIQUE - SKU do item)
   - `descricao` (TEXT NULL)
   - `quantidade_atual` (BIGINT NOT NULL DEFAULT 0)
   - `quantidade_minima` (BIGINT NOT NULL DEFAULT 0)
   - `codigo_barras` (VARCHAR(100) NULL)
   - `foto_url` (VARCHAR(255) NULL)
   - *Índices criados*: `idx_produto_codigo`, `idx_produto_categoria`, `idx_produto_fornecedor`.
6. **`movimentacao`**: Registro imutável de transações no inventário.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `usuario_id` (BIGINT NOT NULL FK -> `usuario.id` ON DELETE RESTRICT)
   - `produto_id` (BIGINT NOT NULL FK -> `produto.id` ON DELETE RESTRICT)
   - `tipo` (ENUM('ENTRADA', 'SAIDA', 'AJUSTE') NOT NULL)
   - `quantidade` (BIGINT NOT NULL)
   - `data_hora` (DATETIME DEFAULT CURRENT_TIMESTAMP)
   - `observacao` (TEXT NULL)
   - *Índices criados*: `idx_movimentacao_produto`, `idx_movimentacao_usuario`, `idx_movimentacao_data`.
7. **`historico`**: Trilha de auditoria para fins de compliance e segurança operacional.
   - `id` (BIGINT AUTO_INCREMENT PK)
   - `usuario_id` (BIGINT NULL FK -> `usuario.id` ON DELETE SET NULL)
   - `produto_id` (BIGINT NULL FK -> `produto.id` ON DELETE SET NULL)
   - `movimentacao_id` (BIGINT NULL FK -> `movimentacao.id` ON DELETE SET NULL)
   - `data_hora` (DATETIME DEFAULT CURRENT_TIMESTAMP)
   - `tipo_operacao` (VARCHAR(60) NOT NULL)
   - `descricao` (TEXT NOT NULL)
   - *Índices criados*: `idx_historico_produto`, `idx_historico_usuario`, `idx_historico_movimentacao`, `idx_historico_data`.

---

## ⚙️ Mecanismos Críticos do Negócio

### 1. Consistência Transacional e Concorrência de Estoque (ACID)

O problema mais comum em sistemas de estoque é a condição de corrida (*race condition*): se dois operadores tentarem retirar simultaneamente o último item restante, ambas as consultas podem ler o saldo como `1` e aprovar ambas as saídas, resultando em estoque negativo inconsistente.

Para eliminar esse risco, o `movimentacaoService` emprega o método `db.withTransaction` associado ao bloqueio pessimista:

```javascript
// Exemplo conceitual do fluxo transacional:
await db.withTransaction(async (connection) => {
  // 1. Bloqueia a linha do produto exclusivamente contra leituras e gravações concorrentes
  const produto = await produtoRepository.findByIdForUpdate(produto_id, connection);
  
  // 2. Validação rigorosa de saldo
  if (tipo === 'SAIDA' && quantidade > produto.quantidade_atual) {
    throw new AppError('Saldo insuficiente em estoque.', 422, 'INSUFFICIENT_STOCK', {
      saldoAtual: produto.quantidade_atual,
      quantidadeSolicitada: quantidade
    });
  }

  // 3. Atualização atômica do saldo
  await produtoRepository.updateQuantidade(produto_id, novoSaldo, connection);

  // 4. Inserção do registro do evento de movimentação
  const movId = await movimentacaoRepository.create({ ... }, connection);

  // 5. Inserção automática na auditoria (histórico)
  await historicoRepository.create({ ... }, connection);

  return movId;
});
```

Caso qualquer erro ocorra em qualquer etapa (falha de rede, saldo insuficiente ou erro de banco), a transação é automaticamente revertida (`ROLLBACK`) e o lock liberado, garantindo o estado consistente anterior.

### 2. Motor Preditivo de Risco e Ruptura de Inventário

O serviço de produtos conta com uma engine estatística preditiva de cálculo de consumo:
- **Agregação Histórica**: Consulta todas as movimentações do tipo `SAIDA` nos últimos $N$ dias (por padrão, 30 dias).
- **Média Diária de Consumo**:
  $$\text{Média Diária} = \frac{\text{Total de Saídas no Período}}{N}$$
- **Dias até a Ruptura (Runway)**:
  $$\text{Dias até Ruptura} = \left\lfloor \frac{\text{Saldo Atual}}{\text{Média Diária}} \right\rfloor$$
- **Classificação de Risco**: Se $\text{Dias até Ruptura} \le \text{Limiar de Alerta}$ (padrão de 7 dias), o produto é marcado com status `ALTO RISCO`.
- **Previsão de Data Fatal**: Projeta a data exata em que o estoque chegará a zero ($D_0 = \text{Data Atual} + \text{Dias até Ruptura}$).

### 3. Segurança, Autenticação JWT e RBAC

- **Autenticação Stateless**: Utiliza tokens assinados com algoritmo HMAC SHA-256 (`HS256`). O payload contém `id`, `nome`, `email` e `perfil`.
- **Controle de Acesso Baseado em Funções (RBAC)**:
  - **`ADMIN`**: Acesso irrestrito a configurações de sistema, criação de usuários com perfis arbitrários, remoção definitiva de cadastros e gestão de assinaturas.
  - **`GERENTE`**: Acesso completo ao catálogo de produtos, categorias, fornecedores, dashboards de ruptura e relatórios de auditoria. Não pode excluir usuários nem alterar permissões de perfis.
  - **`OPERADOR`**: Perfil voltado à rotina de armazém. Consulta produtos e executa movimentações de estoque (`ENTRADA`, `SAIDA`, `AJUSTE`).

### 4. Recuperação Segura de Senha e Serviço de E-mail

O sistema conta com um ciclo de recuperação de credenciais:
1. O usuário requisita a redefinição através de `POST /api/v1/auth/esqueci-senha`.
2. O sistema gera um token seguro de alta entropia de 32 bytes (`crypto.randomBytes(32).toString('hex')`) associado a uma expiração de 1 hora.
3. Dispara um e-mail formatado em HTML responsivo. O envio suporta:
   - **MailerSend API**: Envio de produção de alta entregabilidade via API REST.
   - **Nodemailer SMTP**: Transporte configurável (ex: Gmail, SendGrid, Amazon SES).
   - **Simulador Local (Ethereal / JSON transport)**: Permite testar o fluxo de e-mails em desenvolvimento sem necessidade de credenciais de produção (exibindo a URL de preview no console).
4. O usuário confirma a nova senha através de `POST /api/v1/auth/resetar-senha`, que valida a validade do token e atualiza o hash com Bcrypt.

### 5. Gestão de Assinaturas e Planos SaaS

Todo usuário registrado recebe automaticamente uma assinatura ativa inicial do plano `FREE`. O módulo de assinaturas permite gerenciar a vigência de planos (`FREE`, `BASIC`, `PRO`, `ENTERPRISE`), possibilitando integrar gateways de pagamento e bloquear acessos de contas inativas ou canceladas.

---

## 📡 Catálogo Completo de Endpoints da API

Todas as rotas da aplicação são prefixadas por `/api/v1` (com exceção do Swagger e Healthcheck).

### 🩺 Monitoramento & Documentação

| Método | Rota | Descrição | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verifica a saúde do serviço, uptime e horário do servidor | Público |
| `GET` | `/api/docs` | Interface interativa Swagger UI com testes ao vivo | Público |

---

### 🔐 Autenticação (`/api/v1/auth`)

| Método | Rota | Descrição | Corpo da Requisição (Payload) | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Cria novo operador no sistema e gera assinatura FREE | `{ "nome", "email", "senha" }` | Público |
| `POST` | `/api/v1/auth/login` | Autentica usuário e retorna token JWT + dados do plano | `{ "email", "senha" }` | Público |
| `POST` | `/api/v1/auth/esqueci-senha` | Solicita envio de token para recuperação de senha | `{ "email" }` | Público |
| `POST` | `/api/v1/auth/resetar-senha` | Efetiva a alteração da senha mediante token | `{ "token", "novaSenha" }` | Público |
| `GET` | `/api/v1/auth/me` | Retorna os dados do perfil e da assinatura do usuário autenticado | *Nenhum* | Autenticado |

---

### 👥 Gestão de Usuários (`/api/v1/usuarios`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/usuarios` | Lista usuários com paginação e busca por nome/e-mail | Query: `page`, `limit`, `search` | `ADMIN` |
| `POST` | `/api/v1/usuarios` | Cria usuário com perfil específico definido | `{ "nome", "email", "senha", "perfil" }` | `ADMIN` |
| `GET` | `/api/v1/usuarios/:id` | Obtém detalhes cadastrais de um usuário | Params: `:id` | Autenticado (Próprio ou `ADMIN`) |
| `PUT` | `/api/v1/usuarios/:id` | Atualiza nome e e-mail | `{ "nome", "email" }` | Autenticado (Próprio ou `ADMIN`) |
| `PATCH` | `/api/v1/usuarios/:id/perfil` | Modifica o nível de acesso (RBAC) do usuário | `{ "perfil" }` (`ADMIN`, `GERENTE`, `OPERADOR`) | `ADMIN` |
| `DELETE` | `/api/v1/usuarios/:id` | Remove o usuário (não permite autoexclusão) | Params: `:id` | `ADMIN` |

---

### 💳 Assinaturas & Planos (`/api/v1/assinaturas`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assinaturas/minha` | Retorna a assinatura ativa do usuário logado | *Nenhum* | Autenticado |
| `GET` | `/api/v1/assinaturas` | Lista todas as assinaturas registradas no sistema | Query: `page`, `limit` | `ADMIN` |
| `GET` | `/api/v1/assinaturas/:id` | Obtém detalhes de uma assinatura específica | Params: `:id` | `ADMIN` |
| `POST` | `/api/v1/assinaturas` | Cria ou vincula uma nova assinatura para um usuário | `{ "usuario_id", "plano", "data_inicio", "data_fim", "status" }` | `ADMIN` |
| `PATCH` | `/api/v1/assinaturas/:id/status`| Atualiza o estado da assinatura | `{ "status" }` (`ATIVO`, `INATIVO`, `CANCELADO`, `PENDENTE`) | `ADMIN` |

---

### 🏷️ Categorias (`/api/v1/categorias`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categorias` | Lista categorias com paginação e busca | Query: `page`, `limit`, `search` | Autenticado |
| `GET` | `/api/v1/categorias/:id` | Detalhes da categoria | Params: `:id` | Autenticado |
| `POST` | `/api/v1/categorias` | Cadastra nova categoria com nome único | `{ "nome", "descricao" }` | `ADMIN`, `GERENTE` |
| `PUT` | `/api/v1/categorias/:id` | Altera dados cadastrais da categoria | `{ "nome", "descricao" }` | `ADMIN`, `GERENTE` |
| `DELETE` | `/api/v1/categorias/:id` | Exclui categoria (bloqueada se houver produtos vinculados) | Params: `:id` | `ADMIN` |

---

### 🚚 Fornecedores (`/api/v1/fornecedores`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/fornecedores` | Lista fornecedores com filtros | Query: `page`, `limit`, `search` | Autenticado |
| `GET` | `/api/v1/fornecedores/:id` | Detalhes do fornecedor | Params: `:id` | Autenticado |
| `POST` | `/api/v1/fornecedores` | Cadastra fornecedor com validação de CNPJ e unicidade | `{ "nome", "cnpj", "contato", "endereco" }` | `ADMIN`, `GERENTE` |
| `PUT` | `/api/v1/fornecedores/:id` | Atualiza dados do fornecedor | `{ "nome", "cnpj", "contato", "endereco" }` | `ADMIN`, `GERENTE` |
| `DELETE` | `/api/v1/fornecedores/:id` | Remove fornecedor (bloqueado se houver produtos vinculados) | Params: `:id` | `ADMIN` |

---

### 📦 Produtos & Inteligência de Estoque (`/api/v1/produtos`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/produtos` | Lista catálogo com filtros múltiplos, busca e ordenação | Query: `page`, `limit`, `search`, `categoria_id`, `fornecedor_id`, `alerta_estoque`, `sort`, `order` | Autenticado |
| `GET` | `/api/v1/produtos/alerta-estoque` | Retorna produtos com saldo em nível de risco (`saldo <= quantidade_minima`) | *Nenhum* | Autenticado |
| `GET` | `/api/v1/produtos/risco-ruptura` | Lista produtos em alto risco de esgotamento nos próximos dias | Query: `dias` (análise, ex: 30), `limite_dias` (alerta, ex: 7) | Autenticado |
| `GET` | `/api/v1/produtos/:id` | Detalhes completos do produto com dados de fornecedor e categoria | Params: `:id` | Autenticado |
| `GET` | `/api/v1/produtos/:id/previsao-ruptura` | Estatísticas de consumo, média diária e data prevista de esgotamento do item | Params: `:id`, Query: `dias`, `limite_dias` | Autenticado |
| `POST` | `/api/v1/produtos` | Cadastra novo item com validação de SKU e integridade referencial | `{ "categoria_id", "fornecedor_id", "nome", "codigo", "descricao", "quantidade_atual", "quantidade_minima", "codigo_barras" }` | `ADMIN`, `GERENTE` |
| `PUT` | `/api/v1/produtos/:id` | Atualiza dados cadastrais do produto | `{ "categoria_id", "fornecedor_id", "nome", "codigo", "descricao", "quantidade_minima", "codigo_barras" }` | `ADMIN`, `GERENTE` |
| `POST` | `/api/v1/produtos/:id/foto` | Upload da imagem do produto (JPEG, PNG, WEBP até 5MB) | Multipart form-data: campo `foto` | `ADMIN`, `GERENTE` |
| `DELETE` | `/api/v1/produtos/:id` | Exclusão definitiva (bloqueada se existirem movimentações) | Params: `:id` | `ADMIN` |

---

### 🔄 Movimentações de Estoque (`/api/v1/movimentacoes`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/movimentacoes` | Consulta histórico de movimentações com filtros | Query: `page`, `limit`, `produto_id`, `usuario_id`, `tipo`, `data_inicio`, `data_fim` | Autenticado |
| `GET` | `/api/v1/movimentacoes/:id` | Detalhes da movimentação específica | Params: `:id` | Autenticado |
| `POST` | `/api/v1/movimentacoes` | Registra evento de inventário atômico (`ENTRADA`, `SAIDA`, `AJUSTE`) | `{ "produto_id", "tipo", "quantidade", "observacao" }` | Autenticado |

---

### 📜 Auditoria de Sistema (`/api/v1/historico`)

| Método | Rota | Descrição | Parâmetros / Payload | Nível de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/historico` | Consulta trilha de auditoria completa com filtros temporais e por entidade | Query: `page`, `limit`, `usuario_id`, `produto_id`, `movimentacao_id`, `tipo_operacao`, `data_inicio`, `data_fim` | `ADMIN`, `GERENTE` |
| `GET` | `/api/v1/historico/:id` | Detalhes do registro de auditoria | Params: `:id` | `ADMIN`, `GERENTE` |

---

## 🛡️ Tratamento Padronizado de Erros

A API adota um formato consistente para todas as respostas com falha, facilitando a interpretação e exibição amigável pelo cliente frontend:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Saldo insuficiente em estoque. Saldo disponível: 3, quantidade solicitada para saída: 10.",
    "details": {
      "saldoAtual": 3,
      "quantidadeSolicitada": 10
    }
  }
}
```

### Códigos de Erro mais Comuns

| Código HTTP | Identificador (`code`) | Motivo |
| :--- | :--- | :--- |
| `400 Bad Request` | `MISSING_REQUIRED_FIELDS` | Faltam propriedades obrigatórias no JSON enviado. |
| `400 Bad Request` | `INVALID_EMAIL` / `INVALID_CNPJ` | Formato incorreto ou documento inválido no cálculo dos dígitos verificadores. |
| `400 Bad Request` | `INVALID_TYPE` / `INVALID_QUANTITY` | Tipo de movimentação inexistente ou valor menor ou igual a zero. |
| `401 Unauthorized`| `UNAUTHORIZED` / `INVALID_TOKEN` | Token Bearer não fornecido, mal formatado ou com assinatura corrompida. |
| `401 Unauthorized`| `TOKEN_EXPIRED` | O token JWT ultrapassou seu tempo limite de validade. |
| `403 Forbidden`   | `FORBIDDEN` | O perfil do usuário logado não tem permissão para a rota solicitada. |
| `404 Not Found`   | `PRODUCT_NOT_FOUND` / `USER_NOT_FOUND` | O recurso solicitado com o ID correspondente não existe no banco. |
| `409 Conflict`    | `DUPLICATE_SKU` / `DUPLICATE_EMAIL` | Tentativa de cadastrar um SKU ou e-mail já existente. |
| `409 Conflict`    | `RESTRICTED_RELATION` | Tentativa de excluir categoria, fornecedor ou produto com registros dependentes. |
| `422 Unprocessable`| `INSUFFICIENT_STOCK` | A saída de estoque requisitada excede o saldo físico atual do armazém. |

---

## 🚀 Guia de Instalação e Execução

### Pré-requisitos
- **Node.js** v20.x ou v24.x LTS instalado.
- **MySQL** 8.0 rodando localmente ou **Docker** / **Docker Compose**.

---

### Execução em Ambiente Local

#### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/RafaelCairesSantos/KStock-API.git
cd Kstock-Api
npm install
```

#### 2. Configurar o arquivo `.env`
Copie o exemplo base:
```bash
cp .env.example .env
```
Abra o arquivo `.env` e configure suas credenciais locais do MySQL (usuário, senha, porta e nome da base).

#### 3. Executar as Migrations e Seeds
```bash
# Provisiona a base kstock_db e cria as 7 tabelas com índices e relacionamentos
npm run migrate

# Popula o banco com usuários iniciais, fornecedores, categorias e produtos para teste
npm run seed
```

> **Credenciais criadas pelo seed:**
> - **Administrador**: E-mail: `admin@kstock.com` | Senha: `Admin@123456`
> - **Operador**: E-mail: `operador@kstock.com` | Senha: `Operador@123456`

#### 4. Iniciar a API
```bash
# Em ambiente de desenvolvimento (com nodemon e reload automático)
npm run dev

# Em ambiente de produção
npm start
```

Acesse a documentação interativa:
👉 **`http://localhost:3000/api/docs`**

---

### Execução via Docker Compose

Para provisionar automaticamente o contêiner do **MySQL 8.0** e o contêiner da **KStock-API** sem necessidade de instalar o banco manualmente na máquina:

```bash
docker-compose up -d --build
```

O compose inicializa:
- O banco MySQL 8.0 na porta interna `3306` (mapeada para a porta externa `3307`).
- O volume persistente `mysql_data` para retenção dos dados.
- O contêiner Node.js executando a API na porta `3000`.

Para acompanhar os logs de execução:
```bash
docker-compose logs -f api
```

Para derrubar os serviços:
```bash
docker-compose down
```

---

## 🔧 Variáveis de Ambiente

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta TCP do servidor Express |
| `NODE_ENV` | `development` | Ambiente de execução (`development`, `production`, `test`) |
| `FRONTEND_URL` | `http://localhost:5173` | URL da interface web para composição de links de e-mail |
| `DB_HOST` | `localhost` | Endereço de host do banco MySQL |
| `DB_PORT` | `3306` | Porta do banco MySQL |
| `DB_USER` | `root` | Usuário de autenticação do MySQL |
| `DB_PASSWORD` | *(vazio)* | Senha de autenticação do MySQL |
| `DB_NAME` | `kstock_db` | Nome da base de dados |
| `DB_CONNECTION_LIMIT`| `10` | Quantidade máxima de conexões simultâneas no pool |
| `JWT_SECRET` | *(string secreta)* | Chave privada para assinatura e verificação dos tokens JWT |
| `JWT_EXPIRES_IN` | `8h` | Tempo de vida dos tokens gerados (`1h`, `8h`, `7d`) |
| `MAX_FILE_SIZE_MB` | `5` | Limite máximo em megabytes para upload de fotos de produtos |
| `SMTP_HOST` | *(opcional)* | Servidor SMTP para disparo de e-mails |
| `SMTP_PORT` | `587` | Porta do serviço SMTP |
| `SMTP_USER` | *(opcional)* | Usuário de autenticação SMTP |
| `SMTP_PASS` | *(opcional)* | Senha ou App Password do SMTP |
| `MAILERSEND_API_KEY`| *(opcional)* | Chave de API da MailerSend para disparo direto via REST |

---

## 🧪 Testes Automatizados

O projeto utiliza o **Jest** como framework de testes e o **Supertest** para execução de requisições de integração HTTP:

```bash
npm test
```

Os testes cobrem os fluxos essenciais de autenticação, recuperação de senhas, validação de regras de permissão e endpoints protegidos.

---

## 📄 Licença

Este projeto é desenvolvido para fins acadêmicos e corporativos sob a licença **ISC**. Consulte o arquivo [package.json](file:///c:/Users/41573849898/Desktop/projetoTCC/Kstock-Api/package.json) para mais detalhes.

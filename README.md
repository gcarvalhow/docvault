# DocVault — Sistema de Gestão e Aprovação de Documentos

> Avaliação N3 — Segurança da Informação · Católica SC · Prof. Edson Vaz Lopes
> Projeto **P06-A** — Gestão de Documentos: Envio e Aprovação

---

## Visão geral

DocVault é um sistema para envio, análise e aprovação de documentos internos fictícios. Solicitantes enviam documentos, analistas revisam e alteram o status, administradores gerenciam usuários e auditam o fluxo. O acesso a cada operação é controlado por perfil (RBAC) e por regra de dono do recurso, e todos os eventos relevantes são registrados em log de auditoria.

O projeto é dividido em dois componentes:

- **`backend/`** — API REST em Python/FastAPI com arquitetura Domain-Driven Design (DDD).
- **`frontend/`** — aplicação web em Next.js (App Router + TypeScript) que consome a API.

O destaque arquitetural de segurança é o mecanismo de **security stamp**: um UUID armazenado por usuário que invalida instantaneamente todos os access tokens emitidos ao realizar logout ou desativar uma conta — sem necessidade de blacklist de tokens.

---

## Stack

### Back-end

| Camada | Tecnologia |
| --- | --- |
| Linguagem / Framework | Python 3.12+ · FastAPI 0.138.0 |
| Banco de dados | PostgreSQL (provisionado via Docker) |
| ORM | SQLAlchemy 2.0.51 (assíncrono) · asyncpg 0.31.0 |
| Migrações | Alembic 1.16.1 |
| Auth / JWT | python-jose 3.5.0 · algoritmo HS256 |
| Senhas | bcrypt 5.0.0 (salt adaptativo por chamada) |
| Validação | Pydantic 2.13.4 |
| Rate limiting | slowapi 0.1.9 |
| Servidor ASGI | Uvicorn 0.49.0 |

### Front-end

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js (App Router) · React · TypeScript |
| Server state | TanStack Query v5 |
| HTTP | Axios (interceptor de refresh token) |
| Formulários | React Hook Form + Zod |
| Estilo | Tailwind CSS |

---

## Arquitetura — Domain-Driven Design (back-end)

O back-end é organizado em módulos de negócio independentes — **`identity`**, **`organization`**, **`documents`** e **`audit`** — cada um com quatro camadas:

| Camada | Diretório | Responsabilidade | Exemplos |
| --- | --- | --- | --- |
| **Domínio** | `domain/` | Regras de negócio, invariantes e políticas de autorização | `aggregates.py`, `entities.py`, `enumerations.py`, `policies.py` |
| **Aplicação** | `application/` | Casos de uso e schemas Pydantic de entrada/saída | `usecases/`, `schemas/requests.py`, `schemas/responses.py` |
| **Infraestrutura** | `infrastructure/` | Persistência assíncrona e serviços técnicos | `repositories/`, `services/` |
| **Apresentação** | `api/` | Roteamento HTTP | `api/routers/*.py` |

Cada módulo expõe um `router.py` que agrega seus routers; o `app/main.py` registra os quatro módulos.

As políticas de autorização (`identity/domain/policies.py`) são funções puras — recebem apenas tipos primitivos (`role`, `is_owner`, `status`) e retornam `bool`, sem dependências de infraestrutura, o que as torna testáveis isoladamente.

---

## Perfis de usuário

| Perfil        | Descrição                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| `solicitante` | Cria e visualiza apenas os próprios documentos                              |
| `analista`    | Visualiza todos os documentos e altera status                               |
| `admin`       | Gerencia usuários, visualiza todos os documentos e acessa logs de auditoria |

---

## Pré-requisitos

- Python 3.12+ (para rodar a API fora de container)
- Node.js 18+ (para o front-end)
- Docker e Docker Compose

---

## Instalação e execução

### Back-end (Docker Compose)

O `docker-compose.Development.yml` sobe o PostgreSQL **e** a API. O container da API aplica as migrações Alembic (`alembic upgrade head`) antes de iniciar o Uvicorn (ver `entrypoint.sh`).

```bash
# 1. Configure as variáveis de ambiente
cp backend/.env.example backend/.env.local
# Edite backend/.env.local e defina um JWT_SECRET_KEY aleatório

# 2. Suba banco + API
docker compose -f backend/docker/docker-compose.Development.yml up --build
```

A API fica disponível em `http://localhost:8000`, com documentação interativa automática:

- **Swagger UI**: `http://localhost:8000/docs`
- **Redoc**: `http://localhost:8000/redoc`

### Front-end

```bash
cd frontend
npm install
npm run dev
# Acesse: http://localhost:3000
```

---

## Primeiro acesso (bootstrap)

Não há script de seed automático. A criação da organização inicial e do usuário administrador é feita via endpoint público de bootstrap:

```http
POST /organization
Content-Type: application/json

{
  "organization": {
    "name": "Minha Empresa"
  },
  "user": {
    "email": "admin@docvault.dev",
    "password": "SenhaForte@2026!",
    "confirm_password": "SenhaForte@2026!"
  }
}
```

A resposta retorna o `id` (UUID) da organização criada. A role do usuário é **forçada para `admin`** na camada de aplicação. Usuários adicionais são criados pelo administrador autenticado.

---

## Estrutura do repositório

```
docvault/
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── entrypoint.sh                  # alembic upgrade head + uvicorn
│   ├── alembic.ini
│   ├── .env.example
│   ├── docker/
│   │   └── docker-compose.Development.yml   # PostgreSQL + API
│   ├── migrations/                    # Migrações Alembic
│   └── app/
│       ├── main.py                    # FastAPI; CORS, rate limit, security headers, handlers
│       ├── config.py                  # Settings via pydantic-settings (.env.local)
│       ├── database.py                # Engine/sessão assíncronos SQLAlchemy
│       ├── dependencies.py            # get_db (sessão por request com transação)
│       ├── core/
│       │   ├── domain/model.py        # Base Model (id UUID, created_at, updated_at, is_active)
│       │   ├── infrastructure/        # Repositório genérico assíncrono
│       │   ├── schemas/               # Respostas compartilhadas (IdentifierResponse)
│       │   └── shared/                # NonEmptyStr, formatação de erros, tenant
│       └── modules/
│           └── <módulo>/              # identity | organization | documents | audit
│               ├── domain/            # aggregates, entities, enumerations, policies
│               ├── application/       # usecases/ + schemas/ (requests, responses)
│               ├── infrastructure/    # repositories/ + services/
│               ├── api/routers/       # rotas HTTP FastAPI
│               └── router.py          # agrega os routers do módulo
└── frontend/                          # Aplicação Next.js (App Router)
    └── src/
        ├── app/                       # Rotas (públicas: login/register; privadas: documents, users, audit, settings)
        ├── components/                # UI e layout
        └── lib/                       # api/, auth/, hooks/, types/, utils/
```

---

## Banco de dados

O PostgreSQL é provisionado via Docker. O schema é versionado e aplicado por **migrações Alembic** (`migrations/versions/`), executadas no start do container.

| Tabela | Colunas principais | Nota de segurança |
| --- | --- | --- |
| `organizations` | `id` (UUID PK), `name` (varchar 150, unique), `is_active` | |
| `users` | `id` (UUID PK), `email` (varchar 254, unique, indexado), `password_hash` (varchar 255), `organization_id` (FK), `role` (enum), `security_stamp` (UUID), `is_active` | `security_stamp` é o mecanismo de invalidação imediata de access tokens |
| `refresh_tokens` | `id` (UUID PK), `user_id` (FK), `token_hash` (SHA-256, varchar 64, unique), `expires_at`, `is_revoked`, `revoked_at` | Apenas o hash do token é persistido — nunca o valor original |
| `documents` | `id` (UUID PK), `title`, `category` (enum), `status` (enum), `owner_id` (FK), `organization_id` (FK), `is_active` | Acesso restrito por dono/perfil |
| `audit_logs` | `id` (UUID PK), `action` (enum), `user_email`, `ip`, detalhes e timestamp | Trilha de auditoria de eventos críticos |

> As chaves primárias são UUIDs, não inteiros sequenciais — evita ataques de enumeração de IDs.

**Status de documento:** `pendente` · `em_analise` · `aprovado` · `rejeitado`
**Categorias:** `contrato` · `relatorio` · `termo` · `proposta` · `declaracao` · `outro`

---

## Segurança implementada

### Resumo

| #  | Controle | Arquivo | Ameaça mitigada |
| --- | --- | --- | --- |
| 1  | Hash de senha com bcrypt | `identity/infrastructure/services/password_service.py` | Exposição de senhas em vazamento de banco |
| 2  | JWT HS256 com expiração curta (30 min) | `identity/infrastructure/services/jwt_token_service.py` | Tokens de longa duração válidos após roubo |
| 3  | Security Stamp — invalidação imediata de tokens | `identity/domain/aggregates.py` · `identity/dependencies.py` | Reutilização de access token após logout/desativação |
| 4  | Refresh token armazenado como hash SHA-256 | `identity/infrastructure/services/jwt_token_service.py` · `identity/domain/entities.py` | Roubo de tokens diretamente do banco |
| 5  | Cookie httpOnly + samesite=strict | `identity/api/routers/auth_router.py` | XSS (roubo de token) e CSRF |
| 6  | RBAC + regra de dono do recurso | `identity/domain/policies.py` · `identity/dependencies.py` | Escalada de privilégio vertical e horizontal |
| 7  | Validação de entrada com Pydantic | `*/application/schemas/requests.py` · `core/shared/validators.py` | Dados malformados, bypass de regras de negócio |
| 8  | Rate limiting no login (10 / 15 min por IP) | `identity/api/routers/auth_router.py` · `main.py` | Força bruta de credenciais |
| 9  | Cabeçalhos HTTP de segurança (CSP, HSTS, X-Frame-Options, nosniff) | `main.py` | Clickjacking, MIME sniffing, downgrade HTTP |
| 10 | CORS com whitelist de origens | `main.py` | Requisições cross-origin não autorizadas |
| 11 | Tratamento global de erros de validação | `main.py` | Vazamento de stack trace / detalhes internos |
| 12 | Log de auditoria de eventos críticos | `audit/` · `identity/application/usecases` | Falta de rastreabilidade de ações |
| 13 | Segredos fora do repositório | `config.py` · `.gitignore` | Exposição de credenciais no histórico Git |

---

### 1. Hash de senha com bcrypt

`PasswordService.hash()` usa `bcrypt.hashpw(plain.encode(), bcrypt.gensalt())` — o salt é gerado a cada chamada, garantindo que senhas idênticas produzam hashes distintos. A verificação usa `bcrypt.checkpw()`, com comparação em tempo constante (resistente a *timing attacks*).

**Ameaça mitigada:** em vazamento do banco, o atacante obtém apenas hashes bcrypt. O custo adaptativo torna a quebra offline proibitiva e o salt único invalida *rainbow tables*.

---

### 2. JWT HS256 com expiração curta

`JwtTokenService.create_access_token()` emite tokens com validade de 30 minutos (configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`), com os *claims* `sub`, `role`, `security_stamp`, `type`, `iat` e `exp`. O algoritmo HS256 assina com `JWT_SECRET_KEY`.

**Ameaça mitigada:** tokens interceptados têm janela de uso limitada a 30 minutos e não podem ser modificados sem invalidar a assinatura.

---

### 3. Security Stamp — invalidação imediata de tokens (destaque arquitetural)

**Problema:** access tokens JWT são *stateless* — permanecem válidos até `exp` mesmo após logout. A solução clássica (blacklist) exige armazenamento centralizado e consulta a cada requisição.

**Solução:** o agregado `User` possui um `security_stamp` (UUID) incluído em todos os tokens. Em toda requisição autenticada, `get_current_user()` (`identity/dependencies.py`) compara o stamp do token com o do banco:

```python
if str(user.security_stamp) != security_stamp:
    raise _401
```

`User.logout()` e `User.deactivate()` chamam `regenerate_stamp()`, atribuindo um novo UUID. Após a persistência, todos os tokens antigos passam a ser rejeitados com 401, mesmo sem terem expirado.

**Resultado:** invalidação com semântica *stateful* usando apenas uma coluna UUID — sem blacklist nem cache distribuído.

**Ameaça mitigada:** reutilização de access token após logout e persistência de sessão após desativação de conta.

---

### 4. Refresh token armazenado como hash SHA-256

`JwtTokenService.create_refresh_token()` gera o token e computa `hashlib.sha256(token).hexdigest()`. Apenas o hash é persistido em `refresh_tokens.token_hash`; o valor original vai ao cliente via cookie e nunca é armazenado. No logout, `revoke_all_refresh_tokens()` marca os tokens com `is_revoked=True`.

**Ameaça mitigada:** comprometimento da tabela `refresh_tokens` expõe apenas hashes irrecuperáveis — não tokens funcionais.

---

### 5. Cookie httpOnly + samesite=strict

O refresh token é enviado como cookie (`identity/api/routers/auth_router.py`):

| Atributo | Valor | Proteção |
| --- | --- | --- |
| `httponly=True` | sempre | JavaScript não acessa o cookie — mitiga XSS |
| `secure=True` | fora de `development` | Transmitido apenas via HTTPS |
| `samesite="strict"` | sempre | Não enviado em requisições cross-site — mitiga CSRF |
| `path="/identity/auth"` | sempre | Enviado apenas às rotas de autenticação |
| `max_age` | 7 dias | Alinhado à expiração do refresh token |

O access token trafega no corpo da resposta e no cabeçalho `Authorization: Bearer`.

---

### 6. RBAC + regra de dono do recurso

`identity/domain/policies.py` define a autorização como funções puras: `can_manage_users`, `can_view_audit_logs`, `can_create_document`, `can_view_all_documents`, `can_view_document`, `can_edit_document`, `can_delete_document`, `can_change_document_status`. `require_role(*roles)` e `get_current_user()` (`identity/dependencies.py`) aplicam autenticação e restrição por perfil nos routers.

**Ameaça mitigada:** escalada de privilégio vertical (perfil chamando rota restrita) e horizontal (acessar documentos de outro usuário).

---

### 7. Validação de entrada com Pydantic

Todos os corpos de requisição são `BaseModel` — nenhum dicionário bruto chega à lógica de negócio. `EmailStr` valida formato; enums (`UserRole`, `DocumentStatus`, `DocumentCategory`) rejeitam valores arbitrários com 422; `NonEmptyStr` aplica `min_length=1` com *strip*; `@model_validator passwords_match` faz validação cross-field.

---

### 8. Rate limiting no login

`main.py` configura um `Limiter` (slowapi) por IP e o endpoint `POST /identity/auth/login` aplica `@limiter.limit("10/15 minutes")`. Excedido o limite, a API responde **429** com `Too many requests`.

**Ameaça mitigada:** ataque de força bruta de credenciais.

---

### 9. Cabeçalhos HTTP de segurança

Um middleware em `main.py` adiciona a todas as respostas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` e `Content-Security-Policy: default-src 'none'` (exceto nas rotas de documentação).

**Ameaça mitigada:** clickjacking, MIME sniffing e downgrade para HTTP.

---

### 10. CORS com whitelist de origens

`CORSMiddleware` em `main.py` usa `settings.allowed_origins` (de `.env.local`), com `allow_credentials=True` para permitir cookies em requisições cross-origin do front-end.

---

### 11. Tratamento global de erros de validação

`@app.exception_handler(RequestValidationError)` formata os erros Pydantic via `_format_validation_errors()`, retornando JSON 422 padronizado — sem expor anotações de tipo, nomes de classes ORM ou stack traces.

---

### 12. Log de auditoria

O módulo `audit` registra os eventos críticos do sistema, consultáveis pelo admin em `GET /audit/logs` (com filtros por ação, e-mail, paginação). Eventos auditados (`audit/domain/enumerations.py`):

- `LOGIN_SUCCESS` / `LOGIN_FAILED` / `LOGOUT`
- `ACCESS_DENIED`
- `DOC_CREATED` / `DOC_EDITED` / `DOC_STATUS_CHANGED` / `DOC_DELETED`
- `USER_CREATED` / `USER_DEACTIVATED`

---

### 13. Segredos fora do repositório

`config.py` usa `pydantic-settings` para carregar variáveis de `.env.local`, excluído do versionamento via `.gitignore`. `JWT_SECRET_KEY` e `DATABASE_URL` nunca aparecem em código versionado.

---

## Endpoints da API

### Autenticação — `/identity/auth`

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| POST | `/identity/auth/login` | público (rate limit 10/15min) | Login; `access_token` no corpo + cookie `refresh_token` |
| POST | `/identity/auth/logout` | autenticado | Revoga tokens e regenera o security stamp |
| POST | `/identity/auth/refresh` | cookie | Emite novo par de tokens a partir do refresh token |

### Usuários — `/identity/users`

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/identity/users` | autenticado | Listar usuários (`include_inactive` opcional) |
| GET | `/identity/users/{id}` | autenticado | Detalhe de usuário |
| DELETE | `/identity/users/{id}` | admin | Desativar usuário |

### Organização — `/organization`

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| POST | `/organization` | público | Bootstrap: cria organização + admin inicial |
| GET | `/organization` | autenticado | Dados da própria organização |
| PUT | `/organization/{id}` | admin | Atualizar organização |

### Documentos — `/documents`

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| POST | `/documents` | solicitante, admin | Criar documento |
| GET | `/documents` | todos | Listar (filtrado por perfil/dono) |
| GET | `/documents/{id}` | dono ou analista/admin | Detalhe |
| PUT | `/documents/{id}` | dono (se pendente) ou admin | Editar |
| PATCH | `/documents/{id}/status` | analista, admin | Alterar status |
| DELETE | `/documents/{id}` | dono (se pendente) ou admin | Excluir |

### Auditoria — `/audit`

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/audit/logs` | admin | Logs de auditoria (filtros: `action`, `user_email`, `limit`, `offset`) |

### Saúde

| Método | Rota | Perfil | Descrição |
| --- | --- | --- | --- |
| GET | `/health` | público | Verificação de saúde do serviço |

> Documentação interativa completa em `/docs` (Swagger UI) e `/redoc`.
> Contratos detalhados por módulo em [`docs/integration/`](docs/integration).

---

## Matriz de permissões

| Funcionalidade          | Solicitante           | Analista | Admin |
| ----------------------- | --------------------- | -------- | ----- |
| Criar documento         | ✓                     | ✗        | ✓     |
| Ver próprios documentos | ✓                     | ✓        | ✓     |
| Ver todos os documentos | ✗                     | ✓        | ✓     |
| Editar documento        | Só próprio (pendente) | ✗        | ✓     |
| Excluir documento       | Só próprio (pendente) | ✗        | ✓     |
| Alterar status          | ✗                     | ✓        | ✓     |
| Gerenciar usuários      | ✗                     | ✗        | ✓     |
| Visualizar logs         | ✗                     | ✗        | ✓     |

---

## O que não foi implementado (limitações conhecidas)

- **HTTPS** — requer configuração de certificado TLS no ambiente de produção; em desenvolvimento o tráfego não é criptografado em trânsito.
- **Testes automatizados** — nenhum teste unitário ou de integração foi implementado.

---

## Documentação do projeto

- **[docs/integration/](docs/integration)** — contratos de integração por módulo (`identity`, `organization`, `documents`, `audit`).
- **[docs/templates/integration.md](docs/templates/integration.md)** — template para novas docs de integração.

---

## Integrantes do grupo

| Nome                      | GitHub                                                          |
| ------------------------- | --------------------------------------------------------------- |
| Gabriel da Silva Carvalho | [@gabrielcarvallho](https://github.com/gabrielcarvallho)        |
| Adrian Cesar Gonçalves    | [@adrian-cesar](https://github.com/adrian-cesar)                |
| Renato Colin Neto         | [@RenatoColin](https://github.com/RenatoColin)                  |
| Igor Thiago Seberino      | [@igorSeberino](https://github.com/igorSeberino)                |

---

*Dados de demonstração são todos fictícios. Nenhum dado real de pessoa foi utilizado.*

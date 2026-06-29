# DocVault — Sistema de Gestão e Aprovação de Documentos

> Avaliação N3 — Segurança da Informação · Católica SC · Prof. Edson Vaz Lopes
> Projeto **P06-A** — Gestão de Documentos: Envio e Aprovação

---

## Visão geral

DocVault é um sistema web para envio, análise e aprovação de documentos internos, com foco em **segurança aplicada e verificável** — controles demonstrados no código, não apenas prometidos.

Este repositório contém o **back-end** do projeto, uma API construída em Python/FastAPI seguindo uma arquitetura modular orientada a domínio (DDD). O desenvolvimento está em andamento e este README descreve o **escopo atualmente implementado**.

> **Status do projeto:** fase inicial. A base de domínio e os fluxos de identidade/organização estão em construção (ver [Escopo atual](#escopo-atual) e [Estado de implementação](#estado-de-implementação)). Os fluxos de documentos, auditoria e administração descritos na apresentação do produto são a **visão de longo prazo** e ainda não foram implementados.

---

## Stack

| Camada       | Tecnologia                                          |
| ------------ | --------------------------------------------------- |
| Linguagem    | Python 3.12                                         |
| Framework    | FastAPI                                             |
| ORM          | SQLAlchemy 2 (async)                                |
| Banco        | PostgreSQL                                          |
| Validação    | Pydantic / `pydantic-settings`                      |
| Auth         | JWT (`python-jose`) — access token + refresh token  |
| Senhas       | `bcrypt`                                            |
| Servidor     | Uvicorn (ASGI)                                      |
| Infra local  | Docker / Docker Compose (PostgreSQL)                |

---

## Arquitetura

O back-end segue uma organização **modular por domínio**. Cada módulo de negócio isola seu domínio, esquemas, serviços, casos de uso e infraestrutura; o pacote `core` concentra o que é compartilhado.

```
backend/
├── app/
│   ├── main.py                 # Criação do app FastAPI, CORS e handler de validação
│   ├── config.py               # Settings (env_file = .env.local)
│   ├── database.py             # Engine e session factory assíncronos (SQLAlchemy)
│   ├── dependencies.py         # get_db — sessão por request com transação
│   ├── core/
│   │   ├── domain/             # Model base (id, created_at, updated_at, is_active)
│   │   ├── infrastructure/     # AsyncRepository genérico (CRUD + find_async)
│   │   ├── Schemas/            # Respostas compartilhadas (IdentifierResponse)
│   │   └── shared/             # Validadores (NonEmptyStr) e formatação de erros
│   └── modules/
│       ├── identity/           # Usuários, autenticação e tokens
│       │   ├── domain/         # Aggregate User, entidade RefreshToken, enum UserRole
│       │   ├── schemas/        # Requests (ex.: CreateUserRequest)
│       │   ├── services/       # PasswordService (bcrypt)
│       │   ├── usecases/       # Casos de uso de identidade
│       │   └── infrastructure/ # UserRepository
│       └── organization/       # Organizações (multi-tenant)
│           ├── domain/         # Aggregate Organization
│           ├── schemas/        # Requests de criação
│           ├── usecases/       # Caso de uso de primeiro acesso
│           ├── routers/        # Endpoint de criação de organização
│           └── infrastructure/ # OrganizationRepository
├── docker/
│   └── docker-compose.Development.yml   # PostgreSQL para desenvolvimento
└── Dockerfile
```

**Princípios adotados:**

- **Separação de camadas:** os _schemas_ Pydantic validam formato e obrigatoriedade; os _use cases_ concentram a regra de negócio e a persistência; os _routers_ apenas orquestram.
- **Relações por identificador:** aggregates se relacionam via `*_id` (ex.: `organization_id`), nunca recebendo o objeto relacionado diretamente.
- **Repositório genérico:** `AsyncRepository[T]` oferece `save`, `update`, `get_by_id`, `delete`, `list_all` e `find_async` reutilizáveis por todos os módulos.

---

## Perfis de usuário

Definidos no enum `UserRole` (`app/modules/identity/domain/enumerations.py`):

| Perfil        | Valor          | Descrição                                                                   |
| ------------- | -------------- | --------------------------------------------------------------------------- |
| `admin`       | `admin`        | Usuário administrador inicial, criado no primeiro acesso da organização     |
| `analista`    | `analista`     | (Reservado) Análise e mudança de status de documentos                       |
| `solicitante` | `solicitante`  | (Reservado) Criação e visualização dos próprios documentos                  |

> Os perfis `analista` e `solicitante` já existem no domínio, mas os fluxos que os utilizam (documentos e aprovação) ainda não foram implementados.

---

## Escopo atual

O trabalho atual está concentrado em dois fluxos, especificados em [`docs/specs/backend/`](docs/specs/backend):

### 1. Primeiro acesso — organização + admin ([spec 001](docs/specs/backend/001-work-renato.md))

Criação da organização e do primeiro usuário administrador em uma **única transação**.

- O `email` deve ser válido e único; `name` da organização obrigatório e disponível.
- `password` e `confirm_password` obrigatórios e iguais (validado no schema).
- A role do usuário é **forçada para `admin`** na camada de aplicação, evitando elevação de privilégio via payload.
- Endpoint público (é a criação da primeira conta).

### 2. Autenticação — login com JWT ([spec 002](docs/specs/backend/002-work-mandas.md))

Login por e-mail/senha com emissão de tokens.

- **Access token (JWT)** retornado no corpo, contendo `sub`, `role`, `security_stamp` e `exp`.
- **Refresh token** entregue via cookie `HttpOnly`, persistido **como hash** (SHA-256) vinculado ao usuário, com expiração.
- Falha de autenticação (usuário inexistente, inativo ou senha incorreta) retorna sempre o **mesmo 401 genérico** (`Invalid credentials`), evitando enumeração de usuários.

---

## Segurança implementada

Controles de segurança presentes (ou desenhados) na camada de domínio/serviços atual:

| Controle                          | Onde no código                                  | Risco reduzido                                  |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Hash de senha (bcrypt)            | `modules/identity/services/password_service.py` | Vazamento de senha em texto puro                |
| Refresh token armazenado como hash| `modules/identity/domain/entities.py`           | Reuso de token vazado do banco                  |
| Refresh token em cookie HttpOnly  | spec 002 / router de auth                       | XSS roubando o token de sessão                  |
| `security_stamp` por usuário      | `modules/identity/domain/aggregates.py`         | Invalidação de sessões após logout/desativação  |
| Role forçada a `admin` no backend | `modules/organization/usecases/...`             | Elevação de privilégio via payload              |
| Erro 401 genérico no login        | spec 002 / use case de auth                     | Enumeração de usuários                          |
| Validação no servidor (Pydantic)  | `schemas/` de cada módulo + `core/shared`       | Entrada inválida ou maliciosa                   |
| Segredos fora do repositório      | `config.py` (`.env.local`) + `.gitignore`       | Vazamento de chaves no Git                      |
| Criação transacional org + admin  | `dependencies.py` (`session.begin`) + use case  | Estado inconsistente em falha parcial           |

---

## Pré-requisitos

- Python 3.12+
- Docker e Docker Compose (para o PostgreSQL de desenvolvimento)

---

## Instalação e execução (desenvolvimento)

> Algumas peças ainda estão sendo montadas — ver [Estado de implementação](#estado-de-implementação). Os passos abaixo descrevem o fluxo de desenvolvimento pretendido.

```bash
# 1. Subir o PostgreSQL de desenvolvimento
docker compose -f backend/docker/docker-compose.Development.yml up -d

# 2. Criar e ativar o ambiente virtual
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate

# 3. Instalar dependências
#    (requirements.txt ainda a ser versionado — ver pendências)
pip install fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg \
            pydantic-settings python-jose[cryptography] bcrypt

# 4. Configurar variáveis de ambiente em backend/.env.local
#    (ver seção "Configuração")

# 5. Subir a API
cd backend
uvicorn app.main:app --reload --port 8000
# Health check: http://localhost:8000/health
# Docs (Swagger): http://localhost:8000/docs
```

---

## Configuração

As variáveis são lidas de `backend/.env.local` (`app/config.py`). Nunca commitar este arquivo.

| Variável                      | Obrigatória | Padrão                       | Descrição                                  |
| ----------------------------- | ----------- | ---------------------------- | ------------------------------------------ |
| `environment`                 | não         | `development`                | `development` / `staging` / `production`   |
| `database_url`                | **sim**     | —                            | URL async do PostgreSQL                     |
| `jwt_secret_key`              | **sim**     | —                            | Segredo para assinatura dos JWT             |
| `access_token_expire_minutes` | não         | `30`                         | Validade do access token                    |
| `refresh_token_expire_days`   | não         | `7`                          | Validade do refresh token                   |
| `allowed_origins`             | não         | `["http://localhost:3000"]`  | Origens permitidas no CORS                  |

Exemplo de `backend/.env.local` compatível com o Docker Compose:

```env
environment=development
database_url=postgresql+asyncpg://docvault:docvault@localhost:5432/docvault
jwt_secret_key=troque-por-uma-string-longa-e-aleatoria
access_token_expire_minutes=30
refresh_token_expire_days=7
```

---

## Estado de implementação

| Componente                                   | Status            |
| -------------------------------------------- | ----------------- |
| `core` (Model base, AsyncRepository, shared) | ✅ Implementado    |
| Domínio Identity (User, RefreshToken, roles) | ✅ Implementado    |
| `PasswordService` (bcrypt)                   | ✅ Implementado    |
| Domínio Organization                         | ✅ Implementado    |
| Schema `CreateUserRequest`                   | ✅ Implementado    |
| Use case de primeiro acesso (Organization)   | 🚧 Em construção   |
| `UserUseCase` (Identity)                     | 🚧 A implementar   |
| `JwtTokenService` + fluxo de login           | 🚧 A implementar   |
| Roteamento registrado no `main.py`           | 🚧 A implementar   |
| `requirements.txt`                           | ⬜ Pendente        |
| `.env.example`                               | ⬜ Pendente        |
| Módulo de documentos / aprovação             | ⬜ Não iniciado    |
| Logs de auditoria                            | ⬜ Não iniciado    |
| Gestão de usuários (admin)                   | ⬜ Não iniciado    |
| Front-end                                    | ⬜ Não iniciado    |

### Pendências conhecidas

- Os módulos `organization/usecases`, `organization/schemas` e `organization/routers` estão em diretórios duplicados (`usecases/usecases/`, `schemas/schemas/`, `routers/routers/`) que não correspondem aos caminhos de import usados no código — precisam ser realocados conforme as specs.
- `app/main.py` ainda traz o título de outro projeto (`SGG Automation — DOM Med`) e importa de `backend.app.core.shared` em vez de `app.core.shared`; nenhum router está incluído no app.
- O caso de uso de organização importa `UserUseCase`, e a spec 002 referencia `JwtTokenService`, ambos ainda não presentes no repositório.

---

## Estrutura de pastas do repositório

```
docvault/
├── README.md
├── backend/                    # API Python/FastAPI (ver "Arquitetura")
└── docs/
    ├── work-guide.md           # Fluxo de branch, commit, push e PR
    └── specs/
        └── backend/
            ├── 001-work-renato.md   # Primeiro acesso (org + admin)
            ├── 002-work-mandas.md   # Autenticação (login JWT)
            └── 003-work-adrian.md   # (escopo a definir)
```

---

## Documentação do projeto

- **[docs/work-guide.md](docs/work-guide.md)** — como criar branch, commitar, dar push e abrir Pull Request.
- **[docs/specs/backend/](docs/specs/backend)** — specs de funcionalidade por desenvolvedor (definem branch, commit, PR e escopo).

---

## Integrantes do grupo

| Nome                      | GitHub                                                    |
| ------------------------- | --------------------------------------------------------- |
| Igor Thiago Seberino      | [@igorSeberino](https://github.com/igorSeberino)          |
| Adrian Cesar Gonçalves    | [@adrian-cesar](https://github.com/adrian-cesar)          |
| Renato Colin Neto         | [@RenatoColin](https://github.com/RenatoColin)            |
| Gabriel da Silva Carvalho | [@gabrielcarvallho](https://github.com/gabrielcarvallho)  |

---

*Dados de demonstração são todos fictícios. Nenhum dado real de pessoa foi utilizado.*

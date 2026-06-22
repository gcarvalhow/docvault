# DocVault — Sistema de Gestão e Aprovação de Documentos

> Avaliação N3 — Segurança da Informação · Católica SC · Prof. Edson Vaz Lopes
> Projeto **P06-A** — Gestão de Documentos: Envio e Aprovação

---

## Visão geral

DocVault é uma API para envio, análise e aprovação de documentos internos fictícios. Usuários enviam documentos, analistas revisam e alteram status, administradores gerenciam usuários. O acesso a cada operação é controlado por perfil (RBAC) e por regra de dono do recurso.

O back-end foi reescrito de Node.js/Express para Python/FastAPI com arquitetura Domain-Driven Design (DDD), com foco em implementar controles de segurança mais robustos. O destaque arquitetural é o mecanismo de **security stamp**: um UUID armazenado por usuário que invalida instantaneamente todos os access tokens emitidos ao realizar logout ou desativar uma conta — sem necessidade de blacklist de tokens.

O diretório `legacy/` contém a implementação original em Node.js/Express/SQLite, mantida como referência histórica.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Back-end | Python 3.12+ · FastAPI 0.138.0 |
| Banco de dados | PostgreSQL (provisionado via Docker) |
| ORM | SQLAlchemy 2.0.51 (assíncrono) · asyncpg 0.31.0 |
| Auth / JWT | python-jose 3.5.0 · algoritmo HS256 |
| Senhas | bcrypt 5.0.0 (salt adaptativo por chamada) |
| Validação | Pydantic 2.13.4 |
| Servidor ASGI | Uvicorn 0.49.0 |
| Legado (referência) | Node.js + Express + SQLite (`legacy/`) |

---

## Arquitetura — Domain-Driven Design

O back-end é organizado em módulos independentes (`identity`, `organization`), cada um com quatro camadas:

| Camada | Responsabilidade | Exemplos de arquivo |
| --- | --- | --- |
| **Domínio** | Regras de negócio, invariantes e políticas de autorização | `aggregates.py`, `entities.py`, `policies.py` |
| **Aplicação** | Orquestração de casos de uso sem dependência de infraestrutura | `auth_usecases.py`, `user_usecases.py` |
| **Infraestrutura** | Persistência assíncrona via SQLAlchemy/PostgreSQL | `repositories.py` |
| **Apresentação** | Roteamento HTTP e serialização Pydantic | `auth_router.py`, `schemas/` |

As políticas de autorização (`policies.py`) são funções puras — recebem apenas tipos primitivos (`role`, `is_owner`, `status`) e retornam `bool`, sem dependências de infraestrutura, o que as torna testáveis isoladamente.

---

## Perfis de usuário

| Perfil        | Descrição                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| `solicitante` | Cria e visualiza apenas os próprios documentos                              |
| `analista`    | Visualiza documentos pendentes e atribuídos, altera status e comenta        |
| `admin`       | Gerencia usuários, visualiza todos os documentos e acessa logs de auditoria |

---

## Pré-requisitos

- Python 3.12+
- Docker e Docker Compose (para provisionar o PostgreSQL)
- pip (incluso no Python 3.12+)

---

## Instalação e execução

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com seus valores

# 2. Build da imagem
docker build -t api-hub-dommed .

# 3. Execute o container
docker run --rm --network dom-med-dev --env-file .env.local -p 8000:8000 api-hub-dommed
```

O FastAPI gera documentação interativa automática disponível em:

- **Swagger UI**: `http://localhost:8000/docs`
- **Redoc**: `http://localhost:8000/redoc`

---

## Primeiro acesso (bootstrap)

O novo back-end não possui script de seed automático. A criação da organização inicial e do usuário administrador é feita via endpoint público de bootstrap:

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

A resposta retorna o `id` (UUID) da organização criada. Usuários adicionais são criados pelo administrador autenticado.

---

## Estrutura do repositório

```
backend/
├── requirements.txt
├── .env.local                         # Variáveis de ambiente (não versionado)
├── docker/
│   └── docker-compose.Development.yml
└── app/
    ├── main.py                        # Ponto de entrada FastAPI; CORS e handlers globais
    ├── config.py                      # Settings via pydantic-settings (.env.local)
    ├── database.py                    # Engine assíncrono SQLAlchemy
    ├── dependencies.py                # get_db, get_current_user, require_role
    ├── core/
    │   ├── domain/
    │   │   └── model.py               # Base Model (id UUID, created_at, updated_at, is_active)
    │   ├── infrastructure/
    │   │   └── repository.py          # Repositório genérico assíncrono
    │   └── shared/
    │       ├── validators.py          # NonEmptyStr (Pydantic)
    │       └── errors.py
    └── modules/
        └── <módulo>/                  # Cada módulo segue esta estrutura
            ├── domain/
            │   ├── aggregates.py      # Agregado raiz com regras de negócio
            │   ├── entities.py        # Entidades filhas do agregado
            │   ├── enumerations.py    # Enums do domínio
            │   └── policies.py        # Funções puras de autorização
            ├── infrastructure/
            │   └── repositories/      # Implementações de repositório
            ├── services/              # Serviços de domínio
            ├── usecases/              # Casos de uso da aplicação
            ├── schemas/
            │   ├── requests.py        # Schemas de entrada (Pydantic)
            │   └── responses.py       # Schemas de saída (Pydantic)
            └── routers/               # Rotas HTTP FastAPI
```

---

## Banco de dados

O PostgreSQL é provisionado via Docker (`docker-compose.Development.yml`). O schema é criado pelo SQLAlchemy na inicialização.

| Tabela | Colunas principais | Nota de segurança |
| --- | --- | --- |
| `organizations` | `id` (UUID PK), `name` (varchar 150, unique), `is_active` | |
| `users` | `id` (UUID PK), `email` (varchar 254, unique, indexado), `password_hash` (varchar 255), `organization_id` (FK), `role` (enum), `security_stamp` (UUID), `is_active` | `security_stamp` é o mecanismo de invalidação imediata de access tokens |
| `refresh_tokens` | `id` (UUID PK), `user_id` (FK), `token_hash` (SHA-256, varchar 64, unique), `expires_at`, `is_revoked`, `revoked_at` | Apenas o hash do token é persistido — nunca o valor original |

> As chaves primárias são UUIDs, não inteiros sequenciais. Isso evita ataques de enumeração de IDs (um atacante não pode deduzir IDs válidos a partir de um ID conhecido).

---

## Segurança implementada

### Resumo

| # | Controle | Arquivo | Ameaça mitigada |
| --- | --- | --- | --- |
| 1 | Hash de senha com bcrypt | `services/password_service.py` | Exposição de senhas em texto puro em vazamento de banco |
| 2 | JWT HS256 com expiração curta (30 min) | `services/jwt_token_service.py` | Tokens de longa duração permanecem válidos após roubo |
| 3 | Security Stamp — invalidação imediata de tokens | `domain/aggregates.py` · `dependencies.py` | Reutilização de access token após logout ou desativação de conta |
| 4 | Refresh token armazenado como hash SHA-256 | `services/jwt_token_service.py` · `domain/entities.py` | Roubo de tokens diretamente do banco de dados |
| 5 | Cookie httpOnly + samesite=strict | `routers/auth_router.py` | XSS (roubo de token via JavaScript) e CSRF |
| 6 | RBAC + regra de dono do recurso | `domain/policies.py` · `dependencies.py` | Escalada de privilégio horizontal e vertical |
| 7 | Validação de entrada com Pydantic | `schemas/requests.py` · `core/shared/validators.py` | Dados malformados, enumeração de campos, bypass de regras de negócio |
| 8 | CORS com whitelist de origens | `main.py` | Requisições cross-origin não autorizadas com credenciais |
| 9 | Tratamento global de erros de validação | `main.py` | Vazamento de stack trace e detalhes internos na resposta |
| 10 | Segredos fora do repositório | `config.py` · `.gitignore` | Exposição acidental de credenciais no histórico Git |

---

### 1. Hash de senha com bcrypt

`PasswordService.hash()` em `services/password_service.py` usa `bcrypt.hashpw(plain.encode(), bcrypt.gensalt())` — o salt é gerado automaticamente a cada chamada, garantindo que duas senhas idênticas produzam hashes distintos. A verificação usa `bcrypt.checkpw()`, que realiza comparação em tempo constante, resistente a ataques de temporização (*timing attacks*).

**Ameaça mitigada:** em caso de vazamento do banco de dados, o atacante obtém apenas hashes bcrypt. O custo adaptativo do algoritmo torna a quebra por força bruta offline computacionalmente proibitiva. O salt único por senha invalida o uso de *rainbow tables* pré-computadas.

---

### 2. JWT HS256 com expiração curta

`JwtTokenService.create_access_token()` em `services/jwt_token_service.py` emite tokens com validade de 30 minutos (configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`). O token carrega os seguintes *claims*: `sub` (UUID do usuário), `role`, `security_stamp`, `type`, `iat` e `exp`.

O algoritmo HS256 assina o token com a chave `JWT_SECRET_KEY`, impedindo que um atacante forge tokens sem posse dessa chave.

**Ameaça mitigada:** tokens interceptados em logs, cabeçalhos ou trânsito de rede têm uma janela de uso limitada a 30 minutos. Um atacante que obtém um token não consegue modificar seus *claims* sem invalidar a assinatura.

---

### 3. Security Stamp — invalidação imediata de tokens (destaque arquitetural)

**Problema:** access tokens JWT são *stateless* — uma vez emitidos, permanecem válidos até a expiração (`exp`) mesmo que o usuário faça logout. Um token roubado pode ser reutilizado durante a janela de 30 minutos. A solução clássica — uma blacklist de tokens — exige armazenamento centralizado e consulta a cada requisição.

**Solução:** o agregado `User` em `domain/aggregates.py` possui uma coluna `security_stamp` (UUID) armazenada na tabela `users`. Esse stamp é incluído em todos os tokens emitidos como *claim* `security_stamp`.

Em toda requisição autenticada, `get_current_user()` em `dependencies.py` executa (linha 49):

```python
if str(user.security_stamp) != security_stamp:
    raise _401
```

Ao fazer logout, `User.logout()` em `domain/aggregates.py` (linhas 59–61) executa:

```python
def logout(self) -> None:
    self.revoke_all_refresh_tokens()
    self.regenerate_stamp()
```

`regenerate_stamp()` atribui um novo UUID ao campo `security_stamp`. Após a persistência no banco, todos os access tokens previamente emitidos — que ainda carregam o stamp antigo — passam a ser rejeitados com 401, mesmo que não tenham expirado. O mesmo mecanismo é acionado por `deactivate()`, que desativa a conta do usuário.

**Resultado:** invalidação com semântica *stateful* implementada com apenas uma coluna UUID por usuário — sem blacklist de tokens nem cache distribuído.

**Ameaça mitigada:** reutilização de access token após logout (ex.: token vazado de log de proxy reverso) e persistência de sessão após desativação de conta pelo administrador.

---

### 4. Refresh token armazenado como hash SHA-256

`JwtTokenService.create_refresh_token()` em `services/jwt_token_service.py` gera o token e imediatamente computa:

```python
token_hash = hashlib.sha256(token.encode()).hexdigest()
```

Apenas o hash (64 caracteres hexadecimais) é persistido na coluna `token_hash` da tabela `refresh_tokens`. O valor original do token é retornado ao cliente via cookie e nunca armazenado no banco.

Ao realizar logout, `revoke_all_refresh_tokens()` marca todos os tokens do usuário com `is_revoked=True` e registra o horário em `revoked_at`.

**Ameaça mitigada:** se a tabela `refresh_tokens` for comprometida, o atacante obtém apenas hashes SHA-256 irrecuperáveis — não tokens funcionais para uso na API. É uma camada de defesa em profundidade complementar ao hash bcrypt das senhas.

---

### 5. Cookie httpOnly + samesite=strict

O refresh token é enviado ao cliente como cookie com os seguintes atributos, definidos em `routers/auth_router.py`:

| Atributo | Valor | Proteção |
| --- | --- | --- |
| `httponly=True` | sempre | JavaScript não consegue acessar o cookie — mitiga roubo via XSS |
| `secure=True` | fora de `development` | Cookie transmitido apenas via HTTPS |
| `samesite="strict"` | sempre | Browser não envia o cookie em requisições cross-site — mitiga CSRF |
| `path="/identity/auth"` | sempre | Cookie enviado apenas para rotas de autenticação, não para `/documents` ou outros módulos |
| `max_age` | 7 dias | Alinhado à expiração configurada do refresh token |

O access token é retornado no corpo da resposta e deve ser enviado pelo cliente no cabeçalho `Authorization: Bearer <token>`. Essa separação preserva a proteção do cookie httpOnly para o token de longa duração (7 dias), enquanto o access token de curta duração (30 min) trafega no cabeçalho.

**Ameaça mitigada:** JavaScript injetado via XSS não consegue exfiltrar o refresh token; scripts maliciosos em sites de terceiros não conseguem disparar operações autenticadas em nome do usuário (`samesite=strict`).

---

### 6. RBAC + regra de dono do recurso

`domain/policies.py` define todas as regras de autorização como funções puras:

| Função | Regra |
| --- | --- |
| `can_manage_users(role)` | Apenas `admin` |
| `can_view_audit_logs(role)` | Apenas `admin` |
| `can_create_document(role)` | `admin` ou `solicitante` |
| `can_view_all_documents(role)` | `admin` ou `analista` |
| `can_view_document(role, is_owner)` | Dono do documento OU `can_view_all_documents` |
| `can_edit_document(role, is_owner, status)` | `admin` OU (dono E status == `pendente`) |
| `can_delete_document(role, is_owner, status)` | `admin` OU (dono E status == `pendente`) |
| `can_change_document_status(role)` | `admin` ou `analista` |

`require_role(*roles)` em `dependencies.py` é uma dependência FastAPI injetada nos routers para restrição por perfil. `get_current_user()` aplica autenticação e verificação de conta ativa em toda rota protegida.

**Ameaça mitigada:** escalada de privilégio vertical (um `solicitante` chamar rotas restritas a `admin`) e horizontal (um `solicitante` acessar ou modificar documentos de outro usuário).

---

### 7. Validação de entrada com Pydantic

Todos os corpos de requisição são subclasses de `BaseModel` do Pydantic — nenhum dicionário bruto chega à lógica de negócio.

- **`EmailStr`**: valida formato RFC 5322 antes de qualquer consulta ao banco
- **`UserRole` (enum)**: aceita apenas `admin`, `analista` ou `solicitante` — strings arbitrárias são rejeitadas com 422
- **`NonEmptyStr`** (`core/shared/validators.py`): aplica `min_length=1` e remove espaços em branco das extremidades
- **`@model_validator passwords_match`** em `CreateUserRequest`: validação cross-field executada antes de chegar ao caso de uso

**Ameaça mitigada:** dados malformados que poderiam causar erros inesperados ou contornar regras de negócio são rejeitados na camada de apresentação, antes de qualquer operação de persistência.

---

### 8. CORS com whitelist de origens

`CORSMiddleware` em `main.py` é configurado com `settings.allowed_origins`, carregado de `.env.local` (ex.: `["http://localhost:3000"]`). O atributo `allow_credentials=True` é necessário para que cookies sejam transmitidos em requisições cross-origin do front-end.

**Ameaça mitigada:** uma página de terceiros não autorizada não consegue realizar requisições credenciadas à API — os browsers bloqueiam a requisição pelo mecanismo de *preflight* CORS antes mesmo de ela ser processada.

---

### 9. Tratamento global de erros de validação

`@app.exception_handler(RequestValidationError)` em `main.py` intercepta todos os erros de validação Pydantic e os formata via `_format_validation_errors()`, retornando um JSON 422 padronizado com nomes de campo e mensagens legíveis — sem expor detalhes internos.

**Ameaça mitigada:** sem esse handler, o FastAPI pode incluir na resposta detalhes como anotações de tipo Python, nomes de classes ORM ou stack traces — informações úteis para um atacante que realiza *fuzzing* de entradas da API.

---

### 10. Segredos fora do repositório

`config.py` usa `pydantic-settings` para carregar todas as variáveis de `.env.local`, que é excluído do controle de versão via `.gitignore`. `JWT_SECRET_KEY` e `DATABASE_URL` (que contém a senha do banco) nunca aparecem em código versionado.

**Ameaça mitigada:** exposição acidental de credenciais no histórico Git — um dos vetores mais comuns de comprometimento de projetos acadêmicos hospedados publicamente.

---

## Endpoints da API

### Autenticação (`/identity/auth`)

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| POST | `/identity/auth/login` | Pública | Login com e-mail e senha; retorna `access_token` no corpo e define cookie `refresh_token` |

### Organizações (`/organization`)

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| POST | `/organization` | Pública | Bootstrap: cria organização + usuário administrador inicial |

### Saúde

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| GET | `/health` | Pública | Verificação de saúde do serviço |

> A documentação interativa completa — incluindo *request/response schemas* e botão de teste — está disponível em `/docs` (Swagger UI) e `/redoc`.

---

## Matriz de permissões

| Funcionalidade          | Solicitante           | Analista | Admin |
| ----------------------- | --------------------- | -------- | ----- |
| Criar documento         | ✓                     | —        | ✓     |
| Ver próprios documentos | ✓                     | ✓        | ✓     |
| Ver todos os documentos | ✗                     | Parcial  | ✓     |
| Editar documento        | Só próprio (pendente) | ✗        | ✓     |
| Excluir documento       | Só próprio (pendente) | ✗        | ✓     |
| Alterar status          | ✗                     | ✓        | ✓     |
| Gerenciar usuários      | ✗                     | ✗        | ✓     |
| Visualizar logs         | ✗                     | ✗        | ✓     |

---

## O que não foi implementado (limitações conhecidas)

- **Logs de auditoria** — o back-end legado registrava eventos como `LOGIN_SUCCESS`, `DOC_CREATED`, `ACCESS_DENIED`, entre outros. Essa funcionalidade ainda não foi portada para o novo back-end.
- **Rate limiting no login** — o back-end legado limitava a 10 tentativas de login por IP a cada 15 minutos para mitigar ataques de força bruta. Ainda não implementado no FastAPI.
- **Cabeçalhos HTTP de segurança** — o back-end legado usava Helmet.js para definir `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` e outros. Ainda não implementado.
- **Endpoints de documentos** — as rotas de CRUD de documentos e o fluxo de aprovação (pendente → em análise → aprovado/rejeitado) ainda não foram portados.
- **Front-end** — a interface HTML/CSS/JS do legado não foi portada; o novo back-end é exclusivamente uma API REST.
- **Testes automatizados** — nenhum teste unitário ou de integração foi implementado.
- **HTTPS** — requer configuração de certificado no ambiente de produção.

---

## Integrantes do grupo

| Nome                      | GitHub                                                          |
| ------------------------- | --------------------------------------------------------------- |
| Gabriel da Silva Carvalho | [@gabrielcarvallho](https://github.com/gabrielcarvallho)        |
| Adrian Cesar Gonçalves    | [@adrian-cesar](https://github.com/adrian-cesar)                |
| Renato Colin Neto         | [@RenatoColin](https://github.com/RenatoColin)                  |
| Igor Thiago Seberino      | [@igorSeberino](https://github.com/igorSeberino)                |

---
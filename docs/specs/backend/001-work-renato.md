# Funcionalidades - Renato Colin

## 0. Git

- **Branch:** `feature/001-first-access`
- **Commit:** `feat(identity): create organization and initial admin user on first access`
- **Pull Request (título):** `feat(identity): first access - organization and admin user creation`

Use exatamente esses valores ao criar a branch, commitar e abrir o PR. Ver `work-guide.md` para o passo a passo.

---

## 1. Objetivo
Este documento define o escopo de implementacao do desenvolvedor Renato Colin na fase inicial do projeto.

Tema desta entrega:
- Entrada no sistema com criacao da organizacao e do usuario administrador inicial.

---

## 2. Escopo funcional
Fluxo: primeiro acesso ao sistema.

1. Usuario informa o nome da organizacao.
2. Usuario informa os dados para criacao da conta.
3. Role da conta inicial e fixa como `admin`.
4. API valida os dados informados.
5. Se valido, API cria organizacao e usuario admin vinculados.

---

## 3. Regras de negocio obrigatorias
1. `organization.name` deve ser obrigatorio e nao pode ser vazio.
2. `email` deve ser valido e unico (nao pode estar vinculado a outra conta).
3. `password` e `confirm_password` devem ser obrigatorios e iguais.
4. Conta criada nesse fluxo deve ter role `admin`.
5. Usuario criado deve ficar vinculado a organizacao criada.
6. Criacao de organizacao + usuario deve ocorrer em transacao unica.

Observacao:
- As validacoes de obrigatoriedade, string nao vazia e confirmacao de senha devem ficar no schema.
- O use case deve ficar apenas com as regras de negocio e persistencia.

---

## 4. Validacoes da API
A API deve:
- validar formato de email;
- validar campos obrigatorios;
- validar igualdade entre senha e confirmacao;
- verificar disponibilidade do nome da organizacao;
- verificar indisponibilidade de email ja cadastrado;
- retornar erros de validacao claros.

---

## 5. Estrutura de arquivos prevista
## 5.1 Identity
Arquivo: `app/modules/identity/schemas/requests.py`

```python
from uuid import UUID
from pydantic import BaseModel, EmailStr, model_validator

from app.core.shared.validators import NonEmptyStr
from app.modules.identity.domain.enumerations import UserRole

class CreateUserRequest(BaseModel):
    email: EmailStr
    organization_id: UUID
    role: UserRole
    password: NonEmptyStr
    confirm_password: NonEmptyStr

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
            
        return self
```

Observacao:
- No fluxo de primeiro acesso, o valor de `role` deve ser sempre `admin`.
- Mesmo que o campo exista no schema, a camada de aplicacao deve forcar `UserRole.ADMIN` para evitar elevacao de privilegio.
- O relacionamento com a organizacao deve ser recebido via `organization_id`.
- A validacao de igualdade entre senha e confirmacao fica no proprio schema.

## 5.2 Organization
Arquivo: `app/modules/organization/schemas/requests.py`

```python
from pydantic import BaseModel

from app.core.shared.validators import NonEmptyStr
from app.modules.identity.schemas.requests import CreateUserRequest

class CreateOrganizationBody(BaseModel):
    name: NonEmptyStr

class CreateOrganizationRequest(BaseModel):
    organization: CreateOrganizationBody
    user: CreateUserRequest
```

Observacao:
- `CreateOrganizationBody` e `CreateOrganizationRequest` ficam no mesmo arquivo do modulo `organization`.
- `CreateUserRequest` permanece no modulo `identity` e e reutilizado nesse fluxo.
- No caso de uso de primeiro acesso, o backend deve forcar a role do usuario para `admin`, independentemente do valor recebido no payload.
- A validacao de `organization.name` obrigatorio e nao vazio fica no schema compartilhando `NonEmptyStr`.

## 5.3 Core
Arquivo: `app/core/schemas/responses.py`

```python
from uuid import UUID
from pydantic import BaseModel

class IdentifierResponse(BaseModel):
    id: UUID
```

Observacao:
- Os aggregates recebem e manipulam relacoes sempre por identificador.
- Nao deve existir criacao passando objeto relacionado como `organization=organization`.
- O relacionamento entre `User` e `Organization` deve ser resolvido via `organization_id`.

## 5.5 Usecases

### 5.5.1 User
Arquivo: `app/modules/identity/usecases/user_usecases.py`

```python
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.domain.aggregates import User

from app.core.schemas.responses import IdentifierResponse
from app.modules.identity.schemas.requests import CreateUserRequest

from app.modules.identity.infrastructure import UserRepository
from app.modules.identity.services import PasswordService

class UserUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = UserRepository(session)

    async def create(self, request: CreateUserRequest) -> IdentifierResponse:
        user_exists = await self.repository.find_async("email", request.email)
        if user_exists:
            raise HTTPException(status_code=409, detail="user email already exists")

        user = User.Create(
            email=request.email,
            password_hash=PasswordService.hash(request.password),
            organization_id=request.organization_id,
            role=request.role,
        )

        await self.repository.save(user)
        return IdentifierResponse(id=user.id)
```

Observacao:
- O use case recebe `session` e constroi o `UserRepository` internamente; nao recebe mais o repository ja instanciado.
- O use case e usado diretamente pelo router, sem camada intermediaria de traducao de erro; por isso levanta `HTTPException` diretamente em vez de `ValueError`.
- O `organization_id` e sempre recebido como identificador, nunca como objeto relacionado.
- A role padrao do fluxo de primeiro acesso deve ser `admin`.
- O hash de senha e feito via `PasswordService.hash`, localizado em `app/modules/identity/services/` (ja existente no projeto).

### 5.5.1.1 Pacote de usecases (Identity)
Arquivo: `app/modules/identity/usecases/__init__.py`

```python
from .user_usecases import UserUseCase
```

Observacao:
- Segue o mesmo padrao de re-exportacao ja usado em `app/modules/identity/infrastructure/__init__.py`.
- Demais modulos devem importar `UserUseCase` via `app.modules.identity.usecases`, e nao via `app.modules.identity.usecases.user_usecases`.

### 5.5.1.2 Pacote de services (Identity) — ja existente
Arquivo: `app/modules/identity/services/__init__.py`

```python
from .password_service import PasswordService
```

Arquivo: `app/modules/identity/services/password_service.py`

```python
import bcrypt

class PasswordService:
    @staticmethod
    def hash(plain: str) -> str:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify(plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
```

Observacao:
- `PasswordService` ja existe no projeto; esta secao e apenas referencia, nao faz parte do escopo de implementacao deste documento.
- O `UserUseCase` usa `PasswordService.hash` na criacao do usuario; `PasswordService.verify` fica disponivel para o fluxo de login (fora do escopo deste documento).
- Import deve ser feito via pacote (`app.modules.identity.services`), e nao do submodulo direto.

### 5.5.2 Organization
Arquivo: `app/modules/organization/usecases/organization_usecases.py`

```python
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.schemas.responses import IdentifierResponse

from app.modules.organization.domain.aggregates import Organization
from app.modules.organization.schemas.requests import CreateOrganizationRequest

from app.modules.organization.infrastructure import OrganizationRepository

from app.modules.identity.domain.enumerations import UserRole
from app.modules.identity.usecases import UserUseCase
from app.modules.identity.schemas.requests import CreateUserRequest

class OrganizationUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = OrganizationRepository(session)
        self.user_usecase = UserUseCase(session)

    async def create(self, request: CreateOrganizationRequest) -> IdentifierResponse:
        organization_exists = await self.repository.find_async("name", request.organization.name)
        if organization_exists:
            raise HTTPException(status_code=409, detail="organization name already exists")

        organization = Organization.Create(name=request.organization.name)

        await self.repository.save(organization)

        await self.user_usecase.create(
            request=CreateUserRequest(
                email=request.user.email,
                organization_id=organization.id,
                password=request.user.password,
                confirm_password=request.user.confirm_password,
                role=UserRole.ADMIN,
            ),
        )

        return IdentifierResponse(id=organization.id)
```

Observacao:
- O use case recebe `session` e constroi `OrganizationRepository` e `UserUseCase` internamente; o router so passa a `session`.
- O use case e usado diretamente pelo router, sem camada intermediaria de traducao de erro; por isso levanta `HTTPException` diretamente em vez de `ValueError`.
- O use case de organizacao chama o use case de usuario passando `organization_id`.
- O retorno do fluxo de primeiro acesso continua sendo apenas o identificador da organizacao.
- O import de `UserUseCase` deve ser feito a partir do pacote (`app.modules.identity.usecases`), e nao do submodulo (`app.modules.identity.usecases.user_usecases`), seguindo o padrao de re-exportacao do projeto.

### 5.5.2.1 Pacote de usecases (Organization)
Arquivo: `app/modules/organization/usecases/__init__.py`

```python
from .organization_usecases import OrganizationUseCase
```

Observacao:
- Segue o mesmo padrao de re-exportacao ja usado em `app/modules/identity/usecases/__init__.py`.
- O router deve importar `OrganizationUseCase` via `app.modules.organization.usecases`, e nao via `app.modules.organization.usecases.organization_usecases`.

### 5.5.3 Organizacao transacional
Observacao:
- A criacao de organizacao e usuario deve ocorrer em uma mesma transacao.
- A transacao fica na camada de aplicacao, envolvendo a persistencia dos dois use cases.
- O endpoint nao deve expor logica de persistencia direta.

## 5.6 Routers
Arquivo: `app/modules/organization/routers/user_router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.schemas.responses import IdentifierResponse
from app.modules.organization.schemas.requests import CreateOrganizationRequest

from app.modules.organization.usecases import OrganizationUseCase

router = APIRouter(prefix="/organization", tags=["Organization"])

@router.post("", response_model=IdentifierResponse, status_code=201)
async def create(
    body: CreateOrganizationRequest,
    session: AsyncSession = Depends(get_db),
):
    return await OrganizationUseCase(session).create(body)
```

Observacao:
- O endpoint deve ser publico, sem dependencia de autenticacao — e o fluxo de criacao da primeira conta admin.
- `body` e `response_model` seguem os schemas definidos nas secoes 5.2 e 5.3 (`CreateOrganizationRequest` e `IdentifierResponse`), e nao schemas de outros fluxos (ex.: `CreateUserRequest`, `UserResponse`).
- O router so passa a `session`; `OrganizationUseCase` monta `OrganizationRepository` e `UserUseCase` internamente.
- A validacao de entrada acontece nos schemas e a validacao de negocio nos use cases.
- Pressupoe a existencia de `app/modules/organization/usecases/__init__.py` reexportando `OrganizationUseCase`, no mesmo padrao ja adotado para `identity`.

---

## 6. Contrato sugerido para endpoint
Endpoint sugerido:
- `POST /v1/entry/first-access`

Payload sugerido:
```json
{
  "organization": {
    "name": "Acme LTDA"
  },
  "user": {
    "email": "admin@acme.com",
    "password": "Senha@123",
    "confirm_password": "Senha@123",
    "role": "admin"
  }
}
```

Resposta sugerida (201):
```json
{
  "organization": { "id": "UUID" }
}
```

---

## 7. Criterios de pronto (DoD)
A tarefa sera considerada pronta quando:
1. Schemas criados nos caminhos definidos.
2. Endpoint de primeiro acesso implementado.
3. Validacoes obrigatorias implementadas.
4. Organizacao e usuario admin criados de forma transacional.
5. Usuario vinculado corretamente a organizacao.
6. Testes minimos de sucesso e falha implementados.

---

## 8. Checklist de implementacao
- [ ] Criar `CreateUserRequest`.
- [ ] Criar `CreateOrganizationBody`.
- [ ] Criar `CreateOrganizationRequest`.
- [ ] Criar `IdentifierResponse`.
- [ ] Criar `app/modules/identity/usecases/__init__.py` reexportando `UserUseCase`.
- [ ] Criar `app/modules/organization/usecases/__init__.py` reexportando `OrganizationUseCase`.
- [ ] Implementar validacao de senha e confirmacao.
- [ ] Implementar validacao de email unico.
- [ ] Implementar validacao de nome de organizacao disponivel.
- [ ] Implementar caso de uso de primeiro acesso.
- [ ] Implementar router `app/modules/organization/routers/user_router.py` (endpoint publico).
- [ ] Garantir transacao unica.
- [ ] Criar testes de integracao do endpoint.

---

## 9. Observacoes para o time
- Este documento define apenas o escopo do Renato Colin.
- Os demais desenvolvedores terao documentos proprios em `docs/`.
- Alteracoes de escopo devem ser aprovadas e registradas neste arquivo.
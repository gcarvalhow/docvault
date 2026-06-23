# Funcionalidades - Igor Seberino

## 0. Git

- **Branch:** `feature/002-authentication`
- **Commit:** `feat(identity): implement login with JWT access and refresh tokens`
- **Pull Request (título):** `feat(identity): authentication - login endpoint with JWT tokens`

Use exatamente esses valores ao criar a branch, commitar e abrir o PR. Ver `work-guide.md` para o passo a passo.

---

## 1. Objetivo
Este documento define o escopo de implementacao do desenvolvedor Igor Seberino na fase inicial do projeto.

Tema desta entrega:
- Autenticacao via login (email/senha), com emissao de access token (JWT) e refresh token.

---

## 2. Escopo funcional
Fluxo: login.

1. Usuario informa email e senha.
2. API valida as credenciais.
3. Se validas, API gera access token e refresh token.
4. Access token retorna no corpo da resposta.
5. Refresh token e entregue via cookie HttpOnly (nao entra no corpo da resposta).

---

## 3. Regras de negocio obrigatorias
1. `email` e `password` sao obrigatorios.
2. O usuario deve existir, estar ativo (`is_active`) e a senha informada deve ser valida (`PasswordService.verify`).
3. Qualquer falha de autenticacao (usuario inexistente, inativo, ou senha incorreta) retorna o mesmo erro generico (401 - "Invalid credentials"), sem indicar qual condicao falhou — evita enumeracao de usuarios.
4. O refresh token deve ser persistido como hash, vinculado ao usuario, com data de expiracao.
5. O access token deve conter `sub` (id do usuario), `role`, `security_stamp` e `exp`.

Observacao:
- As validacoes de formato e obrigatoriedade ficam no schema.
- O use case fica apenas com a regra de autenticacao e emissao/persistencia dos tokens.

---

## 4. Validacoes da API
A API deve:
- validar formato de email;
- validar que a senha foi informada (sem regra de complexidade nesse fluxo, apenas presenca);
- retornar erro 401 generico em qualquer falha de autenticacao.

---

## 5. Estrutura de arquivos prevista

## 5.1 Schemas - Request
Arquivo: `app/modules/identity/schemas/requests.py`

```python
from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
```

Observacao:
- `LoginRequest` deve ser adicionado no mesmo arquivo onde ja existe `CreateUserRequest`.
- Sem validacao de complexidade de senha aqui — esse schema so valida presenca, a senha em si e validada contra o hash no use case.

## 5.2 Schemas - Response
Arquivo: `app/modules/identity/schemas/responses.py`

```python
from pydantic import BaseModel

class TokenResponse(BaseModel):
    access_token: str
```

Observacao:
- O refresh token **nao** entra nesse schema — e entregue via cookie HttpOnly pelo router, nunca no corpo da resposta.

## 5.3 Services — JwtTokenService (ja existente)
Arquivo: `app/modules/identity/services/jwt_token_service.py`

```python
import hashlib
from jose import jwt
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from app.config import settings

class JwtTokenService:
    _algorithm = "HS256"

    @classmethod
    def _now(cls) -> datetime:
        return datetime.now(timezone.utc)

    @classmethod
    def create_access_token(cls, user_id: str, role: str, security_stamp: str) -> str:
        payload = {
            "sub": user_id, "role": role, "security_stamp": security_stamp, "type": "access",
            "exp": cls._now() + timedelta(minutes=settings.access_token_expire_minutes),
            "iat": cls._now(),
        }

        return jwt.encode(payload, settings.jwt_secret_key, algorithm=cls._algorithm)

    @classmethod
    def create_refresh_token(cls, user_id: str) -> tuple[str, str]:
        jti = str(uuid4())

        payload = {
            "sub": user_id, "jti": jti, "type": "refresh",
            "exp": cls._now() + timedelta(days=settings.refresh_token_expire_days),
            "iat": cls._now(),
        }

        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=cls._algorithm)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        return token, token_hash

    @classmethod
    def hash_token(cls, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def decode_token(cls, token: str) -> dict:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[cls._algorithm])
```

Observacao:
- `JwtTokenService` ja existe no projeto; esta secao e apenas referencia, nao faz parte do escopo de implementacao deste documento.
- `create_refresh_token` retorna `(token, token_hash)` — o token em si vai pro cookie, o hash e o que se persiste no banco (via `User.add_refresh_token`).

## 5.3.1 Pacote de services (Identity) — atualizar export existente
Arquivo: `app/modules/identity/services/__init__.py`

```python
from .password_service import PasswordService
from .jwt_token_service import JwtTokenService
```

Observacao:
- Esse arquivo ja existe e hoje reexporta so `PasswordService`. Precisa ser atualizado para tambem reexportar `JwtTokenService`, mantendo o padrao de import via pacote (`app.modules.identity.services`).

## 5.4 Usecases — Auth
Arquivo: `app/modules/identity/usecases/auth_usecases.py`

```python
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.identity.domain.aggregates import User
from app.modules.identity.infrastructure import UserRepository
from app.modules.identity.services import PasswordService, JwtTokenService

class AuthUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._users = UserRepository(session)

    async def login(self, email: str, password: str) -> tuple[str, str]:
        user = await self._users.find_async("email", email)

        if not user or not user.is_active or not PasswordService.verify(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return await self._issue_tokens(user)

    async def _issue_tokens(self, user: User) -> tuple[str, str]:
        refresh_token_str, token_hash = JwtTokenService.create_refresh_token(user_id=str(user.id))

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
        user.add_refresh_token(token_hash=token_hash, expires_at=expires_at)

        access_token = JwtTokenService.create_access_token(
            user_id=str(user.id),
            role=user.role.value,
            security_stamp=str(user.security_stamp),
        )

        await self._users.save(user)
        return access_token, refresh_token_str
```

Observacao:
- O use case recebe `session` e constroi o `UserRepository` internamente, seguindo o mesmo padrao do `UserUseCase`.
- Usa `find_async("email", email)` para buscar o usuario — **nao** e necessario um metodo especifico tipo `find_by_email_with_tokens`. O relationship `refresh_tokens` no aggregate `User` usa `lazy="selectin"`, ou seja, e carregado automaticamente em qualquer busca do usuario, independente do metodo de repositorio usado.
- Levanta `HTTPException` diretamente (mesmo padrao adotado em `UserUseCase`/`OrganizationUseCase`), pois e usado diretamente pelo router.
- O erro de credenciais invalidas e sempre o mesmo (401 generico), independentemente de o usuario nao existir, estar inativo, ou a senha estar errada — isso evita enumeracao de usuarios.
- **Pendencia a confirmar:** o campo `is_active`, usado aqui e em `User.deactivate()`, nao esta declarado em `aggregates.py`. Provavelmente vem da classe base `Model`; confirmar isso antes de implementar, ou declarar o campo se nao existir.

## 5.4.1 Pacote de usecases (Identity) — atualizar export existente
Arquivo: `app/modules/identity/usecases/__init__.py`

```python
from .user_usecases import UserUseCase
from .auth_usecases import AuthUseCase
```

Observacao:
- Esse arquivo ja existe e hoje reexporta so `UserUseCase`. Precisa ser atualizado para tambem reexportar `AuthUseCase`.

## 5.5 Router
Arquivo: `app/modules/identity/routers/auth_router.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Response

from app.config import settings
from app.database import get_db
from app.modules.identity.usecases import AuthUseCase
from app.modules.identity.schemas.requests import LoginRequest
from app.modules.identity.schemas.responses import TokenResponse

router = APIRouter(prefix="/identity/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse, status_code=200)
async def login(body: LoginRequest, response: Response, session: AsyncSession = Depends(get_db)):
    access_token, refresh_token = await AuthUseCase(session).login(
        email=body.email,
        password=body.password,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="strict",
        path="/identity/auth",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )

    return TokenResponse(access_token=access_token)
```

Observacao:
- O endpoint deve ser publico, sem dependencia de autenticacao — e o proprio fluxo de login.
- `response: Response` e injetado pelo FastAPI para permitir `set_cookie`; nao confundir com `response_model`.
- O router so passa a `session`; `AuthUseCase` monta `UserRepository` internamente, mesmo padrao do `OrganizationUseCase`.
- O corpo da resposta retorna apenas `TokenResponse` (access token); o refresh token vai exclusivamente no cookie HttpOnly.

---

## 6. Contrato sugerido para endpoint
Endpoint sugerido:
- `POST /v1/auth/login`

Payload sugerido:
```json
{
  "email": "admin@acme.com",
  "password": "Senha@123"
}
```

Resposta sugerida (200):
```json
{
  "access_token": "JWT_AQUI"
}
```

Header adicional na resposta:
```
Set-Cookie: refresh_token=JWT_AQUI; HttpOnly; Secure; SameSite=Lax
```

Resposta de erro (401):
```json
{
  "detail": "Invalid credentials"
}
```

---

## 7. Criterios de pronto (DoD)
A tarefa sera considerada pronta quando:
1. Schemas criados nos caminhos definidos.
2. Endpoint de login implementado e publico.
3. Validacoes obrigatorias implementadas.
4. Access token emitido no corpo da resposta.
5. Refresh token emitido via cookie HttpOnly, persistido como hash vinculado ao usuario.
6. Campo `is_active` confirmado (ou declarado) na camada de dominio.
7. Testes minimos de sucesso e falha implementados.

---

## 8. Checklist de implementacao
- [ ] Criar `LoginRequest`.
- [ ] Criar `TokenResponse`.
- [ ] Atualizar `app/modules/identity/services/__init__.py` para reexportar `JwtTokenService`.
- [ ] Atualizar `app/modules/identity/usecases/__init__.py` para reexportar `AuthUseCase`.
- [ ] Implementar `AuthUseCase` (usando `find_async`, sem metodo de busca especifico).
- [ ] Confirmar existencia do campo `is_active` (classe base `Model` ou declarar no `User`).
- [ ] Implementar router `app/modules/identity/routers/auth_router.py` (endpoint publico).
- [ ] Configurar cookie HttpOnly do refresh token (`secure`, `samesite`, `max_age`).
- [ ] Garantir erro generico (401) para qualquer falha de autenticacao.
- [ ] Criar testes de integracao: login com sucesso, senha incorreta, usuario inexistente, usuario inativo.

---

## 9. Observacoes para o time
- Este documento define apenas o escopo do Igor Seberino.
- Os demais desenvolvedores terao documentos proprios em `docs/`.
- Alteracoes de escopo devem ser aprovadas e registradas neste arquivo.
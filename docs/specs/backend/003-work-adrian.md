# Funcionalidades - Adrian

## 0. Git

- **Branch:** `feature/003-token-management`
- **Commit:** `feat(identity): implement refresh token rotation and logout`
- **Pull Request (título):** `feat(identity): token management - refresh and logout endpoints`

Use exatamente esses valores ao criar a branch, commitar e abrir o PR. Ver `work-guide.md` para o passo a passo.

---

## 1. Objetivo
Este documento define o escopo de implementacao do desenvolvedor Adrian na fase inicial do projeto.

Tema desta entrega:
- Gerenciamento de tokens: renovacao de access token via refresh token (com token rotation) e logout.

---

## 2. Escopo funcional
Dois fluxos: refresh e logout.

**Fluxo 1: refresh**

1. Cliente envia requisicao com o cookie `refresh_token`.
2. API decodifica e valida o token (JWT valido, tipo `refresh`, usuario ativo).
3. API localiza o token no banco (por hash) e verifica se esta valido.
4. API revoga o refresh token usado (token rotation).
5. API emite novo access token e novo refresh token.
6. Novo access token retorna no corpo da resposta.
7. Novo refresh token e entregue via cookie HttpOnly (substitui o anterior).

**Fluxo 2: logout**

1. Cliente envia requisicao autenticada (Bearer access token no header).
2. API valida o access token via `get_current_user`.
3. API revoga todos os refresh tokens ativos do usuario.
4. API regenera o `security_stamp` do usuario, invalidando todos os access tokens em circulacao.
5. Cookie `refresh_token` e removido da resposta.
6. API retorna 204 sem corpo.

---

## 3. Regras de negocio obrigatorias

**Refresh:**
1. O refresh token deve ser lido exclusivamente do cookie HttpOnly — nao do corpo da requisicao.
2. O JWT deve ter `type: "refresh"` no payload.
3. O token deve existir no banco (comparado por hash via `JwtTokenService.hash_token`) e estar valido (`RefreshToken.is_valid()`).
4. O token antigo deve ser revogado antes de emitir os novos (token rotation — evita reutilizacao).
5. Qualquer falha de validacao retorna o mesmo erro generico 401 — sem indicar qual condicao falhou.

**Logout:**
1. O endpoint e autenticado — requer access token valido no header Authorization.
2. Todos os refresh tokens ativos do usuario sao revogados (nao apenas o da sessao corrente).
3. O `security_stamp` do usuario e regenerado, invalidando imediatamente todos os access tokens em circulacao.
4. O cookie `refresh_token` e removido da resposta.

Observacao:
- O logout e global (todas as sessoes), nao por sessao. Esse e o comportamento ja modelado em `User.logout()`.

---

## 4. Validacoes da API

**Refresh:**
- Cookie `refresh_token` presente e nao vazio.
- JWT decodificavel e com claim `type == "refresh"`.
- Token encontrado no banco por hash e marcado como valido.
- Erro sempre 401 generico (`"Invalid or expired token"`) em qualquer falha.

**Logout:**
- Access token presente e valido no header `Authorization: Bearer`.
- Erro 401 se token ausente, invalido, expirado ou `security_stamp` divergente.

---

## 5. Estrutura de arquivos prevista

## 5.1 UseCase - Auth (atualizar existente)
Arquivo: `app/modules/identity/usecases/auth_usecases.py`

Adicionar aos imports existentes:

```python
from uuid import UUID
from jose import JWTError
```

Adicionar os metodos `refresh` e `logout` dentro da classe `AuthUseCase`:

```python
async def refresh(self, token: str) -> tuple[str, str]:
    try:
        payload = JwtTokenService.decode_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = await self._users.get_by_id(UUID(user_id))

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    token_hash = JwtTokenService.hash_token(token)
    stored = next((t for t in user.refresh_tokens if t.token_hash == token_hash), None)

    if not stored or not stored.is_valid():
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user.revoke_refresh_token(stored.id)
    user.regenerate_stamp()

    return await self._issue_tokens(user)

async def logout(self, user: User) -> None:
    user.logout()
    await self._users.save(user)
```

Observacao:
- O metodo `refresh` busca o token em `user.refresh_tokens` em memoria — nao e necessario nenhum metodo especial no repositorio. O relacionamento ja usa `lazy="selectin"`, entao todos os tokens do usuario sao carregados automaticamente com o `get_by_id`.
- `_issue_tokens` ja existe na classe e e reutilizado diretamente — nao duplicar logica de emissao de tokens.
- `regenerate_stamp()` e chamado antes de `_issue_tokens`: o novo access token e emitido ja com o novo stamp, tornando o access token anterior imediatamente invalido (pois `get_current_user` compara o stamp do token com o do banco). Sem essa chamada, o cliente ficaria com dois access tokens validos simultaneamente ate o mais antigo expirar.
- O erro de refresh e sempre o mesmo 401 generico, independentemente de qual validacao falhou — mesma filosofia do login.
- `logout` recebe o `User` ja carregado (vindo de `get_current_user`) e apenas chama `user.logout()` no aggregate, que ja implementa revogacao de todos os tokens e regeneracao do stamp.

## 5.2 Router - Auth (atualizar existente)
Arquivo: `app/modules/identity/routers/auth_router.py`

Atualizar imports:

```python
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.dependencies import get_current_user, get_db
from app.modules.identity.domain.aggregates import User
```

Adicionar os endpoints `/refresh` e `/logout` ao router existente:

```python
@router.post("/refresh", response_model=TokenResponse, status_code=200)
async def refresh(request: Request, response: Response, session: AsyncSession = Depends(get_db)):
    token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    access_token, refresh_token = await AuthUseCase(session).refresh(token)

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


@router.post("/logout", status_code=204)
async def logout(response: Response, user: User = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    await AuthUseCase(session).logout(user)
    response.delete_cookie(key="refresh_token", path="/identity/auth")
```

Observacao:
- `/refresh` e publico — nao usa `get_current_user`. O proprio use case valida o refresh token do cookie.
- `/logout` usa `Depends(get_current_user)` e `Depends(get_db)` simultaneamente. O FastAPI deduplica dependencias na mesma requisicao: ambos recebem a mesma instancia de `AsyncSession`, entao o `user` carregado por `get_current_user` e salvo corretamente por `AuthUseCase(session).logout(user)`.
- O cookie e removido com `response.delete_cookie`, que define `Max-Age=0` e forca o browser a apagar o cookie imediatamente.
- Nenhum schema novo e necessario: `/refresh` retorna `TokenResponse` (ja existente) e `/logout` retorna 204 sem corpo.

---

## 6. Contrato sugerido para endpoints

**Refresh:**
- Endpoint: `POST /v1/identity/auth/refresh`
- Requer cookie: `refresh_token=<JWT>`
- Nao requer Authorization header

Resposta sugerida (200):
```json
{
  "access_token": "JWT_AQUI"
}
```

Header adicional na resposta:
```
Set-Cookie: refresh_token=JWT_NOVO; HttpOnly; Secure; SameSite=Strict; Path=/identity/auth
```

Resposta de erro (401):
```json
{
  "detail": "Invalid or expired token"
}
```

---

**Logout:**
- Endpoint: `POST /v1/identity/auth/logout`
- Requer header: `Authorization: Bearer <access_token>`

Resposta sugerida (204): sem corpo.

Header adicional na resposta:
```
Set-Cookie: refresh_token=; Max-Age=0; Path=/identity/auth
```

Resposta de erro (401):
```json
{
  "detail": "Invalid or expired token"
}
```

---

## 7. Criterios de pronto (DoD)
A tarefa sera considerada pronta quando:
1. Metodo `refresh` implementado em `AuthUseCase` com token rotation.
2. Metodo `logout` implementado em `AuthUseCase`.
3. Endpoint `POST /refresh` implementado (publico, lê cookie, retorna novo access token).
4. Endpoint `POST /logout` implementado (autenticado, logout global, remove cookie).
5. Todos os erros do refresh retornam 401 generico.
6. Cookie `refresh_token` atualizado no refresh e removido no logout.
7. Testes minimos de sucesso e falha implementados para ambos os endpoints.

---

## 8. Checklist de implementacao
- [ ] Adicionar imports `UUID` e `JWTError` em `auth_usecases.py`.
- [ ] Implementar metodo `refresh` em `AuthUseCase` (token rotation: `user.revoke_refresh_token` + `user.regenerate_stamp` + `_issue_tokens`).
- [ ] Implementar metodo `logout` em `AuthUseCase` (delegar para `user.logout()` + `save`).
- [ ] Atualizar imports em `auth_router.py` (`Request`, `HTTPException`, `get_current_user`, `User`).
- [ ] Implementar endpoint `POST /refresh` (publico, le cookie, chama `AuthUseCase.refresh`).
- [ ] Implementar endpoint `POST /logout` (autenticado, chama `AuthUseCase.logout`, remove cookie).
- [ ] Criar testes de integracao do refresh: sucesso, token invalido, token revogado, token expirado, cookie ausente.
- [ ] Criar testes de integracao do logout: sucesso, sem autenticacao.

---

## 9. Observacoes para o time
- Este documento define apenas o escopo do Adrian.
- Os demais desenvolvedores terao documentos proprios em `docs/`.
- Alteracoes de escopo devem ser aprovadas e registradas neste arquivo.
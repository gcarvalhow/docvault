# Funcionalidades - Adrian Cesar

## 0. Git

- **Branch:** `feature/003-token-management`
- **Commit:** `feat(identity): token management - refresh and logout endpoints`
- **Pull Request (título):** `feat(identity): token management - refresh and logout endpoints`

Use exatamente esses valores ao criar a branch, commitar e abrir o PR. Ver `work-guide.md` para o passo a passo.

---

## 1. Objetivo
Este documento define o escopo de implementacao do desenvolvedor Adrian Cesar na fase inicial do projeto.

Tema desta entrega:
- Gestao do ciclo de vida dos tokens de sessao: renovacao do access token via refresh token (rotacao) e logout (revogacao da sessao).

Depende de:
- Login ja implementado (spec `002-work-igor.md`), que emite o access token no corpo e o refresh token via cookie HttpOnly.

---

## 2. Escopo funcional

### Fluxo A — Refresh
1. O cliente envia a requisicao com o cookie `refresh_token` (HttpOnly).
2. A API decodifica e valida o refresh token.
3. A API confere se o hash do token consta entre os refresh tokens validos do usuario.
4. Se valido, a API **rotaciona** o token: revoga o refresh token usado e emite um novo par (novo access token no corpo + novo refresh token no cookie).
5. Se invalido, expirado ou revogado, retorna 401 generico.

### Fluxo B — Logout
1. O cliente envia a requisicao autenticado (com o refresh token no cookie e/ou access token).
2. A API revoga **todos** os refresh tokens validos do usuario e regenera o `security_stamp` (invalida access tokens em circulacao).
3. A API limpa o cookie `refresh_token`.
4. Retorna 204 (sem corpo).

---

## 3. Regras de negocio obrigatorias
1. O refresh token chega exclusivamente pelo cookie HttpOnly `refresh_token`; nunca pelo corpo da requisicao.
2. A validacao do refresh token deve checar: assinatura/decodificacao, `type == "refresh"`, expiracao e se o hash consta como token **valido** (`is_valid()`) do usuario.
3. Rotacao obrigatoria no refresh: o token usado deve ser revogado (`revoke_refresh_token`) e um novo refresh token deve ser persistido (`add_refresh_token`) na mesma operacao.
4. O logout deve revogar todos os refresh tokens (`revoke_all_refresh_tokens`) e regenerar o `security_stamp` (`regenerate_stamp`) — ja encapsulados em `User.logout()`.
5. Qualquer falha de refresh (token ausente, invalido, expirado ou revogado) retorna o mesmo erro generico (401 - "Invalid credentials" / "Invalid token"), sem distinguir a causa.
6. O hash do refresh token usa o mesmo algoritmo do login (`JwtTokenService.hash_token`, SHA-256) para casar com o que foi persistido.

Observacao:
- A leitura/escrita do cookie fica no router; o use case fica apenas com a regra de validacao, rotacao e revogacao.

---

## 4. Validacoes da API
A API deve:
- exigir a presenca do cookie `refresh_token` no fluxo de refresh;
- decodificar o token e rejeitar tokens cujo `type` nao seja `refresh`;
- rejeitar tokens expirados ou revogados;
- rejeitar tokens cujo hash nao pertenca ao conjunto de refresh tokens validos do usuario;
- retornar 401 generico em qualquer falha.

---

## 5. Estrutura de arquivos prevista

## 5.1 Usecases — Auth (estender o existente)
Arquivo: `app/modules/identity/usecases/auth_usecases.py`

Adicionar ao `AuthUseCase` (criado na spec 002) os metodos de refresh e logout, reutilizando o `_issue_tokens` ja existente para a emissao do novo par no refresh.

```python
# refresh(self, refresh_token: str) -> tuple[str, str]
#   1. decodifica o token (JwtTokenService.decode_token) e valida type == "refresh"
#   2. carrega o usuario (sub) via UserRepository.get_by_id / find_async
#   3. localiza o RefreshToken pelo hash (JwtTokenService.hash_token) e valida is_valid()
#   4. revoga o token usado (user.revoke_refresh_token) e emite novo par (self._issue_tokens)
#   5. persiste (UserRepository.save) e retorna (access_token, refresh_token_str)

# logout(self, refresh_token: str | None) -> None
#   1. identifica o usuario a partir do refresh token (ou do access token, se preferir)
#   2. user.logout()  -> revoga todos os refresh tokens + regenera o security_stamp
#   3. persiste (UserRepository.save)
```

Observacao:
- Reutiliza os metodos de dominio ja existentes no aggregate `User`: `revoke_refresh_token`, `revoke_all_refresh_tokens`, `regenerate_stamp`, `logout`, `add_refresh_token`.
- Reutiliza `JwtTokenService.decode_token` e `JwtTokenService.hash_token` (ja existentes).
- O erro de token invalido segue o padrao generico (401) adotado no login.

## 5.2 Router — Auth (estender o existente)
Arquivo: `app/modules/identity/routers/auth_router.py`

Adicionar dois endpoints ao router de autenticacao (mesmo `prefix="/identity/auth"`):

```python
# POST /identity/auth/refresh
#   - le o cookie refresh_token (Cookie(...))
#   - chama AuthUseCase(session).refresh(refresh_token)
#   - regrava o novo cookie refresh_token (mesmas flags do login: HttpOnly, Secure, SameSite, path, max_age)
#   - retorna TokenResponse(access_token=...)

# POST /identity/auth/logout
#   - le o cookie refresh_token (opcional)
#   - chama AuthUseCase(session).logout(refresh_token)
#   - apaga o cookie (response.delete_cookie com o mesmo path "/identity/auth")
#   - retorna status 204
```

Observacao:
- As flags do cookie devem ser identicas as do login (spec 002): `httponly=True`, `secure` em producao, `samesite="strict"`, `path="/identity/auth"`, `max_age` em dias.
- O `delete_cookie` precisa usar o mesmo `path` do `set_cookie`, senao o cookie nao e removido.
- `TokenResponse` ja existe (spec 002) e e reutilizado no refresh.

---

## 6. Contrato sugerido para endpoints

### Refresh
- `POST /identity/auth/refresh`
- Requisicao: sem corpo; envia o cookie `refresh_token`.
- Resposta (200):
```json
{ "access_token": "JWT_AQUI" }
```
- Header adicional: `Set-Cookie: refresh_token=NOVO_JWT; HttpOnly; Secure; SameSite=Strict; Path=/identity/auth`
- Erro (401):
```json
{ "detail": "Invalid credentials" }
```

### Logout
- `POST /identity/auth/logout`
- Requisicao: sem corpo; envia o cookie `refresh_token`.
- Resposta: `204 No Content`
- Header adicional: `Set-Cookie` limpando `refresh_token`.

---

## 7. Criterios de pronto (DoD)
A tarefa sera considerada pronta quando:
1. Endpoint de refresh implementado, com rotacao do refresh token.
2. Endpoint de logout implementado, revogando todos os tokens e regenerando o `security_stamp`.
3. Validacao completa do refresh token (assinatura, type, expiracao, revogacao, pertencimento ao usuario).
4. Erro generico (401) em qualquer falha de refresh.
5. Cookie regravado no refresh e removido no logout, com o mesmo `path` do login.
6. Testes minimos de sucesso e falha implementados.

---

## 8. Checklist de implementacao
- [ ] Estender `AuthUseCase` com `refresh`.
- [ ] Estender `AuthUseCase` com `logout`.
- [ ] Implementar rotacao: revogar token usado + emitir novo par.
- [ ] Validar `type == "refresh"`, expiracao e pertencimento (hash) ao usuario.
- [ ] Adicionar endpoint `POST /identity/auth/refresh` ao `auth_router.py`.
- [ ] Adicionar endpoint `POST /identity/auth/logout` ao `auth_router.py`.
- [ ] Regravar/remover o cookie `refresh_token` com o mesmo `path` do login.
- [ ] Garantir erro generico (401) em qualquer falha de refresh.
- [ ] Criar testes de integracao: refresh valido, refresh expirado/revogado, refresh ausente, logout valido.

---

## 9. Observacoes para o time
- Este documento define apenas o escopo do Adrian Cesar.
- Esta entrega depende do login (spec `002-work-igor.md`) e estende os mesmos arquivos de `AuthUseCase` e `auth_router.py` — coordenar a ordem de merge com o Igor.
- Alteracoes de escopo devem ser aprovadas e registradas neste arquivo.

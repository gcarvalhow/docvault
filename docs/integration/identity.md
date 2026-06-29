# Contrato de Integração — Módulo `identity`

---

## 1. Identificação da feature

- **Nome da feature**: Identity (Autenticação e Usuários)
- **Módulo backend responsável**: `app.modules.identity`
- **Status atual**: `existente`
- **Data da última atualização**: 2026-06-29
- **Responsável técnico**: Grupo P06-A

---

## 2. Objetivo de negócio da feature

O módulo `identity` é a fundação de segurança de todo o DocVault. Ele resolve dois problemas centrais: **quem pode entrar no sistema** e **o que cada pessoa pode fazer**.

A autenticação (`auth`) garante que apenas usuários cadastrados em uma organização acessem a plataforma. O fluxo de sessão é baseado em tokens JWT de curta duração (access token) combinados com um refresh token de longa duração armazenado em cookie HTTP-only, nunca exposto ao JavaScript.

A gestão de usuários (`users`) permite que administradores de uma organização consultem, listem e desativem membros. A criação de novos usuários pertence ao fluxo de criação de organização (ver módulo `organization`) — não existe endpoint independente de cadastro de usuário.

O módulo existe para todos os usuários do sistema: administradores (`admin`), analistas (`analista`) e solicitantes (`solicitante`). Ele é o ponto de entrada da jornada — sem autenticação, nenhuma outra feature é acessível.

---

## 3. Escopo atual versus escopo futuro

**O que já está implementado no backend hoje:**

- Login com email e senha, emitindo access token + refresh token em cookie
- Logout com revogação de todos os refresh tokens ativos e regeneração do security stamp
- Renovação de sessão via cookie `refresh_token` (token rotation)
- Consulta de usuário por ID (scoped à mesma organização)
- Listagem de usuários da organização do usuário autenticado
- Desativação (soft delete) de usuário por admin

**O que ainda não está implementado:**

- Endpoint dedicado de criação de usuário avulso (`POST /identity/users`) — hoje a criação só acontece dentro do fluxo `POST /organization`
- Atualização de dados de usuário (email, role, senha)
- Recuperação de senha via email
- Listagem com filtros ou paginação

**O que existe no domínio mas não está exposto por endpoint:**

- `UserUseCase.create()` existe e funciona, mas não tem rota pública própria

**O que ainda está em discussão:**

- Como adicionar usuários a uma organização já existente

---

## 4. Contexto de produto e semântica da feature

O usuário percebe a feature de identidade principalmente no momento do login e na listagem de membros da equipe (quando admin).

**Login** é considerado bem-sucedido quando retorna `access_token` e o cookie `refresh_token` é gravado. O frontend não precisa persistir o refresh token — ele é gerido automaticamente pelo browser via cookie HTTP-only.

**Logout** deve sempre ser chamado via endpoint (não apenas limpeza de memória local) porque o backend invalida os refresh tokens e regenera o security stamp. Isso significa que qualquer access token JWT emitido antes do logout se torna inválido imediatamente na próxima requisição autenticada — o security stamp no JWT é comparado ao valor atual no banco.

**Refresh** usa rotação de token: o token antigo é revogado e um novo par é emitido. O frontend deve sempre chamar `/refresh` para obter novos tokens antes que o access token expire (30 min). O cookie de refresh é substituído automaticamente na resposta.

---

## 5. Dependências e relações com outras features

- O módulo `identity` é consumido por **todos** os outros módulos como base de autenticação e autorização
- Depende do módulo `organization` para existir (todo usuário pertence a uma organização)
- O módulo `audit` é chamado internamente pela feature de identity em cada ação relevante (login, logout, criação/desativação de usuário)
- As políticas de autorização do sistema inteiro (`can_create_document`, `can_view_audit_logs`, etc.) são definidas em `identity/domain/policies.py`

---

## 6. Rotas públicas

| Método | Path | Tipo | Finalidade | Params de rota | Pronta para frontend? |
|---|---|---|---|---|---|
| POST | `/identity/auth/login` | Mutation | Autentica o usuário e emite tokens de sessão | — | Sim |
| POST | `/identity/auth/logout` | Mutation | Encerra a sessão e revoga tokens | — | Sim |
| POST | `/identity/auth/refresh` | Mutation | Renova o access token usando cookie de refresh | — | Sim |
| GET | `/identity/users/{user_id}` | Query | Retorna dados de um usuário da mesma org | `user_id: UUID` | Sim |
| GET | `/identity/users` | Query | Lista usuários da organização do usuário autenticado | — | Sim |
| DELETE | `/identity/users/{user_id}` | Mutation | Desativa um usuário (soft delete, apenas admin) | `user_id: UUID` | Sim |

---

## 7. Contrato de request

### Request — Login

```
POST /identity/auth/login
Content-Type: application/json
```

Corpo:
- `email`: string (formato email válido), obrigatório — email do usuário
- `password`: string (mínimo 1 caractere), obrigatório — senha em texto plano

Transformações obrigatórias no frontend:
- Nenhuma — os dados são enviados diretamente

Validações relevantes:
- Rate limit: **10 tentativas por 15 minutos por IP**. Na décima primeira tentativa, o backend retorna 429. O frontend deve desabilitar o formulário e exibir mensagem com tempo de espera.

---

### Request — Logout

```
POST /identity/auth/logout
Authorization: Bearer <access_token>
```

Corpo: nenhum

---

### Request — Refresh

```
POST /identity/auth/refresh
Cookie: refresh_token=<token>
```

Corpo: nenhum. O token é lido automaticamente do cookie `refresh_token`.

---

### Request — Listar usuários

```
GET /identity/users?include_inactive=false
Authorization: Bearer <access_token>
```

Query params:
- `include_inactive`: boolean, opcional, default `false` — se `true`, retorna também usuários desativados

---

### Request — Desativar usuário

```
DELETE /identity/users/{user_id}
Authorization: Bearer <access_token>
```

Requer papel `admin`. Retorna 204 sem corpo.

---

## 8. Contrato de response

### Response — Login

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- `access_token`: string JWT — deve ser enviado no header `Authorization: Bearer <token>` em todas as requisições autenticadas

O refresh token é retornado via **cookie HTTP-only** `refresh_token`, com:
- `path=/identity/auth` — o browser envia o cookie APENAS para rotas `/identity/auth`
- `httponly=true` — inacessível via JavaScript
- `samesite=strict`
- `secure=true` em staging/production
- Expiração: 7 dias

### 8.1. Formato canônico versus formato de exibição

O `access_token` chega como string JWT opaca. O frontend não deve decodificá-lo para extrair dados de negócio — use os endpoints de usuário para obter informações do usuário logado.

Datas (`created_at`) chegam em ISO 8601 UTC. O frontend deve formatar para exibição local.

### 8.2. Nullabilidade e ausência de campo

Todos os campos de `UserResponse` são não-nulos exceto onde indicado no schema de response de usuário.

---

### Response — Usuário (GET /identity/users/{id} e listagem)

```json
{
  "id": "uuid",
  "email": "usuario@empresa.com",
  "role": "admin" | "analista" | "solicitante",
  "organization_id": "uuid",
  "is_active": true,
  "created_at": "2026-01-01T00:00:00Z"
}
```

- `id`: UUID estável, nunca muda — usar como chave de reconciliação
- `email`: string, único no sistema
- `role`: enum com 3 valores — `"admin"`, `"analista"`, `"solicitante"`
- `organization_id`: UUID da organização à qual o usuário pertence
- `is_active`: boolean — `false` indica usuário desativado (soft delete)
- `created_at`: ISO 8601 UTC

---

## 9. Estados de negócio e transições

### Ciclo de vida do usuário

```
[ativo] → desativado → (sem retorno)
```

Desativação é permanente pela interface atual — não existe reativação por endpoint. Um usuário desativado perde acesso imediato (o backend verifica `is_active` em cada request autenticada).

### Ciclo de vida da sessão

```
[sem sessão]
    → login → [access token válido (30min) + refresh token válido (7 dias)]
    → (access expira) → refresh → [novo access token + novo refresh token]
    → logout → [todos refresh tokens revogados, security stamp regenerado]
```

O security stamp é um UUID armazenado no banco e embutido no JWT. A cada request autenticada, o backend compara o stamp do JWT com o stamp atual do banco. Se divergirem (por logout ou desativação), a request falha com 401 mesmo que o JWT ainda não tenha expirado.

### 9.1. Ordenação, filtros e agrupamentos

A listagem de usuários (`GET /identity/users`) retorna todos os usuários da organização sem ordenação garantida pelo backend. O frontend pode ordenar livremente — a ordem retornada não tem semântica de negócio.

---

## 10. Erros esperados e edge cases

| Status | Quando acontece | O que comunicar ao usuário |
|---|---|---|
| 401 | Credenciais inválidas no login, token expirado, cookie ausente no refresh, usuário inativo | "Email ou senha incorretos" (para login); "Sessão expirada, faça login novamente" (para outras rotas) |
| 403 | Tentativa de DELETE sem papel admin | "Permissão insuficiente" |
| 404 | GET /users/{id} de usuário de outra organização (retorna 404 propositalmente, não 403) | "Usuário não encontrado" |
| 409 | Não aplicável neste módulo | — |
| 422 | Campos inválidos no login (email malformado, senha vazia) | Exibir mensagem inline por campo |
| 429 | Rate limit no login excedido (10 req/15min por IP) | "Muitas tentativas. Tente novamente em 15 minutos." |

**Edge case importante:** Um admin não pode deletar a própria conta. O backend retorna 400 com `detail: "Cannot delete your own account"`.

**Edge case de refresh:** Se o cookie `refresh_token` não estiver presente ou for inválido/revogado, o endpoint retorna 401. O frontend deve redirecionar para login.

---

## 11. Semântica de autenticação e autorização

- Login (`POST /identity/auth/login`): rota **pública**, não exige token
- Refresh (`POST /identity/auth/refresh`): rota **pública**, usa cookie HTTP-only
- Logout e todas as rotas `/identity/users/*`: exigem **Bearer token** válido no header `Authorization`
- `DELETE /identity/users/{id}`: exige papel **admin**
- `GET /identity/users` e `GET /identity/users/{id}`: qualquer usuário autenticado pode consultar, mas o resultado é sempre scoped à mesma organização

Não existe separação de permissões por papel nas consultas de usuário — qualquer role autenticado vê os membros da própria organização.

---

## 12. Impacto de UX que o frontend precisa saber

- **Login**: após sucesso, o frontend recebe apenas o `access_token`. Para obter nome, role e organização do usuário logado, chamar `GET /identity/users/{id}` logo em seguida (o `sub` do JWT decodificado contém o UUID do usuário)
- **Logout**: limpar o access token da memória e redirecionar para login. O cookie de refresh é removido pelo backend na resposta
- **Refresh automático**: implementar interceptor que, ao receber 401 em qualquer rota autenticada, tenta `POST /identity/auth/refresh` antes de redirecionar para login
- **Desativação**: a listagem não é relida automaticamente pelo backend — o frontend deve invalidar o cache de usuários após um DELETE bem-sucedido
- **Papel do usuário**: o campo `role` da resposta de usuário é a fonte de verdade para renderização condicional de UI (menus, botões, páginas restritas)

---

## 13. Impacto de dados no frontend

- Após logout: limpar access token da memória e qualquer dado de sessão cacheado
- Após DELETE /identity/users/{id}: invalidar o cache de `GET /identity/users` e `GET /identity/users/{id}` do usuário deletado
- Após login: nenhuma query de listagem é afetada

### 13.1. Identificadores estáveis

- `id` do usuário: UUID estável, nunca muda — usar como chave de cache e reconciliação
- `email`: identificador de negócio, único, mas pode mudar em versões futuras (sem endpoint de update hoje)
- `security_stamp`: campo interno do agregado, não aparece nas respostas — nunca usar como chave

### 13.2. Compatibilidade e evolução

Sem contratos legados. Este é o contrato inicial.

---

## 14. Observabilidade e suporte

- O endpoint não retorna `traceId`
- Tentativas de login falhas são registradas nos audit logs com `action: "LOGIN_FAILED"` mesmo quando o usuário não existe (nesse caso, `user_id` será `null` no log)
- Para diagnóstico de sessão inválida, verificar os audit logs com `action: "LOGIN_SUCCESS"` e `action: "LOGOUT"` para o email em questão

---

## 15. Exemplos reais de payload

```json
// Request — Login
{
  "email": "admin@empresa.com",
  "password": "senha123"
}

// Response — Login (200)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzBlYTE2Zi0uLi4iLCJyb2xlIjoiYWRtaW4iLCJzZWN1cml0eV9zdGFtcCI6IjEyM2UtLi4iLCJ0eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzE2MjM5MDIyfQ.xyz"
}

// Response — Usuário (200)
{
  "id": "8c0ea16f-1234-4abc-9def-000000000001",
  "email": "admin@empresa.com",
  "role": "admin",
  "organization_id": "a1b2c3d4-0000-4000-8000-000000000001",
  "is_active": true,
  "created_at": "2026-01-15T10:30:00Z"
}

// Erro de credenciais inválidas (401)
{
  "detail": "Invalid credentials"
}

// Erro de validação (422)
{
  "detail": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "Cannot be blank" }
  ]
}

// Rate limit excedido (429)
{
  "detail": "Too many requests. Try again in 15 minutes."
}
```

---

## 16. Gaps, limitações e decisões abertas

- **Criação de usuário avulso**: não existe endpoint `POST /identity/users`. Para adicionar um segundo usuário a uma organização existente, não há caminho via API. Isso precisa ser resolvido antes de o frontend implementar gestão de equipe.
- **Atualização de perfil**: não existe endpoint de update de usuário (email, senha, role). O frontend não deve oferecer essas ações ao usuário.
- **Reativação de conta**: não existe endpoint de reativação de usuário desativado.
- **Perfil do usuário logado**: não existe endpoint `/me`. O frontend deve usar `GET /identity/users/{id}` com o UUID extraído do JWT (`sub`) para obter dados do usuário logado.
- **Listagem sem paginação**: `GET /identity/users` retorna todos os usuários da organização de uma vez. Para organizações grandes, isso pode ser um problema de performance futuro.

# Contrato de Integração — Módulo `audit`

---

## 1. Identificação da feature

- **Nome da feature**: Audit (Logs de Auditoria)
- **Módulo backend responsável**: `app.modules.audit`
- **Status atual**: `existente`
- **Data da última atualização**: 2026-06-29
- **Responsável técnico**: Grupo P06-A

---

## 2. Objetivo de negócio da feature

O módulo `audit` é o mecanismo de rastreabilidade do DocVault. Ele registra automaticamente todas as ações relevantes de segurança e de negócio que ocorrem no sistema — login, logout, criação e movimentação de documentos, criação e desativação de usuários.

O objetivo é garantir que qualquer ação sensível possa ser auditada retrospectivamente: quem fez, quando, de qual IP, sobre qual recurso. Isso é um requisito de segurança da informação (não funcional) que sustenta todo o sistema.

O módulo existe exclusivamente para consumo de administradores — solicitantes e analistas não têm acesso aos logs. O frontend deve expor essa feature apenas na área administrativa.

---

## 3. Escopo atual versus escopo futuro

**O que já está implementado no backend hoje:**

- Gravação automática de logs em todas as operações dos módulos `identity` e `documents`
- Consulta de logs com filtros por `action` e `user_email` e paginação por `limit`/`offset`
- Ordenação padrão: mais recente primeiro (`created_at DESC`)

**O que ainda não está implementado:**

- Filtro por `target_id` (para buscar o histórico de um documento específico)
- Filtro por `target_type`
- Filtro por intervalo de datas (`created_at` entre X e Y)
- Filtro por `ip`
- Exportação de logs (CSV, PDF)
- Contagem total de registros para paginação (`total_count`)

**O que existe no domínio mas não está exposto por endpoint:**

- Os campos `target_type` e `target_id` do `AuditLog` existem e são gravados, mas não há filtro por eles no endpoint atual

**O que ainda está em discussão:**

- Retenção e expiração de logs
- Logs de nível de sistema (erros de infraestrutura)

---

## 4. Contexto de produto e semântica da feature

O administrador usa os logs de auditoria para investigar incidentes, verificar conformidade e monitorar o comportamento de usuários na plataforma.

**O que é considerado sucesso**: encontrar rapidamente qual usuário realizou qual ação, em qual data/hora, a partir de qual IP.

**O que é considerado erro funcional**: logs faltando para uma ação que deveria ter sido registrada. Isso não é detectável pela interface — o sistema de audit é fire-and-forget (falhas silenciosas no serviço de log não geram erro para o usuário).

Os logs são **imutáveis** — não existem endpoints de update ou delete de entradas de auditoria. O frontend não deve oferecer essas ações.

---

## 5. Dependências e relações com outras features

- O módulo `audit` é **consumido por todos os outros módulos** (`identity`, `documents`) como efeito colateral de cada operação de negócio
- É o único módulo sem dependência de outros (apenas persiste e consulta `AuditLog`)
- O `AuditService.log()` é chamado em try/except: falhas de gravação de log são silenciosas e não afetam a operação principal
- Não depende de `organization` — logs não são filtrados por organização no endpoint atual

---

## 6. Rotas públicas

| Método | Path | Tipo | Finalidade | Params de rota | Pronta para frontend? |
|---|---|---|---|---|---|
| GET | `/audit/logs` | Query | Lista logs de auditoria com filtros e paginação | — | Sim |

---

## 7. Contrato de request

### Request — Listar logs de auditoria

```
GET /audit/logs?action=LOGIN_FAILED&user_email=admin@empresa.com&limit=50&offset=0
Authorization: Bearer <access_token>
```

Requer papel **admin**.

Query params:
- `action`: string, opcional — filtra por tipo de ação exato (case-sensitive). Ver valores possíveis na seção 9
- `user_email`: string, opcional — filtra por email exato do usuário que realizou a ação (case-sensitive)
- `limit`: inteiro, opcional, default `50` — número máximo de registros a retornar
- `offset`: inteiro, opcional, default `0` — número de registros a pular (para paginação)

Transformações obrigatórias no frontend:
- Os filtros `action` e `user_email` são exatos (sem LIKE ou insensibilidade a maiúsculas). O frontend deve normalizar `user_email` para lowercase antes de enviar se o usuário digitar com letras maiúsculas

---

## 8. Contrato de response

### Response — Listagem de logs (200)

Retorna um array de objetos `AuditLogResponse`.

```json
[
  {
    "id": "uuid",
    "user_id": "uuid-ou-null",
    "user_email": "usuario@empresa.com",
    "action": "LOGIN_SUCCESS",
    "target_type": null,
    "target_id": null,
    "detail": null,
    "ip": "192.168.1.100",
    "created_at": "2026-06-20T09:05:00Z"
  }
]
```

Campos:
- `id`: UUID do log — chave estável e única de cada entrada
- `user_id`: UUID ou `null` — UUID do usuário que realizou a ação; `null` quando o usuário não existe no sistema (ex: login com email desconhecido)
- `user_email`: string — email de quem realizou a ação (sempre presente, mesmo quando `user_id` é null)
- `action`: string — código da ação auditada (ver seção 9)
- `target_type`: string ou `null` — tipo do recurso afetado (`"user"`, `"document"`, ou `null` para ações sem alvo)
- `target_id`: UUID ou `null` — ID do recurso afetado
- `detail`: string ou `null` — informação adicional contextual (ex: `"role=analista"`, `"status=aprovado"`)
- `ip`: string ou `null` — endereço IP da requisição (IPv4 ou IPv6, máx. 45 chars)
- `created_at`: ISO 8601 UTC — momento exato da ação

### 8.1. Formato canônico versus formato de exibição

- `action` chega em uppercase com underscores (ex: `"LOGIN_FAILED"`) — o frontend deve mapear para labels legíveis (ex: "Login com falha")
- `created_at` chega em ISO 8601 UTC — formatar para horário local do usuário na exibição
- `ip` chega como string bruta — exibir diretamente

### 8.2. Nullabilidade e ausência de campo

- `user_id`: `null` quando a ação foi tentada com email inexistente (ex: login falho com email não cadastrado)
- `target_type` e `target_id`: `null` para ações de autenticação (`LOGIN_*`, `LOGOUT`); preenchidos para ações sobre recursos
- `detail`: `null` na maioria dos casos; preenchido quando há contexto extra relevante
- `ip`: `null` se a requisição não tiver IP detectável (cenário raro, mas possível em proxy reverso)

---

## 9. Estados de negócio e transições

Logs de auditoria não têm estados — são entradas imutáveis. Cada registro representa um evento pontual no tempo.

### Ações auditadas

| Valor de `action` | Quando é gerado | `target_type` | `target_id` |
|---|---|---|---|
| `LOGIN_SUCCESS` | Login bem-sucedido | `null` | `null` |
| `LOGIN_FAILED` | Tentativa de login com credenciais inválidas | `null` | `null` |
| `LOGOUT` | Logout explícito via endpoint | `null` | `null` |
| `USER_CREATED` | Novo usuário criado (via criação de org ou internamente) | `"user"` | UUID do usuário criado |
| `USER_DEACTIVATED` | Admin desativa um usuário | `"user"` | UUID do usuário desativado |
| `DOC_CREATED` | Documento criado | `"document"` | UUID do documento |
| `DOC_EDITED` | Metadados do documento editados | `"document"` | UUID do documento |
| `DOC_STATUS_CHANGED` | Status do documento alterado | `"document"` | UUID do documento |
| `DOC_DELETED` | Documento excluído (soft delete) | `"document"` | UUID do documento |
| `ACCESS_DENIED` | Acesso negado (campo previsto, não gerado atualmente) | — | — |

**Campo `detail` por ação:**
- `USER_CREATED`: `"role=<valor_do_papel>"` (ex: `"role=analista"`)
- `DOC_STATUS_CHANGED`: `"status=<novo_status>"` (ex: `"status=aprovado"`)
- Demais: `null`

### 9.1. Ordenação, filtros e agrupamentos

- Ordenação padrão: `created_at DESC` (mais recente primeiro) — **preservar essa ordem na UI**. O backend considera essa a ordem oficial do domínio para logs de auditoria.
- Filtros disponíveis: `action` (exato) e `user_email` (exato)
- Filtros não disponíveis: `target_id`, `target_type`, intervalo de datas, `ip`

---

## 10. Erros esperados e edge cases

| Status | Quando acontece | O que comunicar ao usuário |
|---|---|---|
| 403 | Acesso por usuário não-admin | "Permissão insuficiente" |
| 422 | Parâmetros de query com tipo inválido (ex: `limit=abc`) | Exibir erro de validação |

**Edge case de paginação**: o endpoint não retorna `total_count`. O frontend não pode saber quantas páginas existem sem buscar uma página vazia. A estratégia de paginação deve ser "carregar mais" (infinite scroll ou botão "próxima página") em vez de paginação numerada.

**Edge case de filtro por email**: o filtro é exato e case-sensitive. `"Admin@empresa.com"` e `"admin@empresa.com"` retornam resultados diferentes. O frontend deve normalizar o input para lowercase antes de enviar.

**Edge case de `user_id` nulo**: ao exibir a linha de log, o frontend não deve assumir que `user_id` sempre existe. Para `LOGIN_FAILED` com email inexistente, `user_id` é `null` mas `user_email` sempre está presente.

---

## 11. Semântica de autenticação e autorização

- `GET /audit/logs`: exige **Bearer token** + papel **admin**
- Não há endpoint público ou de analista/solicitante para logs
- Os logs de **todas as organizações** são retornados sem filtro por `organization_id` (gap — ver seção 16)

---

## 12. Impacto de UX que o frontend precisa saber

- Logs são somente leitura — não existe ação do usuário que modifique um log
- O frontend deve exibir uma tabela paginada com `limit`/`offset`, sem contagem total de páginas
- A estratégia recomendada é "carregar mais" ao chegar no fim da lista
- Para a interface de filtros, o campo `action` deve ser um select (enum fechado, não texto livre)
- O campo `user_email` no filtro deve ser normalizado para lowercase antes de enviar
- A coluna `detail` tem conteúdo livre e técnico — exibir como texto auxiliar ou tooltip, não como informação primária

---

## 13. Impacto de dados no frontend

Os logs são append-only — não existem mutations que alterem entradas existentes. O frontend pode cachear o resultado de páginas antigas com segurança, já que logs antigos nunca mudam. Apenas a "primeira página" (mais recente) pode ter novos registros.

### 13.1. Identificadores estáveis

- `id` do log: UUID estável e imutável — usar como chave de reconciliação na lista
- `created_at`: imutável após criação

### 13.2. Compatibilidade e evolução

Sem contratos legados. Este é o contrato inicial. Novos tipos de `action` podem ser adicionados — o frontend deve tratar graciosamente valores de `action` desconhecidos (exibir o valor bruto em vez de travar).

---

## 14. Observabilidade e suporte

- O módulo `audit` **é a própria camada de observabilidade** do sistema — não produz logs de si mesmo
- `AuditService.log()` é chamado em bloco `try/except` — falhas de gravação são silenciosas para o usuário final e para o endpoint que gerou a ação. Isso significa que **pode haver ações sem log correspondente** em caso de falha de banco de dados
- Não existe `traceId` nas respostas

---

## 15. Exemplos reais de payload

```json
// Request
// GET /audit/logs?action=LOGIN_FAILED&limit=10&offset=0

// Response (200) — array de logs
[
  {
    "id": "f1a2b3c4-0000-4000-8000-000000000001",
    "user_id": null,
    "user_email": "tentativa@desconhecido.com",
    "action": "LOGIN_FAILED",
    "target_type": null,
    "target_id": null,
    "detail": "Invalid credentials",
    "ip": "200.100.50.25",
    "created_at": "2026-06-29T08:15:00Z"
  },
  {
    "id": "f1a2b3c4-0000-4000-8000-000000000002",
    "user_id": "8c0ea16f-1234-4abc-9def-000000000001",
    "user_email": "admin@empresa.com",
    "action": "LOGIN_FAILED",
    "target_type": null,
    "target_id": null,
    "detail": "Invalid credentials",
    "ip": "192.168.1.1",
    "created_at": "2026-06-29T08:10:00Z"
  }
]

// Exemplo de log de mudança de status de documento
{
  "id": "f1a2b3c4-0000-4000-8000-000000000010",
  "user_id": "b2c3d4e5-0000-4000-8000-000000000002",
  "user_email": "analista@empresa.com",
  "action": "DOC_STATUS_CHANGED",
  "target_type": "document",
  "target_id": "d1e2f3a4-0000-4000-8000-000000000099",
  "detail": "status=aprovado",
  "ip": "10.0.0.5",
  "created_at": "2026-06-28T14:30:00Z"
}

// Exemplo de criação de usuário
{
  "id": "f1a2b3c4-0000-4000-8000-000000000020",
  "user_id": "8c0ea16f-1234-4abc-9def-000000000001",
  "user_email": "admin@empresa.com",
  "action": "USER_CREATED",
  "target_type": "user",
  "target_id": "c3d4e5f6-0000-4000-8000-000000000003",
  "detail": "role=analista",
  "ip": "192.168.1.1",
  "created_at": "2026-06-20T09:00:00Z"
}

// Erro de permissão (403)
{
  "detail": "Insufficient permissions"
}
```

---

## 16. Gaps, limitações e decisões abertas

- **Sem filtro por `target_id`**: não é possível buscar todos os logs de um documento específico via API. Para investigar o histórico de um documento, o admin precisa filtrar manualmente por `user_email` e período — isso é ineficiente.
- **Sem filtro por data**: não é possível restringir logs a um intervalo de tempo pela API.
- **Sem total de registros**: o endpoint não retorna `total_count`, impossibilitando paginação numerada. O frontend deve implementar "carregar mais".
- **Sem isolamento por organização**: logs de todas as organizações são misturados na mesma tabela e retornados sem filtro. Um admin de uma org pode (hoje) enxergar logs de outras orgs se não houver controle na camada de produto.
- **Gravação fire-and-forget**: falhas no `AuditService.log()` são silenciosas. Em cenários de falha de banco, ações podem ocorrer sem registro de auditoria — isso é um risco de conformidade.
- **`ACCESS_DENIED` não implementado**: o enum prevê essa ação, mas ela nunca é gravada atualmente. Tentativas de acesso negado (403) não geram entrada no audit log.
- **Sem exportação**: não existe endpoint de download de logs em CSV, PDF ou outro formato para compliance.

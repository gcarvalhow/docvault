# Contrato de Integração — Módulo `organization`

---

## 1. Identificação da feature

- **Nome da feature**: Organization (Organizações)
- **Módulo backend responsável**: `app.modules.organization`
- **Status atual**: `existente`
- **Data da última atualização**: 2026-06-29
- **Responsável técnico**: Grupo P06-A

---

## 2. Objetivo de negócio da feature

O módulo `organization` é a porta de entrada do DocVault para novos clientes. Uma organização representa uma empresa ou entidade que usa a plataforma — todos os usuários, documentos e logs de auditoria pertencem ao contexto de uma organização.

Ela resolve o problema de isolamento multi-tenant: cada organização enxerga apenas seus próprios usuários e, no modelo atual, acessa somente seu contexto de dados. O módulo existe para que times distintos possam operar no mesmo sistema sem interferência.

A criação de uma organização é o único momento em que o sistema não exige autenticação — é o ato de "se registrar". Ela atomicamente cria a organização e o primeiro usuário com papel de administrador, que depois pode convidar outros membros (via o fluxo de criação de usuário, ainda em gap).

---

## 3. Escopo atual versus escopo futuro

**O que já está implementado no backend hoje:**

- Criação de organização com seu primeiro usuário admin (operação atômica)
- Consulta dos dados da organização do usuário autenticado
- Atualização do nome da organização (somente admin)

**O que ainda não está implementado:**

- Exclusão de organização
- Listagem de organizações (para contexto super-admin, não existe hoje)
- Transferência de propriedade / troca de admin principal

**O que existe no domínio mas não está exposto por endpoint:**

- O campo `is_active` existe no agregado (herdado do model base), mas não é usado — não há desativação de organização

**O que ainda está em discussão:**

- Fluxo de adição de novos usuários a uma organização já existente (gap do módulo `identity`)

---

## 4. Contexto de produto e semântica da feature

Do ponto de vista do usuário, "organização" é o contexto onde ele trabalha. Ele não precisa saber que existe um conceito de organização — ele vê o nome da empresa na interface.

O sucesso na criação de organização é: organização criada + usuário admin criado + login possível imediatamente com as credenciais fornecidas.

O erro funcional seria criar uma organização com nome já existente no sistema (nome único global) ou fornecer senhas que não coincidem.

**A criação de organização é pública e não exige autenticação** — qualquer chamada sem token para `POST /organization` é válida. O frontend de onboarding (cadastro) é o único consumidor desta rota.

---

## 5. Dependências e relações com outras features

- `organization` é criada antes de qualquer usuário existir — é o ponto zero do sistema
- Depende internamente de `identity` para criar o usuário admin durante o cadastro
- Todos os outros módulos (`documents`, `audit`, `identity/users`) dependem indiretamente de `organization` para o contexto tenant
- `organization_id` do usuário autenticado é a chave de isolamento usada em `identity/users` — usuários só enxergam colegas da mesma organização
- Documentos (**gap importante**): o módulo `documents` não filtra por organização hoje — isso é um gap de isolamento documentado na seção 16

---

## 6. Rotas públicas

| Método | Path | Tipo | Finalidade | Params de rota | Pronta para frontend? |
|---|---|---|---|---|---|
| POST | `/organization` | Mutation | Cadastra nova organização + usuário admin | — | Sim |
| GET | `/organization` | Query | Retorna dados da organização do usuário logado | — | Sim |
| PUT | `/organization/{organization_id}` | Mutation | Atualiza nome da organização (admin only) | `organization_id: UUID` | Sim |

---

## 7. Contrato de request

### Request — Criar organização

```
POST /organization
Content-Type: application/json
```

Rota **pública** — não exige `Authorization`.

Corpo:
```json
{
  "organization": {
    "name": "Empresa XYZ"
  },
  "user": {
    "email": "admin@empresa.com",
    "password": "senhaSegura123",
    "confirm_password": "senhaSegura123"
  }
}
```

Campos de `organization`:
- `name`: string não-vazia, obrigatório — nome da organização (máx. 150 caracteres, único globalmente)

Campos de `user` (será o primeiro admin):
- `email`: string (formato email válido), obrigatório
- `password`: string não-vazia, obrigatório
- `confirm_password`: string não-vazia, obrigatório — deve ser idêntico a `password`

Transformações obrigatórias no frontend:
- Garantir que `password` e `confirm_password` são idênticos antes de enviar (o backend também valida e retorna 422 se divergirem, mas validar no frontend melhora a UX)

---

### Request — Atualizar organização

```
PUT /organization/{organization_id}
Authorization: Bearer <access_token>
Content-Type: application/json
```

Requer papel `admin`.

Corpo:
```json
{
  "name": "Novo Nome da Empresa"
}
```

- `name`: string não-vazia, obrigatório — novo nome da organização

---

## 8. Contrato de response

### Response — Criar organização (201)

```json
{
  "id": "uuid-da-organização"
}
```

- `id`: UUID da organização criada — guardar para uso em `PUT /organization/{id}`

### Response — Consultar organização (200)

```json
{
  "id": "a1b2c3d4-0000-4000-8000-000000000001",
  "name": "Empresa XYZ",
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-06-01T15:30:00Z"
}
```

- `id`: UUID estável da organização
- `name`: nome atual da organização
- `created_at`: ISO 8601 UTC — data de criação
- `updated_at`: ISO 8601 UTC — data da última modificação (atualizado pelo banco a cada save)

### 8.1. Formato canônico versus formato de exibição

Datas chegam em ISO 8601 UTC. O frontend deve formatar para exibição local.
O `name` chega exatamente como foi salvo — sem normalização de case ou espaços pelo backend.

### 8.2. Nullabilidade e ausência de campo

Todos os campos de `OrganizationResponse` são obrigatórios e não-nulos.

---

## 9. Estados de negócio e transições

Uma organização não tem ciclo de vida explícito no sistema atual — não existe transição de estado. Ela é criada e permanece ativa indefinidamente. O campo `is_active` existe na tabela (herdado do model base) mas não é usado pela lógica de negócio.

### 9.1. Ordenação, filtros e agrupamentos

`GET /organization` não aceita parâmetros — retorna sempre os dados da organização do usuário autenticado (derivado do JWT). Não há listagem de organizações.

---

## 10. Erros esperados e edge cases

| Status | Quando acontece | O que comunicar ao usuário |
|---|---|---|
| 409 | Nome da organização já existe no sistema | "Este nome de organização já está em uso" |
| 409 | Email do usuário admin já cadastrado | "Este email já está cadastrado" |
| 403 | Tentativa de PUT por usuário não-admin | "Permissão insuficiente" |
| 403 | Tentativa de atualizar organização diferente da do usuário | Backend retorna 404 (via assert_same_tenant) |
| 404 | PUT em organization_id inexistente ou de outra org | "Organização não encontrada" |
| 422 | Campos inválidos (senhas divergentes, email malformado, nome vazio) | Exibir mensagem inline por campo |

**Edge case de isolamento no PUT**: o backend usa `assert_same_tenant` para verificar se `organization_id` da URL corresponde à organização do usuário autenticado. Se divergirem, a resposta é 404 (não 403) — intencionalmente, para não revelar a existência de outras organizações.

---

## 11. Semântica de autenticação e autorização

- `POST /organization`: **pública**, sem autenticação
- `GET /organization`: exige **Bearer token** — retorna sempre a organização do usuário autenticado (não aceita `organization_id` como parâmetro)
- `PUT /organization/{id}`: exige **Bearer token** + papel **admin**

---

## 12. Impacto de UX que o frontend precisa saber

- **Criação**: após `POST /organization` com sucesso (201), o frontend deve redirecionar para o login usando as credenciais fornecidas — o usuário admin não está logado ainda
- **GET /organization**: pode ser chamado assim que o access token estiver disponível — útil para exibir o nome da empresa no header/sidebar
- **PUT /organization**: após sucesso (204), o frontend deve reler `GET /organization` para atualizar o nome exibido em cache

---

## 13. Impacto de dados no frontend

- Após `PUT /organization/{id}` (204): invalidar cache de `GET /organization`
- O `id` da organização não muda nunca — é seguro usar como chave permanente

### 13.1. Identificadores estáveis

- `id` da organização: UUID estável, nunca muda
- `name`: pode ser atualizado via PUT — não usar como chave de cache

### 13.2. Compatibilidade e evolução

Sem contratos legados. Este é o contrato inicial.

---

## 14. Observabilidade e suporte

- Sem `traceId` nas respostas
- A criação de organização gera um `USER_CREATED` nos audit logs (para o admin criado junto)
- Erros de 409 (nome duplicado) são frequentes em ambiente de produção compartilhado

---

## 15. Exemplos reais de payload

```json
// Request — Criar organização
{
  "organization": { "name": "Clínica São Paulo" },
  "user": {
    "email": "admin@clinica.com",
    "password": "Admin@2026",
    "confirm_password": "Admin@2026"
  }
}

// Response — Criar (201)
{
  "id": "a1b2c3d4-0000-4000-8000-000000000001"
}

// Response — Consultar (200)
{
  "id": "a1b2c3d4-0000-4000-8000-000000000001",
  "name": "Clínica São Paulo",
  "created_at": "2026-01-10T09:00:00Z",
  "updated_at": "2026-06-01T14:00:00Z"
}

// Request — Atualizar
{
  "name": "Clínica São Paulo e Região"
}

// Conflito de nome (409)
{
  "detail": "organization name already exists"
}

// Validação (422)
{
  "detail": [
    { "field": "user.email", "message": "Invalid email" },
    { "field": "organization.name", "message": "Cannot be blank" }
  ]
}
```

---

## 16. Gaps, limitações e decisões abertas

- **Sem listagem global**: não existe endpoint para listar organizações. Não há conceito de super-admin na API atual.
- **Sem exclusão**: organizações não podem ser excluídas pela API.
- **Adição de usuários pós-criação**: após criar a organização, não há como adicionar novos usuários via API (`POST /identity/users` não existe). Este é o gap mais crítico para uso real do produto.
- **Isolamento de documentos**: o módulo `documents` não usa `organization_id` como filtro — documentos de todas as organizações podem ser visíveis para admins/analistas de qualquer organização. Isso é um gap de segurança multi-tenant que precisa ser resolvido antes de produção.
- **Atualização sem auditoria**: o `PUT /organization` não gera entrada no módulo `audit`. Mudanças de nome não são rastreadas nos logs.

# TEMPLATE — Contrato de Integração Backend → Frontend

Este arquivo é o modelo canônico para geração do contrato de integração de uma
feature após sua implementação no backend.

---

## Por que este modelo existe

Hoje existe um problema clássico em quase todo time:

- o backend sabe demais sobre a implementação interna;
- o frontend sabe demais sobre a experiência final;
- mas a documentação trocada entre os dois normalmente é pobre, vaga ou
  centrada em endpoint cru.

Quando isso acontece, o frontend fica sem saber com clareza:

- o que a feature representa no produto;
- se a rota é realmente pronta para uso ou ainda parcial;
- qual a diferença entre comportamento atual e visão futura;
- como interpretar enums, statuses e erros;
- o que precisa ser transformado antes de enviar;
- o que precisa ser interpretado depois de receber;
- quais edge cases são esperados;
- se existem gaps de autenticação, permissão ou consistência.

Esse modelo existe para corrigir isso.

---

## O que o backend precisa saber sobre o frontend

O frontend tipicamente organiza a integração em camadas:

1. definição de endpoints e base URLs;
2. schemas e tipos derivados do contrato da API;
3. camada de serviço/primitiva (fetch, tratamento de erro, serialização);
4. queries (leituras com cache, refetch automático);
5. mutations (escritas com invalidação de cache e UI otimista);
6. componentes de orquestração que consomem queries e mutations;
7. componentes de apresentação que recebem apenas dados prontos.

A documentação precisa oferecer insumo para essas camadas — não apenas listar endpoints.

---

## Informações técnicas globais

Estas informações são transversais e devem ser consideradas em toda documentação:

- **Base path**: sem prefixo `/api`; rotas diretas na raiz — `/identity`, `/automations`,
  `/jobs`, `/machines`, `/sgg`, `/schedules`
- **Versionamento**: não existe atualmente
- **Envelope de erro**:
  - Erros HTTP gerais: `{ "detail": "mensagem de erro" }`
  - Erros de validação (422): `{ "detail": [{ "field": "campo", "message": "descrição" }] }`
- **Auth**: JWT Bearer token (access token, 30 min) + refresh token (7 dias, cookie HTTP-only
  `refresh_token`). Totalmente implementado. Toda doc deve dizer explicitamente se a feature
  exige autenticação e qual nível de permissão (usuário comum vs. admin).
- **Backend usa DDD + Event-Driven (Outbox Pattern)** — sem CQRS. Não há separação entre
  read model e write model. A doc deve descrever o ciclo de vida dos agregados quando relevante.

---

# Template: Documentação de Feature

## 1. Identificação da feature

- **Nome da feature**:
- **Módulo backend responsável**:
- **Status atual**: `existente` | `parcial` | `em evolução` | `planejada` | `legado`
- **Data da última atualização**:
- **Responsável técnico**:

O frontend precisa saber se está integrando algo pronto para uso, algo parcial,
algo que ainda depende de endpoints faltantes, ou algo que existe no código mas
não deve ser tratado como feature consolidada do produto.

---

## 2. Objetivo de negócio da feature

Descreva em parágrafos (não apenas em bullets):

- qual problema de negócio essa feature resolve;
- por que ela existe;
- para quem ela existe;
- em que ponto da jornada do usuário ela entra;
- como ela se conecta com outras features da plataforma DOM Med.

O frontend precisa entender o papel da feature no produto para conseguir
priorizar estados de UX, nomear bem textos e labels, decidir loading, empty
states e erros, e manter coerência com outras features.

---

## 3. Escopo atual versus escopo futuro

**O que já está implementado no backend hoje:**

**O que ainda não está implementado:**

**O que existe no domínio mas não está exposto por endpoint:**

**O que é apenas visão futura de produto:**

**O que ainda está em discussão:**

---

## 4. Contexto de produto e semântica da feature

Descreva em parágrafos:

- como o usuário percebe essa feature;
- o que é considerado sucesso ao usá-la;
- o que é considerado erro funcional;
- que tipos de estados ou transições importam.

Sem semântica de feature, o frontend integra uma rota mas não integra o
comportamento correto. Por exemplo: para `Automation`, não basta saber que
existe `POST /jobs`. O frontend precisa saber o que significa disparar um job,
se o status muda imediatamente ou de forma assíncrona, se é necessário polling,
quais transições de `JobStatus` são possíveis, etc.

---

## 5. Dependências e relações com outras features

- De quais outras features esta feature depende?
- Quais features consomem esta feature?
- Se ela é central, complementar ou derivada no produto.
- Dependências de dados de outro módulo.
- Ligação com os módulos da plataforma: `identity`, `automations`, `jobs`, `machines`, `sgg`, `schedules`.

---

## 6. Rotas públicas

| Método | Path | Tipo | Finalidade | Params de rota | Pronta para frontend? |
|---|---|---|---|---|---|
| | | | | | |

Não listar apenas a rota. Explicar o papel dela.

---

## 7. Contrato de request

Para cada operação:

```md
### Request — {nome da operação}

Corpo:
- `fieldName`: tipo, obrigatoriedade, descrição funcional

Transformações obrigatórias no frontend:
- (ex: array que vira string JSON, campo que não pode ser string vazia, etc.)

Validações relevantes:
-
```

---

## 8. Contrato de response

Para cada operação:

```md
### Response — {nome da operação}

- `fieldName`: tipo | significado | impacto no frontend
```

### 8.1. Formato canônico versus formato de exibição

Documentar quais campos chegam em formato canônico (ex: CNPJ sem máscara, datas
em ISO) e quais chegam prontos para exibição. Sem isso, o frontend descobre na
prática onde mascarar, desmascarar ou formatar.

### 8.2. Nullabilidade e ausência de campo

Explicar quando um campo pode ser `null`, string vazia, ou simplesmente omitido
da resposta. Documentar se `null` é semanticamente diferente de "não preenchido".

---

## 9. Estados de negócio e transições

Documentar estados que a feature pode assumir, como transita de um estado para
outro, o que pode bloquear a transição, e quais CTAs ou telas dependem desse
estado.

Sem isso, o frontend monta UI correta visualmente, mas errada semanticamente.

### 9.1. Ordenação, filtros e agrupamentos com semântica de negócio

Documentar ordenação padrão do backend, filtros aplicados implicitamente,
filtros que o backend ainda não suporta, e se a ordem retornada pela API precisa
ser preservada. O frontend não deve reordenar localmente algo que o backend
considera ordem oficial do domínio.

---

## 10. Erros esperados e edge cases

Não escrever apenas "pode retornar 400/409/500". Explicar em linguagem de negócio:

- quando acontece;
- por que acontece;
- o que o frontend deveria comunicar para o usuário;
- se o frontend deve bloquear uma ação antes;
- se o frontend deve apenas mostrar a mensagem do backend.

---

## 11. Semântica de autenticação e autorização

- A feature exige autenticação?
- Qual contexto de usuário ela assume?
- Ela já depende de permissão por papel?
- Hoje todos os usuários têm o mesmo poder nessa feature?
- Existe gap entre auth real e auth esperada?

---

## 12. Impacto de UX que o frontend precisa saber

O backend não precisa desenhar a UI, mas precisa documentar tudo o que afeta
como a UI deve reagir:

- a operação retorna id novo?
- é instantânea ou depende de reconciliação posterior?
- a lista deve ser relida depois da mutation?
- a ordem importa visualmente?
- existem mensagens de erro que devem virar feedback inline?
- o usuário deve ser redirecionado ou apenas ver o dado atualizado?
- existe campo que precisa de máscara visual mesmo vindo sem máscara?

---

## 13. Impacto de dados no frontend

Quais leituras do frontend ficam desatualizadas após cada mutation? Quais
entidades relacionadas também são afetadas? Existe risco de stale data?
A feature aceita UI otimista com segurança?

### 13.1. Identificadores estáveis e chaves de reconciliação

Quais campos são ids estáveis? Quais campos podem mudar sem quebrar identidade?
Quais campos nunca devem ser usados como chave de reconciliação pelo frontend?

### 13.2. Compatibilidade e evolução de contrato

Esta feature substitui contrato antigo? Coexistem contratos legados e novos?
Quais mudanças exigem ajuste obrigatório no frontend?

---

## 14. Observabilidade e suporte

- O endpoint retorna `traceId`?
- Existem logs relevantes para diagnóstico?
- Como o frontend pode registrar um erro de forma útil para suporte?

---

## 15. Exemplos reais de payload

```json
// Request válido — {nome da operação}
{}

// Response válida — {nome da operação}
{}

// Erro de validação
{}

// Conflito (se existir)
{}
```

---

## 16. Gaps, limitações e decisões abertas

Fechar a documentação sempre com o que ainda falta, o que está parcial, o que
está desalinhado entre frontend, backend e produto, e o que precisa de validação
futura.

Esta seção é obrigatória porque a pior documentação para o frontend é a que
parece completa, mas esconde incerteza.

---
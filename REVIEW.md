# Revisão de produção — Aperture

Revisão completa do app em **30/07/2026**, contra o commit `479d2e9`.
Escopo: prontidão para cobrar usuários reais + postura de segurança para dados
biométricos (fotos de rosto de terceiros).

Método: leitura de todo o código de aplicação (auth, pipeline, billing, storage,
rotas, páginas legais), `tsc --noEmit`, `eslint`, `next build` e `npm audit`.

**Veredito: não está pronto para cobrar hoje — mas está perto.** A engenharia é
sólida e passa limpo em build, typecheck e lint. O que falta são 2 bloqueadores
de configuração, 3 patches de dependência e um punhado de lacunas operacionais.

---

## Sumário de prioridades

| # | Item | Categoria | Esforço |
|---|---|---|---|
| ~~1~~ | ~~[`sharp@0.35.3`](#1-sharp-desatualizado--4-cves-no-libvips)~~ — ✅ **feito em 30/07** | 🔥 Segurança | — |
| ~~2~~ | ~~[`npm audit fix`](#2-authcore-crítico)~~ — ✅ **feito em 30/07** | 🔥 Segurança | — |
| ~~3~~ | ~~[`next@16.2.12`](#3-nextjs-1629--16212)~~ — ✅ **feito em 30/07** | 🔥 Segurança | — |
| 4 | [Preencher `lib/legal.ts`](#4-placeholders-jurídicos-em-produção) | 🔴 Bloqueador | 5 min |
| 5 | [Paddle sandbox → live](#5-paddle-ainda-em-sandbox) | 🔴 Bloqueador | ~1 h |
| 6 | [Checkbox de consentimento](#6-consentimento-é-texto-passivo-não-ato-afirmativo) | 🟠 Jurídico | 30 min |
| 7 | [Observabilidade (Sentry / log drain)](#7-zero-observabilidade) | 🟠 Operacional | 1–2 h |
| 8 | [Ferramenta de suporte (re-run / refund)](#8-nenhuma-ferramenta-de-suporte) | 🟠 Operacional | 1–2 h |
| 9 | [Deletar `datasets/*/train.zip` pós-treino](#9-retenção-a-cópia-que-fica-para-sempre) | 🟠 Privacidade | 20 min |
| 10 | [Página pública de takedown](#10-não-existe-canal-para-a-pessoa-retratada) | 🟠 Jurídico | 30 min |
| 11 | [Travar `replicas=1` no Coolify](#11-uma-instância-é-restrição-arquitetural-não-preferência) | 🟠 Operacional | 5 min |
| 12 | [Filtrar shots não entregues no servidor](#13-toclientorder-envia-shots-não-entregues) | 🟡 Segurança | 10 min |
| ~~13~~ | ~~[`crypto.randomBytes` no `newOrderId`](#14-neworderid-usa-mathrandom-com-upsert)~~ — ✅ **feito em 30/07** | 🟡 Correção | — |
| ~~14~~ | ~~[Label `refunded` no billing](#15-billing-não-tem-label-para-refunded)~~ — ✅ **feito em 30/07** | 🟡 UX | — |
| 15 | [Testes das funções puras e de entitlement](#17-nenhum-teste) | 🟡 Qualidade | 3–4 h |

Itens **1–5** são pré-requisito de deploy. **6–11** são o que eu resolveria antes
de volume real. **12–15** entram na semana seguinte.

---

## 🔥 Segurança — patches obrigatórios

### 1. `sharp` desatualizado — 4 CVEs no libvips

```
sharp 0.34.5 (libvips 8.17.3)  →  severity: high
CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591
```

Isso pesa mais aqui do que pesaria em quase qualquer outro app: **`sharp` é o
componente que faz o parsing da entrada não-confiável mais sensível do sistema**
— as fotos que estranhos fazem upload.

Caminho de ataque:

```
POST /api/orders → validateSelfies()  → sharp(buf).metadata()  ← libvips parseia bytes hostis
                 → downscale()        → sharp(buf).rotate()     ← idem, sem sandbox
```

Um JPEG/PNG/WebP malformado explorando heap overflow no libvips executa código
**no processo do app**, que tem em memória `R2_SECRET_ACCESS_KEY`,
`DATABASE_URL`, `REPLICATE_API_TOKEN` e `AUTH_SECRET`. Resultado: bucket inteiro
de rostos, banco, e capacidade de forjar sessão de qualquer usuário.

O atacante não precisa nem pagar — `validateSelfies()` roda **antes** do
`consumePurchase()` (`app/api/orders/route.ts:133` vs `:147`). Basta uma conta
com email verificado.

```sh
npm i sharp@0.35.3   # requer node >= 20.9
npm run build        # 0.34 → 0.35 tem breaking changes; verificar
```

> **Crédito onde é devido:** o `downscale()` re-encodar tudo para JPEG via sharp
> já neutraliza polyglots e payloads embutidos. A defesa está certa — o problema
> é a versão do parser que a executa.

### 2. `@auth/core` (crítico)

`getToken()` lança exceção não capturada com header `Bearer` malformado
(GHSA-xmf8-cvqr-rfgj). O `proxy.ts` roda NextAuth em toda rota não-API, então
qualquer um manda um header lixo e derruba requests.

Os outros dois avisos do mesmo pacote **não se aplicam**: homoglyph no
normalizador de email afeta o provider Email (o app usa só Credentials), e o
binding de state/nonce/PKCE afeta OAuth (o app não tem provider OAuth).

```sh
npm audit fix   # patch, sem breaking change
```

### 3. Next.js 16.2.9 → 16.2.12

O aviso relevante é **"Middleware/Proxy bypass in App Router applications using
Turbopack"** (GHSA-6gpp-xcg3-4w24) — o app usa `proxy.ts` + Turbopack.

> **A arquitetura já mitiga.** O bypass não vira invasão porque o proxy **não é o
> único portão**: toda página do dashboard chama `requireUserId()`
> (`lib/dal.ts:12`) e toda rota de API chama `auth()`. O gate real está na camada
> de dados. Isso é defense-in-depth funcionando — mas atualize mesmo assim.

Os demais (SSRF em rewrites, DoS em Server Actions, disclosure de Server
Functions) têm exposição baixa nesta configuração, e o mesmo patch cobre todos.

```sh
npm i next@16.2.12
```

`prisma` / `hono` / `valibot` / `postcss` são build- e CLI-time. Baixa prioridade.

---

## 🔴 Bloqueadores

### 4. Placeholders jurídicos em produção

`lib/legal.ts:11-17` contém:

```ts
export const ENTITY = "[COMPANY LEGAL NAME]";
export const ADDRESS = "[REGISTERED ADDRESS]";
export const JURISDICTION = "[JURISDICTION]";
```

Esses valores saem **literalmente** no rodapé de toda página pública
(`app/components/site-footer.tsx:102` → `© 2026 [COMPANY LEGAL NAME]`) e no §1
dos Termos. O Paddle reprova a conta live por isso, e um Terms sem entidade
nomeada não vincula ninguém.

Correção: um arquivo, três linhas.

### 5. Paddle ainda em sandbox

`NEXT_PUBLIC_PADDLE_ENV=sandbox`, com chaves e `pri_…` de sandbox. O
procedimento está documentado em `DEPLOY.md` §2 — só não foi executado.

Dois detalhes que quebram deploy se esquecidos:

- As variáveis `NEXT_PUBLIC_*` entram no bundle **no build**. Trocar exige
  redeploy, não basta reiniciar o container.
- A Notification precisa assinar os **três** eventos (`transaction.completed`,
  `adjustment.created`, `adjustment.updated`). Sem os dois de `adjustment`, quem
  pedir reembolso continua com direito de gerar — e o Replicate é cobrado de você.

---

## 🟠 Fotos de terceiros — exposição jurídica

A `Privacy Policy` §3 classifica corretamente as fotos como **dado biométrico sob
Art. 9 do GDPR** e declara a base legal como *explicit consent*. Isso está acima
do padrão do setor. O problema é que a UI não entrega o padrão que a política
afirma cumprir.

### 6. Consentimento é texto passivo, não ato afirmativo

`app/dashboard/new/new-client.tsx:379` traz o texto correto — *"you confirm these
are photos of you (or of an adult who agreed to this)"* — mas como **parágrafo
acima do botão**, sem interação.

"Explícito" no Art. 9(2)(a) pede ação inequívoca. **BIPA (Illinois)** vai além e
exige consentimento **escrito** para geometria facial — e o gate ArcFace faz
exatamente identificação facial única. Um parágrafo que o usuário pode não ler
não sustenta nenhum dos dois.

Você está exposto justamente por ter **declarado um padrão mais alto do que a UI
entrega**.

**Correção:** checkbox obrigatório separado, com o texto atual, e gravar no
`Order` o timestamp + a versão do texto aceito. Isso vira sua prova de
consentimento em caso de disputa.

```prisma
model Order {
  // ...
  consentAt      DateTime?
  consentVersion String?   // ex.: "2026-07-30"
}
```

### 7. Não existe canal para a pessoa retratada

Se alguém subir o rosto de outra pessoa, **essa pessoa não tem conta, não tem
sessão e não tem como te contatar dentro do produto**. Sob GDPR ela tem direito
de apagamento igual — direito que ela literalmente não consegue exercer.

Falta uma página pública de takedown (`/takedown`) e um processo documentado de
resposta. Barato de fazer, e é a primeira coisa que um regulador pergunta.

### 8. Nenhum controle técnico sobre quem está na foto

O classificador NSFW roda só nas **saídas** (`tickScoring`). Nada detecta menor
de idade na **entrada**. Os Termos §2 cobrem contratualmente; tecnicamente é
confiança pura.

Para um produto de geração facial, é o maior risco reputacional. O
`validateSelfies()` — que já processa cada foto — é o lugar natural para um
classificador de idade, se você decidir fechar isso.

### 9. Retenção: a cópia que fica para sempre

A `deleteAccount()` (`app/actions/profile.ts:44`) é genuinamente boa: alcança as
três cópias do rosto — banco, R2 e a **versão LoRA no Replicate** — e ordena os
deletes externos **antes** da transação de banco, para nada ficar órfão sem
registro. Melhor que a maioria do mercado.

O problema é o cliente que **não** deleta a conta:

| Artefato | Hoje | Deveria |
|---|---|---|
| `datasets/<orderId>/train.zip` — conjunto completo de selfies originais | fica para sempre | deletar ao sair de `training` |
| Versão LoRA no Replicate — modelo do rosto da pessoa | fica para sempre | política de expiração |
| Pedidos `failed` / abandonados | idem | idem |

A Privacy §9 diz *"we do not delete finished batches on a timer"* — coerente para
a **galeria** (o cliente quer as fotos dele). Mas `train.zip` e o LoRA não são a
galeria: são a matéria-prima biométrica, sem utilidade após o treino. Mantê-los
indefinidamente contraria minimização (Art. 5(1)(c)) e amplia o raio de explosão
de um vazamento.

---

## 🟠 Operacional

### 10. Zero observabilidade

Só `console.error`. O `advanceOrder` engole erro de tick e retenta para sempre
(`lib/pipeline.ts:149-157`); o cron loga pedido travado em stdout
(`app/api/cron/advance/route.ts:64`). Na prática você só descobre que o batch
pago de um cliente congelou lendo log de container.

Mínimo viável: Sentry, ou um log drain com alerta em:

- `[cron] order … stuck` — pedido parado > 24 h
- `ALREADY-CONSUMED` — reembolso de pack já gasto, precisa de decisão humana
- `ORPHANED likeness model` — deleção de conta que não completou no Replicate

Esses três são os únicos eventos do sistema que exigem intervenção humana. Se
alertarem, você não precisa de mais nada por enquanto.

### 11. Nenhuma ferramenta de suporte

A Refund Policy promete *"a free re-run or a refund"*. Hoje, um re-run grátis é
um `INSERT` manual de `Purchase` no Neon. Pedido `failed` deixa a compra em
`consumed` e o cliente sem nada até intervenção manual.

Um script CLI já resolve:

```
scripts/grant-pack.ts <email> <packId>   # emite Purchase completed
scripts/order-status.ts <orderId>        # inspeciona o estado do pipeline
```

### 12. Uma instância é restrição arquitetural, não preferência

Três estruturas são in-process e assumem um único processo:

| Estrutura | Arquivo | Se houver réplica |
|---|---|---|
| `advancing` / `dirty` | `lib/pipeline.ts:127-130` | dois processos tickam o mesmo pedido → **predictions duplicadas no Replicate, dinheiro real** |
| `buckets` (rate limit) | `lib/ratelimit.ts:19` | limites de auth deixam de valer |
| `signCache` | `lib/r2.ts:102` | só perda de cache, inofensivo |

Está corretamente documentado no `DEPLOY.md`, mas precisa virar configuração
travada: **fixe `replicas=1` no Coolify** para que ninguém aumente sem revisar.

---

## 🟡 Correções menores

### 13. `toClientOrder` envia shots não entregues

`lib/view.ts:107` serializa **todos** os shots com URL presignada, incluindo os
reprovados no gate de identidade e os marcados NSFW. A UI filtra no client
(`order-view.tsx:91`).

É dado do próprio usuário, então não é vazamento — mas uma imagem sinalizada
está a um devtools de distância. Filtre no servidor.

### 14. `newOrderId()` usa `Math.random()` com upsert

`lib/store.ts:148` gera `"ord_" + Math.random().toString(36).slice(2,10)`, e
`saveOrder` é um **upsert** — uma colisão sobrescreve silenciosamente o pedido de
outro usuário. Probabilidade ínfima na escala atual (~2e-5 em 10 k pedidos), mas
a correção é uma linha:

```ts
import { randomBytes } from "node:crypto";
export function newOrderId(): string {
  return "ord_" + randomBytes(8).toString("base64url");
}
```

### 15. Billing não tem label para `refunded`

`app/dashboard/billing/page.tsx:9` — o `STATUS_LABEL` não cobre `refunded`, então
uma compra reembolsada renderiza a string crua `"refunded"` num badge âmbar de
"pendente". Cosmético, mas é exatamente a tela que o cliente reembolsado abre.

### 16. `createCheckout` sem rate limit

`app/actions/billing.ts:29` cria linhas `pending` ilimitadas por usuário, nunca
limpas, poluindo a tela de billing para sempre. Adicione limite + varredura de
pendentes antigos.

### 17. Nenhum teste

Zero arquivos de teste. Entendo a restrição de que cada e2e custa um treinamento
LoRA — mas estas são lógica pura ou de banco, sem tocar o Replicate:

- `distribute()`, `rankScore()`, `aHash()` / `hamming()` — `lib/recipe.ts`, `lib/pipeline.ts`
- corrida do `consumePurchase()` / `releasePurchase()` — `lib/entitlement.ts`
- transições de status do webhook Paddle — `app/api/webhooks/paddle/route.ts`
- `consumeToken()` single-use — `lib/tokens.ts`

Todas guardam invariantes que envolvem dinheiro ou acesso.

### 18. Superfície menor

- **URLs presignadas são bearer tokens** — 1 h (UI) e 24 h (Replicate). Vazou a
  URL, vazou a imagem, sem sessão. O `Referrer-Policy: strict-origin-when-cross-origin`
  protege contra vazamento por referer ✓.
- **CSP com `unsafe-inline` + `unsafe-eval`** — exigido pelo runtime do Next, mas
  significa que um XSS exfiltra todas as URLs presignadas da página.
- **Sem 2FA** — takeover de conta dá acesso ao dataset facial completo de uma
  pessoa. Para dado Art. 9, senha sozinha é fraco. A revogação via
  `passwordChangedAt` é remediação, não prevenção.
- **Rate limit fail-open** (`lib/ratelimit.ts:52`) e em memória — some a cada
  deploy.
- **Sem log de auditoria** de acesso a imagem. Em caso de incidente, você não
  consegue determinar o escopo — que é o que a notificação sob GDPR Art. 33 exige.
- **Modelo Replicate compartilhado** — todos os LoRAs de clientes vivem sob
  `igorsoares0/aperture-identity` (`lib/recipe.ts:36`), numa conta pessoal.
  Deleção por versão funciona; considere conta de organização.
- **Lifecycle rules do R2 nunca testadas** e **modo webhook do Replicate nunca
  testado** — ambos já sinalizados no `DEPLOY.md`.

---

## ✅ O que está sólido

Verificado, não elogio genérico:

**Autorização em camadas.** Toda rota e página resolve o usuário server-side;
`/api/orders/[id]` checa `order.userId !== session.user.id`; galeria, favoritos e
pedidos escopados por `requireUserId()`. Não há uma única rota sem gate — é o que
neutraliza o aviso de proxy bypass do Next.

**Autenticação cuidadosa.** bcrypt com dummy-hash equalizando timing
(`auth.ts:11`); revogação de JWT via `passwordChangedAt`; tokens de uso único
armazenados só como SHA-256; signup anti-enumeração com padding de resposta
(`SIGNUP_RESPONSE_MS`); rate limit por ação; troca de senha exigindo a atual.

**Billing defensivo.** Webhook com assinatura verificada e — o ponto crítico —
**validação de preço contra o pack** (`webhooks/paddle/route.ts:41`), que fecha a
manipulação do `customData` escolhido no cliente. Transições idempotentes
condicionadas ao status, `consumePurchase` atômico com release em falha, e
reembolso/chargeback com revogação **e** reversão.

**Nenhum PII em log.** Auditei os 18 `console.*`: só IDs de pedido, compra e
transação. Zero email, zero URL de imagem, zero caminho de arquivo. Disciplina rara.

**Storage.** Bucket privado, leitura só por URL presignada, zero proxy de bytes,
presign memoizado para não invalidar o cache de imagem do browser a cada poll,
`referenceUrls` removidas antes de serializar ao cliente.

**Deleção de conta** alcança a terceira cópia do rosto (a versão LoRA), ordena os
deletes externos antes da transação, e loga alto quando falha.

**Nenhum segredo no git** — `.env*` ignorado, histórico limpo, `.data/` e
`photos/` nunca commitados.

**Infra de deploy.** Migrations versionadas com `migrate deploy` no pre-deploy;
cron sweep torna a entrega independente do browser; pedido travado é pulado e
logado, não auto-falhado (decisão certa — auto-falhar custaria o pack do cliente).

**`DEPLOY.md` é honesto** sobre o que nunca foi testado. Isso é raro e vale muito.

---

## Checklist de release

```
[x] npm i sharp@0.35.3 + overrides           # feito 30/07 — libvips 8.18.3, cadeias testadas
[x] npm audit fix                            # feito 30/07 — @auth/core
[x] npm i next@16.2.12                       # feito 30/07
[x] crypto.randomBytes em newOrderId         # feito 30/07
[x] Label "refunded" no billing              # feito 30/07
[ ] lib/legal.ts — ENTITY / ADDRESS / JURISDICTION
[ ] Paddle live: produtos, prices, webhook (3 eventos), env vars, redeploy
[ ] Checkbox de consentimento + consentAt/consentVersion no Order
[ ] Sentry ou log drain com alerta nos 3 eventos críticos
[ ] scripts/grant-pack.ts
[ ] Deletar datasets/*/train.zip ao sair de training
[ ] Página /takedown
[ ] Coolify: replicas = 1 (travado)
[ ] Filtrar shots não entregues em toClientOrder
[ ] Rodar o checklist pós-deploy do DEPLOY.md §6
```

---

## Anexo — o que foi aplicado em 30/07/2026

```
sharp   0.34.5 (libvips 8.17.3)  →  0.35.3 (libvips 8.18.3)
next    16.2.9                   →  16.2.12
eslint-config-next  16.2.9       →  ^16.2.12
@auth/core                       →  patch via npm audit fix
+ overrides: { "sharp": "^0.35.3" }
```

O `overrides` foi necessário porque o Next carrega uma cópia **aninhada** de
`sharp` para a Image Optimization API — subir só o pacote de topo deixava
`node_modules/next/node_modules/sharp@0.34.5` vulnerável na árvore. Com o
override, a árvore inteira deduplica em 0.35.3.

Verificação: `tsc --noEmit`, `eslint` e `next build` limpos, mais um script que
exercita as quatro cadeias `sharp` do app (metadata, raw greyscale 512, downscale
1024 JPEG, aHash 8×8) contra fotos reais de 4208×3120 e 6240×8416, incluindo EXIF
orientation 8. Isso importa porque **o build não toca em `sharp`** — passar no
build não prova nada sobre o upgrade.

**Vulnerabilidades restantes (2):** `postcss` aninhado dentro do `next`, usado em
build-time para processar o seu próprio CSS — não há caminho para bytes
controlados por atacante. O `npm audit fix --force` "resolveria" instalando
`next@9.3.3`, o que é absurdo. Some sozinho quando o Next publicar o bump.

Alterações de código:

- `lib/store.ts` — `newOrderId()` agora usa `randomBytes(8).toString("hex")`
  (`ord_` + 16 hex, 64 bits). Ids existentes em base36 continuam válidos: nada no
  app valida ou faz parsing do formato.
- `app/dashboard/billing/page.tsx` — label `Refunded` + badge `bg-danger/10`,
  em vez da string crua `"refunded"` num badge âmbar de "pendente".

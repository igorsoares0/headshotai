# Deploy — Hetzner + Coolify

Guia para colocar o app em produção num servidor Hetzner gerenciado pelo Coolify.
Nenhuma mudança de código é necessária: o estado vive todo no Neon (Postgres) e no
R2 (imagens), então o container pode reiniciar/redeployar sem perder nada.

## Pré-requisitos

- Servidor Hetzner com Coolify instalado e acessível.
- Domínio apontado para o IP do servidor (registro A). O Coolify emite o
  certificado Let's Encrypt automaticamente.
- Contas já em uso pelo projeto: Neon, Cloudflare R2, Replicate, Resend, Paddle.

## 1. Criar a aplicação no Coolify

1. **+ New → Application → Public/Private Repository**, aponte para este repo,
   branch `main`.
2. Build pack: **Nixpacks** (detecta Next.js sozinho pelos scripts
   `build`/`start` do `package.json`). Porta: **3000**.
3. Em **Domains**, configure `https://SEU-DOMINIO`.
4. Em **Pre-deployment command**, configure:

   ```sh
   npx prisma migrate deploy
   ```

   Isso aplica as migrations do diretório `prisma/migrations/` a cada deploy.
   Sem isso, um banco novo fica vazio e o app quebra no primeiro acesso.

O `postinstall: prisma generate` do `package.json` já gera o client Prisma
durante o build — não precisa de passo extra.

## 2. Variáveis de ambiente

Cole no painel **Environment Variables** do Coolify. A referência completa com
comentários está em `.env.example`; abaixo, o que muda de dev → prod.

### Novas / específicas de produção

| Variável | Valor |
|---|---|
| `AUTH_TRUST_HOST` | `true` — **obrigatória**: o app roda atrás do proxy (Traefik) do Coolify; sem ela o Auth.js rejeita tudo com `UntrustedHost` |
| `AUTH_SECRET` | gerar um NOVO para prod (`npx auth secret`); não reusar o de dev |
| `APP_BASE_URL` | `https://SEU-DOMINIO` (links dos emails de verificação/reset) |
| `CRON_SECRET` | **obrigatória** — token do sweep de pedidos (`openssl rand -base64 32`). Ver [seção 3](#3-cron-de-avanço-de-pedidos) |
| `WEBHOOK_BASE_URL` | ver [modo webhook](#4-modo-webhook-do-replicate) abaixo — deixar **vazia** no primeiro deploy |

### Iguais a dev (copiar de `.env.local`)

- `REPLICATE_API_TOKEN`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `DATABASE_URL`, `DIRECT_URL` (Neon — mesmo projeto ou um projeto/branch de prod separado, sua escolha)
- `RESEND_API_KEY`, `AUTH_EMAIL_FROM`

### Paddle — trocar de sandbox para live

Hoje o app roda no **sandbox**. Para cobrar de verdade:

1. Ter a conta live do Paddle aprovada.
2. Recriar os 3 produtos/preços one-time no ambiente **live** e copiar os novos
   `pri_…`.
3. No painel live, criar uma Notification (webhook) para
   `https://SEU-DOMINIO/api/webhooks/paddle` e copiar o webhook secret. Assinar
   **três** eventos:

   | Evento | Para quê |
   |---|---|
   | `transaction.completed` | libera o pack pago (`pending` → `completed`) |
   | `adjustment.created` | reembolso/chargeback revoga o pack (`completed` → `refunded`) |
   | `adjustment.updated` | reembolso rejeitado → devolve o pack ao cliente |

   Sem os dois eventos de `adjustment`, quem pedir reembolso continua com o
   direito de gerar um batch — e o Replicate é cobrado de você.
4. Setar:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_PADDLE_ENV` | `production` |
   | `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | client token live |
   | `PADDLE_API_KEY` | API key live |
   | `PADDLE_WEBHOOK_SECRET` | secret da notification criada acima |
   | `PADDLE_PRICE_STARTER` / `_PRO` / `_PREMIUM` | price ids live |

   As variáveis `NEXT_PUBLIC_*` entram no bundle **no build** — mudá-las exige
   um redeploy, não basta reiniciar o container.

## 3. Cron de avanço de pedidos

**Obrigatório.** O pipeline só anda quando alguém chama `advanceOrder`. Sem um
gatilho de servidor, os únicos são o polling da página do pedido e (se ativado) o
webhook do Replicate — ou seja, o cliente que fecha a aba durante os ~25min de
treino deixa o batch pago congelado e **não recebe nem o email de "fotos
prontas"**, que também sai de dentro do `advanceOrder`.

`POST /api/cron/advance` varre os pedidos em andamento e empurra cada um. É
seguro rodar junto com o polling e o webhook: os ticks são serializados por
pedido e cada passo é idempotente.

No Coolify, na aplicação → **Scheduled Tasks** → novo task:

- **Frequency**: `* * * * *` (a cada minuto; a cada 2 também serve)
- **Command**:

  ```sh
  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
    http://localhost:3000/api/cron/advance
  ```

Usar `localhost:3000` (dentro do container) evita passar pelo Traefik. Se
preferir um cron externo, aponte para `https://SEU-DOMINIO/api/cron/advance` com
o mesmo header.

Com `CRON_SECRET` vazia o endpoint responde 401 a tudo — é proposital, um
gatilho aberto deixaria qualquer um disparar chamadas ao Replicate na sua conta.
Confira depois do primeiro deploy:

```sh
curl -X POST -H "Authorization: Bearer SEU_SECRET" https://SEU-DOMINIO/api/cron/advance
# → {"active":0,"advanced":0,"stale":0,"finished":[]}
```

Um pedido parado há mais de 24h é pulado e logado como `stuck` (não é marcado
como falho automaticamente — isso custaria o pack do cliente). Se aparecer no
log, é sinal de ir olhar.

## 4. Modo webhook do Replicate

Com `WEBHOOK_BASE_URL` **vazia**, os pedidos avançam pelo cron acima mais o
polling do cliente — caminho verificado de ponta a ponta, funciona sem ajuste.

Setar `WEBHOOK_BASE_URL=https://SEU-DOMINIO` ativa o modo webhook (Replicate faz
POST em `/api/webhooks/replicate/<orderId>`), que **nunca foi testado**. Ele
deixa a entrega mais rápida (reage no instante em que cada predição termina, em
vez de esperar o próximo minuto), mas o cron já garante a entrega sozinho.
Recomendação: primeiro deploy sem a variável; depois de validar o fluxo em
produção, setar e testar um pedido completo antes de considerar ativado.

## 5. Limite de upload no proxy

O app rejeita uploads acima de 15MB por foto e 200MB por request
(`lib/recipe.ts`), mas o corpo já chegou no container quando isso acontece.
Configurar o limite também no Traefik corta antes:

Coolify → aplicação → **Advanced / Labels**, adicione:

```
traefik.http.middlewares.body-limit.buffering.maxRequestBodyBytes=210000000
traefik.http.routers.<router>.middlewares=body-limit
```

(210MB dá folga sobre os 200MB do app para o overhead do multipart.)

## 6. Checklist pós-deploy

Na ordem — cada item valida uma integração diferente:

1. `https://SEU-DOMINIO` abre com cadeado (Let's Encrypt OK; o header HSTS do
   `next.config.ts` pressupõe HTTPS permanente).
2. Criar conta nova → email de verificação chega (Resend + `APP_BASE_URL`
   corretos) → link verifica.
3. Login/logout funcionam (se der `UntrustedHost` no log, faltou
   `AUTH_TRUST_HOST=true`).
4. Cron respondendo: o `curl` da [seção 3](#3-cron-de-avanço-de-pedidos) devolve
   JSON (não 401).
5. Fluxo de compra com um pack barato: checkout Paddle live abre, pagamento
   registra o Purchase (webhook do Paddle chegando no domínio certo).
6. Pedido completo: upload → treino → geração → fotos prontas no dashboard
   (Replicate + R2 OK). **Fechar a aba durante o treino** — o cron tem que
   terminar o pedido e o email de "prontas" tem que chegar. Custo ≈ US$1,1 de
   Replicate por rodada — rodar uma vez só, com o fluxo inteiro pronto.
7. Reembolsar essa transação no painel do Paddle → o Purchase vira `refunded`
   (ou ganha `refundedAt`, se já tinha sido gasto) e o cliente perde o direito
   de gerar.
8. Reset de senha de ponta a ponta.

## Limitações conhecidas (OK para 1 instância)

- **Rate limiting é em memória** (`lib/ratelimit.ts`): funciona com um único
  container; reinício zera os contadores e réplicas não compartilham estado.
  Só vira problema se escalar horizontalmente (aí: Redis).
- **Uma instância só**: o cron e o polling avançam pedidos dentro do próprio
  processo, e o lock por pedido (`lib/pipeline.ts`) é em memória — com réplicas,
  dois processos podem tickar o mesmo pedido ao mesmo tempo. Não escalar sem
  revisar isso.
- Um reembolso de um pack **já gasto** não é revertido automaticamente (as fotos
  já foram entregues): o Purchase é marcado com `refundedAt` e o caso vai para o
  log com `needs manual review`.
- Itens ainda não testados além do modo webhook: lifecycle rules do R2.

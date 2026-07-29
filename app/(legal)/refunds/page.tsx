import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, ENTITY, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Refund Policy — ${BRAND}`,
  description: `When ${BRAND} refunds a pack, and how to ask for one.`,
};

export default function RefundsPage() {
  return (
    <>
      <p className="kicker text-muted">Legal</p>
      <h1 className="display mt-4 text-[clamp(2.25rem,5vw,3.5rem)] text-ink">
        Refund Policy
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        A pack you have not used is fully refundable. Once a batch starts, real compute is
        spent on your behalf — so from that point the answer depends on whether we delivered
        what we promised.
      </p>
      <p className="mt-2 text-sm">Last updated {LAST_UPDATED}.</p>

      <div className="callout">
        <p>
          <strong>If something went wrong with your batch, email us before anything else:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>, with your order id. A
          failed or short batch is fixed with a free re-run or a refund — you do not need to
          argue for it.
        </p>
      </div>

      <h2 id="what">1. What you are buying</h2>
      <p>
        A pack is a one-time purchase that entitles you to start <strong>one</strong> batch
        and receive the number of finished headshots listed for that pack. It is not a
        subscription and it does not expire. Buying a pack and starting a batch are two
        separate steps: a pack sits unused in your account until you upload photos and begin.
      </p>
      <p>
        Payments are taken by Paddle, our merchant of record, so refunds are issued by Paddle
        back to your original payment method on our instruction.
      </p>

      <h2 id="unused">2. Unused packs — full refund</h2>
      <p>
        If you have bought a pack and <strong>not yet started a batch with it</strong>, you
        can have it refunded in full, for any reason or none, within{" "}
        <strong>14 days</strong> of purchase. Email us and we will process it. Nothing has
        been generated and nothing has been spent.
      </p>

      <h2 id="started">3. After a batch has started</h2>
      <p>
        Starting a batch immediately trains a model on your photos and generates a large pool
        of images. That compute is paid for the moment it runs and cannot be recovered, so a
        completed batch is <strong>not automatically refundable</strong> — in particular, we
        do not refund because you prefer how you look in different photos, or changed your
        mind about the styles you picked.
      </p>
      <p>That said, we refund or re-run in each of these cases:</p>
      <ul>
        <li>
          <strong>The batch failed.</strong> Training or generation errored out and you
          received nothing.
        </li>
        <li>
          <strong>We under-delivered.</strong> You received fewer finished headshots than
          your pack promised.
        </li>
        <li>
          <strong>The results are unusable.</strong> The delivered images do not credibly
          look like you, or are corrupted or defective.
        </li>
        <li>
          <strong>You were charged incorrectly</strong> — twice for one pack, at the wrong
          price, or without authorisation.
        </li>
      </ul>
      <p>
        In the first three cases you can choose a <strong>free re-run</strong> with a new set
        of photos, or a <strong>full refund</strong>. Tell us which you would prefer. Ask
        within 14 days of the batch finishing.
      </p>

      <h2 id="how">4. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address on
        your account, with:
      </p>
      <ul>
        <li>your order id (shown on the order page), or the date of purchase; and</li>
        <li>a sentence on what went wrong, if anything did.</li>
      </ul>
      <p>
        We reply within 2 business days. Approved refunds are submitted to Paddle
        immediately; the money typically reaches your account within 5–10 business days,
        depending on your bank or card issuer. You can also contact Paddle directly about a
        payment.
      </p>
      <p>
        When a refund is issued, the pack it paid for stops being usable. If the batch had
        already been generated, the headshots already delivered to you remain yours.
      </p>

      <h2 id="statutory">5. Your statutory rights</h2>
      <p>
        Nothing here reduces rights you have under consumer law, and those rights always take
        precedence over this policy.
      </p>
      <p>
        If you are a consumer in the EU or the UK, you normally have 14 days to withdraw from
        a purchase of digital content. That right is lost once delivery begins with your
        express consent and your acknowledgement that you are giving up the right — which is
        exactly what starting a batch does. Until you start a batch, your withdrawal right is
        untouched, and section 2 mirrors it.
      </p>

      <h2 id="chargebacks">6. Chargebacks</h2>
      <p>
        Please contact us before disputing a charge with your bank. We would rather refund
        you directly — it is faster for you, and a chargeback locks the funds for weeks while
        it is investigated.
      </p>
      <p>
        A refund or chargeback withdraws the entitlement it paid for. If the pack had already
        been spent on a delivered batch, we may suspend the account under our{" "}
        <Link href="/terms#termination">Terms of Service</Link>.
      </p>

      <h2 id="contact">7. Contact</h2>
      <p>
        {ENTITY} — <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </>
  );
}

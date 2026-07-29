import type { Metadata } from "next";
import Link from "next/link";
import { ADDRESS, BRAND, ENTITY, JURISDICTION, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND}`,
  description: `The agreement between you and ${BRAND} for AI-generated headshots.`,
};

export default function TermsPage() {
  return (
    <>
      <p className="kicker text-muted">Legal</p>
      <h1 className="display mt-4 text-[clamp(2.25rem,5vw,3.5rem)] text-ink">
        Terms of Service
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        These terms are the agreement between you and {ENTITY} ({BRAND}) for use of the{" "}
        {BRAND} website and headshot service. Please read them — they cover what you may
        upload, what you own, and the limits of what we promise.
      </p>
      <p className="mt-2 text-sm">Last updated {LAST_UPDATED}.</p>

      <h2 id="agreement">1. The agreement</h2>
      <p>
        {BRAND} is operated by {ENTITY}, {ADDRESS} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
        By creating an account, buying a pack, or using the service, you accept these terms.
        If you do not accept them, do not use the service.
      </p>
      <p>
        If you are entering into these terms on behalf of a company, you confirm you have
        authority to bind that company, and &ldquo;you&rdquo; means that company.
      </p>

      <h2 id="eligibility">2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use {BRAND}. The service generates realistic
        images of a person&rsquo;s face, and we do not knowingly train models on, or generate
        images of, minors. See also section 5.
      </p>

      <h2 id="account">3. Your account</h2>
      <ul>
        <li>
          You need a verified email address to generate headshots. We send a confirmation
          link at sign-up; the paid action stays locked until you use it.
        </li>
        <li>
          You are responsible for keeping your password confidential and for everything done
          through your account. Tell us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you suspect
          unauthorised access.
        </li>
        <li>
          One account per person. Do not share your account, and do not create accounts
          through automated means.
        </li>
        <li>
          You may delete your account at any time from your profile page. Deletion is
          permanent — see the{" "}
          <Link href="/privacy#retention">Privacy Policy</Link> for exactly what is removed.
        </li>
      </ul>

      <h2 id="service">4. What the service does</h2>
      <p>
        You upload a set of selfies. We use them to train a likeness model that is specific
        to your order, generate a larger pool of portraits from that model, automatically
        score them for identity match, quality and safety, and deliver the best ones up to
        the number your pack promises. A batch normally completes in about 30 minutes but we
        do not guarantee a delivery time.
      </p>

      <h2 id="your-photos">5. Your photos, and the rights you give us</h2>

      <h3>5.1 What you promise about your uploads</h3>
      <p>By uploading photos you confirm that:</p>
      <ul>
        <li>
          the photos are of <strong>you</strong>, or of an adult who has given you explicit,
          documented permission to use their likeness this way;
        </li>
        <li>no photo depicts a person under 18;</li>
        <li>
          you hold the necessary rights in the photos themselves — including from the
          photographer, if the shot was taken professionally;
        </li>
        <li>
          your upload and its intended use do not break any law or infringe anyone&rsquo;s
          rights.
        </li>
      </ul>
      <p>
        You are responsible for these confirmations. We do not verify identity or consent,
        and we may suspend an account and delete content if we have reason to believe they
        are untrue.
      </p>

      <h3>5.2 The licence you give us</h3>
      <p>
        You keep all rights in your photos. You grant us a limited, non-exclusive,
        revocable licence to store and process them, and to pass them to the infrastructure
        providers listed in our <Link href="/privacy#processors">Privacy Policy</Link>, for
        one purpose only: producing and delivering the headshots you ordered, and providing
        support for that order. This licence ends when the content is deleted.
      </p>

      <h3>5.3 What we will not do with them</h3>
      <div className="callout">
        <p>
          <strong>
            We do not use your photos or your likeness model to train general-purpose or
            shared AI models, and we do not sell, license or publish them.
          </strong>{" "}
          The likeness model built from your uploads is used for your order and nothing else.
          We do not use your photos or generated headshots in marketing without asking you
          first, in writing, for that specific use.
        </p>
      </div>

      <h2 id="acceptable-use">6. Acceptable use</h2>
      <p>You may not use {BRAND} to:</p>
      <ul>
        <li>
          create images of any person without their consent, including public figures — the
          service is for portraits of yourself;
        </li>
        <li>
          impersonate anyone, or produce images for identity documents, verification
          checks, KYC processes, or anything else where a synthetic photo would be passed
          off as a real one;
        </li>
        <li>
          create sexual, defamatory, harassing, hateful or misleading content, or content
          depicting anyone in a false and damaging context;
        </li>
        <li>
          resell, sublicense or provide the service to third parties, or use it to build a
          competing product;
        </li>
        <li>
          scrape the service, bypass rate limits or entitlement checks, probe or attack our
          infrastructure, or access another user&rsquo;s orders or images.
        </li>
      </ul>
      <p>
        We run automated safety checks on generated images and exclude flagged results from
        delivery, but these checks are imperfect and are not a substitute for the rules
        above.
      </p>

      <h2 id="license">7. Your headshots — ownership and licensing</h2>
      <p>
        <strong>The headshots we deliver to you are yours.</strong> To the extent we hold any
        rights in them, we assign those rights to you on delivery, and you may use the images
        for any lawful purpose — including commercially, on professional profiles, in
        advertising, and in print — without paying us anything further, without attribution,
        and without a time or territory limit.
      </p>
      <p>Two limits on that:</p>
      <ul>
        <li>
          The rights you receive are the rights we can give. They do not override the
          obligations you took on in sections 5 and 6, or anyone else&rsquo;s rights in the
          underlying photos.
        </li>
        <li>
          Copyright in AI-generated images is unsettled in many countries, and in some of
          them purely machine-generated output may not be protected by copyright at all. We
          make no promise that you can stop others from using an identical or similar image.
        </li>
      </ul>
      <p>
        You do not receive rights in the {BRAND} software, models, prompts, style catalogue,
        branding, or in the trained likeness model itself.
      </p>

      <h2 id="ai-limits">8. What AI generation can and cannot do</h2>
      <p>
        Output is synthetic and probabilistic. Even with a good upload set, generated
        portraits can differ from your real appearance in skin texture, hair, teeth,
        glasses, jewellery, clothing detail and background, and can contain artefacts. We
        filter results for identity match and quality before delivering them, but{" "}
        <strong>
          we cannot guarantee that any particular photo will please you, or that a batch will
          be usable for a specific purpose.
        </strong>
      </p>
      <p>
        Results depend heavily on the photos you supply. If a batch under-delivers or fails,
        the <Link href="/refunds">Refund Policy</Link> sets out what we do about it.
      </p>

      <h2 id="payment">9. Purchases and payment</h2>
      <ul>
        <li>
          We sell one-time packs. One pack entitles you to start <strong>one</strong> batch
          and receive the number of finished headshots listed for that pack. Packs are not
          subscriptions, and they do not expire.
        </li>
        <li>
          <strong>Paddle is our merchant of record.</strong> Payments are processed by
          Paddle.com Market Ltd, which is the seller for that transaction, handles billing
          and tax, and whose{" "}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" rel="noreferrer">
            buyer terms
          </a>{" "}
          also apply to the purchase. We never receive or store your card details.
        </li>
        <li>
          Prices are shown before checkout. Paddle applies VAT, sales tax or equivalent based
          on your location, and displays it at checkout.
        </li>
        <li>
          A pack must be paid for before a batch can start. Payment is confirmed by Paddle,
          not by us — if a payment is later reversed, refunded or charged back, the
          entitlement it paid for is withdrawn.
        </li>
      </ul>

      <h2 id="refunds">10. Refunds</h2>
      <p>
        Refunds are governed by our <Link href="/refunds">Refund Policy</Link>, which forms
        part of these terms. In short: an unused pack is fully refundable, and if we fail to
        deliver we make it right. Statutory consumer rights are unaffected.
      </p>

      <h2 id="availability">11. Availability and changes</h2>
      <p>
        We aim to keep the service running but do not promise uninterrupted availability. We
        may change, suspend or discontinue features, and we depend on third-party providers
        (compute, storage, email, payments) whose outages can affect us. If we discontinue
        the service entirely, we will give reasonable notice so you can download your images,
        and refund packs you have paid for but not used.
      </p>

      <h2 id="termination">12. Suspension and termination</h2>
      <p>
        You may stop using {BRAND} and delete your account at any time. We may suspend or
        terminate an account that breaches these terms, that we reasonably believe is being
        used unlawfully, or that is the subject of a chargeback. Where the breach is
        minor and fixable, we will normally warn you first.
      </p>
      <p>
        On termination, your right to use the service ends. Images already delivered remain
        yours, but we are not obliged to keep hosting them — download anything you want to
        keep.
      </p>

      <h2 id="disclaimer">13. Disclaimers</h2>
      <p>
        Except as expressly stated in these terms and except for rights you have as a
        consumer that cannot be excluded, the service is provided &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo;, without warranties of any kind, whether express or
        implied, including implied warranties of merchantability, fitness for a particular
        purpose, and non-infringement.
      </p>

      <h2 id="liability">14. Limitation of liability</h2>
      <p>
        Nothing in these terms limits liability for death or personal injury caused by
        negligence, for fraud, or for anything else that cannot lawfully be limited —
        including consumer rights in your country.
      </p>
      <p>Subject to that:</p>
      <ul>
        <li>
          we are not liable for indirect, incidental, special or consequential loss, or for
          lost profits, revenue, data, goodwill or business opportunity; and
        </li>
        <li>
          our total liability arising out of or relating to the service is limited to the
          greater of the amount you paid us in the twelve months before the claim, or
          USD 100.
        </li>
      </ul>

      <h2 id="indemnity">15. Indemnity</h2>
      <p>
        You will indemnify us against claims, losses and reasonable legal costs arising from
        your breach of sections 5 or 6 — in particular a claim by someone whose likeness or
        photograph you uploaded without the rights to do so.
      </p>

      <h2 id="law">16. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of {JURISDICTION}, and the courts of{" "}
        {JURISDICTION} have jurisdiction. If you are a consumer, this does not deprive you of
        the protection of the mandatory laws of the country where you live, or of your right
        to bring proceedings there.
      </p>
      <p>
        Please contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> before
        starting formal proceedings — most disputes are quicker to resolve directly.
      </p>

      <h2 id="changes">17. Changes to these terms</h2>
      <p>
        We may update these terms. If a change materially affects your rights, we will email
        registered users and update the date at the top before it takes effect. Continuing to
        use the service after that means you accept the new terms; if you do not, stop using
        the service and contact us about refunding any unused pack.
      </p>

      <h2 id="contact">18. Contact</h2>
      <p>
        {ENTITY}
        <br />
        {ADDRESS}
        <br />
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ADDRESS, BRAND, ENTITY, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND}`,
  description: `How ${BRAND} collects, uses, shares and deletes your photos and personal data.`,
};

export default function PrivacyPage() {
  return (
    <>
      <p className="kicker text-muted">Legal</p>
      <h1 className="display mt-4 text-[clamp(2.25rem,5vw,3.5rem)] text-ink">
        Privacy Policy
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        {BRAND} works by training a model on photographs of your face. That is sensitive
        data, and this policy is specific about what we collect, who processes it, how long
        we keep it, and how you get it erased.
      </p>
      <p className="mt-2 text-sm">Last updated {LAST_UPDATED}.</p>

      <div className="callout">
        <p>
          <strong>The short version.</strong> We use your selfies to build a likeness model
          for your order and to generate your headshots — nothing else. We never use them to
          train general or shared AI models, and we never sell them. We run no advertising or
          analytics trackers. You can delete your account, and everything in it, from your
          profile page at any time.
        </p>
      </div>

      <h2 id="controller">1. Who is responsible</h2>
      <p>
        {ENTITY}, {ADDRESS}, is the controller of the personal data described here. For any
        privacy question or request, write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2 id="collect">2. What we collect</h2>

      <h3>Account data</h3>
      <p>
        Your name, email address, a one-way hash of your password (we never store the
        password itself), whether your email is verified, and the dates your account was
        created and your password last changed.
      </p>

      <h3>Photographs and facial data</h3>
      <p>
        The selfies you upload; a resized training copy of them; two of them kept as
        reference images for the identity check; and the headshots we generate and upscale
        for you. To decide which generated images actually look like you, we compute a facial
        similarity score between each generated image and your reference photos.
      </p>

      <h3>Order details</h3>
      <p>
        The pack you bought, the styles you picked, and the subject descriptor you provide
        when starting a batch — <strong>your gender, and optionally your ethnicity</strong>.
        The descriptor is written into the image prompt; without it the model invents
        demographic details and drifts away from your appearance. Ethnicity is always
        optional and &ldquo;Prefer not to say&rdquo; is a supported choice. We also store
        technical results per image (similarity and quality scores, timings, model
        identifiers).
      </p>

      <h3>Payment data</h3>
      <p>
        Handled by Paddle, our merchant of record. <strong>We never see or store your card
        details.</strong> We keep only a record of which pack you bought, its price
        identifier, the Paddle transaction id, and whether the purchase is unused, spent or
        refunded.
      </p>

      <h3>Technical data</h3>
      <p>
        Your IP address is used transiently, in server memory, to rate-limit sign-in,
        sign-up and password-reset attempts; it is not written to our database. Our servers
        and providers keep operational logs containing IP addresses and request metadata for
        security and debugging.
      </p>

      <h2 id="sensitive">3. Facial images and ethnicity: special category data</h2>
      <p>
        Because we run facial-similarity analysis to confirm a generated image is you, we
        treat your photographs as biometric data under Article 9 of the GDPR. Ethnicity, when
        you provide it, is also special category data.
      </p>
      <p>
        We process both on the basis of your <strong>explicit consent</strong>, which you give
        by uploading photos and starting a batch. You can withdraw consent at any time by
        deleting your account or emailing us — withdrawal does not affect processing already
        carried out, and a batch already generated cannot be un-generated.
      </p>

      <h2 id="use">4. How we use it</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Legal basis (GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Creating and securing your account; verifying your email</td>
            <td>Performance of a contract</td>
          </tr>
          <tr>
            <td>
              Training a likeness model on your photos, generating headshots, checking
              identity match, quality and safety, and delivering the results
            </td>
            <td>Explicit consent (Art. 9(2)(a)); performance of a contract</td>
          </tr>
          <tr>
            <td>Taking payment, granting entitlements, handling refunds</td>
            <td>Performance of a contract; legal obligation (tax records)</td>
          </tr>
          <tr>
            <td>Transactional email: verification, password reset, &ldquo;batch ready&rdquo;</td>
            <td>Performance of a contract</td>
          </tr>
          <tr>
            <td>Rate limiting, abuse and fraud prevention, debugging, security</td>
            <td>Legitimate interests (keeping the service safe and working)</td>
          </tr>
          <tr>
            <td>Responding to your support requests</td>
            <td>Performance of a contract; legitimate interests</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not use your data for advertising, profiling or automated decisions with legal
        effects, and we do not send marketing email unless you ask us to.
      </p>

      <h2 id="never">5. What we never do</h2>
      <ul>
        <li>
          <strong>We do not train general-purpose or shared models on your photos.</strong>{" "}
          The likeness model built from your uploads exists for your order alone.
        </li>
        <li>We do not sell, rent or trade your personal data.</li>
        <li>
          We do not publish your photos or headshots, or use them in marketing, without
          separately asking you first.
        </li>
        <li>We run no advertising networks, analytics trackers or third-party pixels.</li>
      </ul>

      <h2 id="processors">6. Who processes your data for us</h2>
      <p>
        We use a small set of infrastructure providers, each acting on our instructions under
        a data processing agreement. These providers are mainly in the United States and the
        European Union.
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>What it handles</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Replicate</td>
            <td>
              Model training and image generation. Receives your training photos, reference
              photos and generated images.
            </td>
          </tr>
          <tr>
            <td>Cloudflare (R2)</td>
            <td>
              Storage of uploads and generated images, in a private bucket that is not
              publicly readable.
            </td>
          </tr>
          <tr>
            <td>Neon</td>
            <td>The PostgreSQL database holding accounts, orders and purchase records.</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Sending transactional email. Receives your email address.</td>
          </tr>
          <tr>
            <td>Paddle</td>
            <td>
              Payments, tax and invoicing, as merchant of record and an independent
              controller for that purpose.
            </td>
          </tr>
          <tr>
            <td>Our hosting provider</td>
            <td>Running the application servers and operational logs.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We may also disclose data where legally required, or to establish or defend legal
        claims. If the business is ever sold or merged, personal data may transfer with it;
        we will tell you before that happens and this policy will continue to apply to data
        collected under it.
      </p>

      <h2 id="transfers">7. International transfers</h2>
      <p>
        Because those providers operate outside the European Economic Area and the UK, your
        data is transferred internationally. We rely on the European Commission&rsquo;s
        Standard Contractual Clauses, and the UK Addendum where relevant, together with the
        providers&rsquo; own certifications. Write to us for details of the safeguards for a
        particular transfer.
      </p>

      <h2 id="security">8. How we protect it</h2>
      <ul>
        <li>Passwords are stored only as salted bcrypt hashes.</li>
        <li>
          Images live in a private bucket with no public access. Every view or download uses
          a signed link that expires after an hour.
        </li>
        <li>
          Orders and images are scoped to the account that owns them, and every request
          re-checks ownership on the server.
        </li>
        <li>
          Traffic is encrypted with HTTPS and pinned there by HSTS. Sign-in, sign-up and
          password reset are rate-limited.
        </li>
        <li>
          Password reset links and email verification links are single-use, expiring, and
          stored only as hashes. Resetting your password invalidates existing sessions.
        </li>
      </ul>
      <p>
        No system is perfectly secure. If a breach affects your personal data and poses a
        risk to you, we will notify you and the relevant supervisory authority as required by
        law.
      </p>

      <h2 id="retention">9. How long we keep it, and how deletion works</h2>
      <p>
        We keep your account, photos and headshots for as long as your account exists, so
        that your gallery stays available to you. We do not delete finished batches on a
        timer.
      </p>
      <p>
        Deleting your account from your profile page permanently removes, in one operation:
      </p>
      <ul>
        <li>your account record, including the password hash;</li>
        <li>every order and its metadata, including scores and the subject descriptor;</li>
        <li>your purchase records;</li>
        <li>any outstanding email verification or password reset tokens;</li>
        <li>
          every image file from storage — uploaded selfies, training data, reference photos,
          generated and upscaled headshots; and
        </li>
        <li>
          <strong>the trained likeness models themselves</strong>, deleted at our compute
          provider along with the intermediate images held there.
        </li>
      </ul>
      <div className="callout">
        <p>
          <strong>That last point is the one to check when comparing services.</strong> A
          likeness model is a copy of your face in its own right, and deleting the photos
          while keeping the model would leave the sensitive part behind. Deletion at the
          compute provider is queued the moment you confirm and completes shortly after. If
          you would like written confirmation that it finished, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
      <p>
        We retain transaction records for as long as tax and accounting law requires
        (typically seven years). These contain the purchase and its amount, not your photos.
        Provider logs are retained on their own short cycles.
      </p>

      <h2 id="rights">10. Your rights</h2>
      <p>Depending on where you live, you have the right to:</p>
      <ul>
        <li>access the personal data we hold about you, and receive a copy;</li>
        <li>have inaccurate data corrected;</li>
        <li>have your data erased;</li>
        <li>restrict or object to certain processing;</li>
        <li>receive your data in a portable format;</li>
        <li>withdraw consent at any time, without affecting past processing; and</li>
        <li>complain to your local data protection authority.</li>
      </ul>
      <p>
        Exercise any of these by emailing{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your account address. We
        respond within 30 days. We will not charge you, or treat you differently, for making
        a request.
      </p>
      <p>
        If you are in California: we do not sell or share personal information as those terms
        are defined by the CCPA/CPRA, and we do not use it for cross-context behavioural
        advertising.
      </p>

      <h2 id="cookies">11. Cookies</h2>
      <p>
        We use strictly necessary cookies only. A session cookie keeps you signed in; without
        it the service cannot work. Paddle sets its own cookies inside its checkout when you
        buy a pack, governed by{" "}
        <a href="https://www.paddle.com/legal/privacy" rel="noreferrer">
          Paddle&rsquo;s privacy policy
        </a>
        . We set no advertising, analytics or tracking cookies, which is why you are not
        being asked to accept any.
      </p>

      <h2 id="children">12. Children</h2>
      <p>
        {BRAND} is for adults. We do not knowingly collect data from anyone under 18, and
        uploading photos of a minor is prohibited by our{" "}
        <Link href="/terms#your-photos">Terms of Service</Link>. If you believe a child has
        used the service, contact us and we will delete the account and its contents.
      </p>

      <h2 id="changes">13. Changes to this policy</h2>
      <p>
        If we change how we handle your data in a way that materially affects you, we will
        email registered users and update the date at the top before the change takes effect.
      </p>

      <h2 id="contact">14. Contact</h2>
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

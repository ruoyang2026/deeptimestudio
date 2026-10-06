import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "../components/SiteShell";
import { SHOP_URL } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Deep Time Studio",
  description:
    "Privacy Policy for Deep Time Studio: what data we collect, how Google AdSense and analytics use cookies, and your choices.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "October 7, 2026";

export default function PrivacyPage() {
  return (
    <SiteShell>
      <div className="updates-page">
        <header className="updates-page__head">
          <h1 className="updates-page__title">Privacy Policy</h1>
          <p className="updates-page__sub">Last updated: {UPDATED}</p>
        </header>

        <div className="upd-entry">
          <div className="upd-entry__body">
            <p className="upd-entry__detail">
              Deep Time Studio (&quot;we&quot;, &quot;our&quot;) operates{" "}
              <Link href="/">deep-time-studio.com</Link>, a visual archive of fossil species and
              interactive prehistoric reconstructions. This policy explains what information is
              collected when you visit, and the choices you have.
            </p>

            <h2>1. Information we collect</h2>
            <p className="upd-entry__detail">
              We do not require you to create an account, and we do not ask for your name, address,
              or payment details on this site. The limited information processed when you visit
              includes:
            </p>
            <ul className="upd-entry__list">
              <li>
                Aggregated, anonymized usage statistics collected with a privacy-friendly analytics
                tool (Umami), such as pages viewed and referrers. No advertising cookies are set by
                this tool.
              </li>
              <li>
                If you voluntarily submit your email address (for example to receive a free sample),
                it is sent to our form backend and used only for the purpose you requested. We never
                sell email addresses.
              </li>
              <li>
                Technical data processed automatically by our hosting provider (such as IP address
                and user agent in server logs) for security and reliability.
              </li>
            </ul>

            <h2>2. Advertising and cookies</h2>
            <p className="upd-entry__detail">
              We use Google AdSense to show ads. Google and its partners use cookies and similar
              technologies to serve ads based on your prior visits to this and other sites
              (including the Google DoubleClick cookie for interest-based advertising).
            </p>
            <ul className="upd-entry__list">
              <li>
                You can opt out of personalized advertising at{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Ads Settings
                </a>
                , or opt out of third-party vendors&apos; cookies at{" "}
                <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
                  optout.aboutads.info
                </a>
                .
              </li>
              <li>
                You can also block or delete cookies in your browser settings; the site remains
                readable, though some interactive features may behave differently.
              </li>
            </ul>

            <h2>3. Third-party links</h2>
            <p className="upd-entry__detail">
              This site links to external services, including our store on Gumroad. Their own
              privacy policies apply once you leave this site; we encourage you to review them.
            </p>

            <h2>4. Children&apos;s privacy</h2>
            <p className="upd-entry__detail">
              This site is a general-audience educational archive and is not directed at children
              under 13. We do not knowingly collect personal information from children.
            </p>

            <h2>5. Changes to this policy</h2>
            <p className="upd-entry__detail">
              We may update this policy as the site evolves. The &quot;Last updated&quot; date
              above reflects the most recent revision.
            </p>

            <h2>6. Contact</h2>
            <p className="upd-entry__detail">
              Questions about this policy can be sent via our store page at{" "}
              <a href={SHOP_URL} target="_blank" rel="noopener noreferrer">
                Gumroad
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

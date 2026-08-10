"use client";

import { useEffect, useState } from "react";
import { SHOP_URL, FREE_SAMPLE_URL, BASIN_ENDPOINT } from "../../lib/site";

export default function CommercialEntry() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const body = new URLSearchParams();
      body.set("email", email.trim());
      body.set("redirect", "false");
      const res = await fetch(BASIN_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
      });
      if (!res.ok) throw new Error("bad response");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <div className="commercial-entry">
        <button type="button" className="commercial-entry__trigger" onClick={() => setOpen(true)}>
          <img src="/trilobite-shop-cover.webp" alt="Trilobite fossil art for designers" loading="lazy" />
          <span className="commercial-entry__link">Explore high-resolution fossil images for art and design</span>
        </button>
      </div>

      {open ? (
        <div className="commercial-modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="commercial-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Deep Time Studio collections"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="commercial-modal__close" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>

            <h3 className="commercial-modal__title">Deep Time Studio Collections</h3>

            <p className="commercial-modal__shop">
              Want to use this trilobite visual archive in your project?{" "}
              <a href={SHOP_URL} target="_blank" rel="noopener noreferrer">
                Browse Deep Time Studio collections
              </a>
              .
            </p>

            <div className="commercial-modal__divider" />

            <p className="commercial-modal__lead">
              Free Paleo Art Sample — a 26-page PDF preview of the full archive. Enter your email to get the download.
            </p>

            {status === "done" ? (
              <div className="commercial-modal__done">
                <p>Thanks! Your free sample is ready to download.</p>
                <a className="commercial-modal__btn" href={FREE_SAMPLE_URL} download>
                  Download Free Sample
                </a>
              </div>
            ) : (
              <form className="commercial-modal__form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                />
                <button type="submit" className="commercial-modal__btn" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Get the Free Sample"}
                </button>
              </form>
            )}

            {status === "error" ? (
              <p className="commercial-modal__error">Something went wrong. Please try again.</p>
            ) : null}

            <p className="commercial-modal__note">We only use your email to send paleo art samples. Unsubscribe anytime.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

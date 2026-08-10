"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CommercialEntry from "./CommercialEntry";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDiscovery = pathname === "/";
  const isFashion = pathname.startsWith("/fossil-fashion-design-inspiration");

  return (
    <div className="page-container">
      <aside className="sidebar-left">
        <div className="sidebar-left__top">
          <nav className="menu-nav" aria-label="Site navigation">
            <Link href="/" className={`menu-item${isDiscovery ? " is-active" : ""}`}>
              Discovery
            </Link>
            <Link
              href="/fossil-fashion-design-inspiration"
              className={`menu-item${isFashion ? " is-active" : ""}`}
            >
              Fashion
            </Link>
          </nav>
          <button type="button" className="red-btn">
            Search
          </button>
        </div>
        <div className="sidebar-bottom">
          <CommercialEntry />
          <div className="site-desc">
            <p className="site-desc__badge">Deep Time Studio · Paleo Visual Archive</p>
            <h2 className="site-desc__title">Trilobites of the World</h2>
            <p className="site-desc__sub">
              Explore 500+ extinct species through rare fossil photography, geological ages,
              and scientific classification — from Cambrian research to paleo art and fashion
              design inspiration.
            </p>
          </div>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

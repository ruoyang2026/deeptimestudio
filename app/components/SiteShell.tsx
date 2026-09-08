"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommercialEntry from "./CommercialEntry";
import { getLatestUpdates, type UpdateEntry } from "../../lib/updates";

const KIND_LABEL: Record<UpdateEntry["kind"], string> = {
  species_added: "New species",
  images_added: "New photos",
  fashion_added: "New fashion",
  amphibians_added: "New amphibians",
};

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCambrian = pathname === "/";
  const isArchive = pathname.startsWith("/archive") || pathname.startsWith("/species");
  const isTrilobites = pathname.startsWith("/archive/trilobites") || pathname.startsWith("/species");
  const isAmphibians = pathname.startsWith("/archive/amphibians") || pathname.startsWith("/amphibians");
  const isFashion = pathname.startsWith("/fossil-fashion-design-inspiration");
  const isUpdates = pathname === "/updates";
  const [archiveOpen, setArchiveOpen] = useState(false);
  const latest = getLatestUpdates(3);

  // 进入 archive 相关页面时自动展开子菜单
  useEffect(() => {
    if (isArchive) setArchiveOpen(true);
  }, [isArchive]);

  return (
    <div className="page-container">
      <aside className="sidebar-left">
        <div className="sidebar-left__top">
          <nav className="menu-nav" aria-label="Site navigation">
            <Link href="/" className={`menu-item${isCambrian ? " is-active" : ""}`}>
              Discovery
            </Link>
            <div className="menu-group">
              <Link
                href="/archive/trilobites"
                className={`menu-item menu-item--parent${isArchive ? " is-active" : ""}`}
                onClick={() => setArchiveOpen((v) => !v)}
              >
                <span>Archive</span>
                <span className={`menu-caret${archiveOpen ? " is-open" : ""}`}>▾</span>
              </Link>
              {archiveOpen ? (
                <div className="menu-sub">
                  <Link
                    href="/archive/trilobites"
                    className={`menu-item menu-item--sub${isTrilobites ? " is-active" : ""}`}
                  >
                    1. Trilobite
                  </Link>
                  <Link
                    href="/archive/amphibians"
                    className={`menu-item menu-item--sub${isAmphibians ? " is-active" : ""}`}
                  >
                    2. Amphibians
                  </Link>
                </div>
              ) : null}
            </div>
            <Link
              href="/fossil-fashion-design-inspiration"
              className={`menu-item${isFashion ? " is-active" : ""}`}
            >
              Fashion
            </Link>
            <Link href="/updates" className={`menu-item${isUpdates ? " is-active" : ""}`}>
              What&apos;s New
            </Link>
          </nav>
          <button type="button" className="red-btn">
            Search
          </button>
        </div>
        <div className="sidebar-bottom">
          <CommercialEntry />
          <div className="latest-mod">
            <h3 className="latest-mod__title">
              <Link href="/updates">Latest additions</Link>
            </h3>
            {latest.length === 0 ? (
              <p className="latest-mod__empty">No updates yet.</p>
            ) : (
              <ul className="latest-mod__list">
                {latest.map((entry) => (
                  <li key={entry.id}>
                    <span className="latest-mod__date">{entry.date}</span>
                    <span className={`upd-badge upd-badge--${entry.kind}`}>
                      {KIND_LABEL[entry.kind]}
                    </span>
                    <span className="latest-mod__count">+{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

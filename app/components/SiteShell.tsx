"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import CommercialEntry from "./CommercialEntry";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCambrian = pathname === "/";
  const isArchive = pathname.startsWith("/archive") || pathname.startsWith("/species");
  const isTrilobites = pathname.startsWith("/archive/trilobites") || pathname.startsWith("/species");
  const isAmphibians = pathname.startsWith("/archive/amphibians") || pathname.startsWith("/amphibians");
  const isFashion = pathname.startsWith("/fossil-fashion-design-inspiration");
  const isUpdates = pathname === "/updates";
  const [archiveOpen, setArchiveOpen] = useState(false);

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

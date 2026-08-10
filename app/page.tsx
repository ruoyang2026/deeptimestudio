import Link from "next/link";
import TrilobiteGrid, { type CardData } from "./components/TrilobiteGrid";
import {
  getOrders,
  getAges,
  periodsForAge,
  searchTrilobites,
  isDrillable,
  getCover,
  speciesImageAlt,
  imgSrc,
} from "../lib/trilobites";

type PageProps = {
  searchParams?: {
    q?: string;
    order?: string;
    age?: string;
  };
};

export const metadata = {
  title: "Trilobites of the World | 500+ Fossil Species Database & Paleo Visual Archive",
  description:
    "Explore 500+ trilobite species from the Cambrian to Permian periods. High-resolution fossil photographs, classification, and geological data for research, paleo art, and design inspiration.",
};

const GEOLOGIC_PERIODS = [
  "Ediacaran",
  "Cambrian",
  "Ordovician",
  "Silurian",
  "Devonian",
  "Carboniferous",
  "Permian",
  "Triassic",
  "Jurassic",
  "Cretaceous",
  "Paleogene",
  "Neogene",
  "Quaternary",
];

function displayAge(age: string): string {
  if (!age) return "";
  const parens = age.match(/\(([^)]+)\)/g);
  if (parens && parens.length) {
    return parens.map((p) => p.slice(1, -1)).join(" to ");
  }
  for (const period of GEOLOGIC_PERIODS) {
    if (age.includes(period)) return period;
  }
  return age;
}

const TOP_ORDERS = 7;

function chipHref(params: { q?: string; order?: string; age?: string }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.order) sp.set("order", params.order);
  if (params.age) sp.set("age", params.age);
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export default function HomePage({ searchParams }: PageProps) {
  const q = searchParams?.q || "";
  const order = searchParams?.order || "";
  const age = searchParams?.age || "";
  const orders = getOrders();
  const ages = getAges();
  const all = searchTrilobites(q);
  const byOrder = order ? all.filter((t) => t.order === order) : all;
  const filtered = age ? byOrder.filter((t) => periodsForAge(t.age).includes(age)) : byOrder;
  const sorted = [...filtered].sort(
    (a, b) => Number(isDrillable(b.slug)) - Number(isDrillable(a.slug))
  );
  const cards: CardData[] = sorted.map((t) => {
    const cover = getCover(t);
    return {
      id: t.id,
      slug: t.slug,
      order: t.order,
      scientificName: t.scientific_name,
      age: displayAge(t.age),
      distribution: t.distribution,
      cover: cover ? imgSrc(cover) : "",
      alt: speciesImageAlt(t.scientific_name, t.age, t.distribution),
      drillable: isDrillable(t.slug),
    };
  });

  return (
    <div className="page-container">
      <aside className="sidebar-left">
        <div className="sidebar-left__top">
          <nav className="menu-nav" aria-label="Site navigation">
            <Link href="/" className="menu-item is-active">
              Discovery
            </Link>
          </nav>
          <button type="button" className="red-btn">
            Search
          </button>
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
      </aside>

      <main className="main-content">
        <form method="get" action="/" className="search-bar">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by species, genus, age, region..."
            className="search-bar__input"
            aria-label="Search trilobites"
          />
          {order ? <input type="hidden" name="order" value={order} /> : null}
          {age ? <input type="hidden" name="age" value={age} /> : null}
          <button type="submit" className="search-bar__btn">
            Search
          </button>
        </form>

        <div className="filter-panel">
          <nav className="tag-scroll-row" aria-label="Filter by geological age">
            <Link href={chipHref({ q, order, age: "" })} className={`tri-order-chip${!age ? " is-active" : ""}`}>
              All
              <span className="tri-order-chip__count">{all.length}</span>
            </Link>
            {ages.map(({ age: name, count }) => (
              <Link
                key={name}
                href={chipHref({ q, order, age: name })}
                className={`tri-order-chip${age === name ? " is-active" : ""}`}
              >
                {name}
                <span className="tri-order-chip__count">{count}</span>
              </Link>
            ))}
          </nav>

          <nav className="tag-scroll-row" aria-label="Filter by order">
            <Link href={chipHref({ q, order: "", age })} className={`tri-order-chip${!order ? " is-active" : ""}`}>
              All
              <span className="tri-order-chip__count">{all.length}</span>
            </Link>
            {orders.slice(0, TOP_ORDERS).map(({ order: name, count }) => (
              <Link
                key={name}
                href={chipHref({ q, order: name, age })}
                className={`tri-order-chip${order === name ? " is-active" : ""}`}
              >
                {name}
                <span className="tri-order-chip__count">{count}</span>
              </Link>
            ))}
          </nav>
        </div>

        <TrilobiteGrid species={cards} />

        {filtered.length === 0 ? (
          <div className="tri-empty">
            <p>No species match your search.</p>
          </div>
        ) : null}

        <footer className="tri-footer">
          <p>
            Data compiled from the <em>Illustration Guide to Trilobites</em> visual database.
            Images are for educational and reference purposes; original copyrights belong to the
            respective institutions and collectors.
          </p>
        </footer>
      </main>
    </div>
  );
}

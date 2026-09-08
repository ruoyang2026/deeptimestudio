import Link from "next/link";
import TrilobiteGrid, { type CardData } from "./TrilobiteGrid";
import {
  getOrders,
  getAges,
  periodsForAge,
  searchAmphibians,
  isDrillable,
  getCover,
  speciesImageAlt,
  imgSrc,
  amphibians,
  SITE_URL,
  SITE_NAME,
  AMPHIBIAN_AGES,
} from "../../lib/amphibians";

type Props = {
  q?: string;
  order?: string;
  age?: string;
};

function displayAge(age: string): string {
  if (!age) return "";
  const parens = age.match(/\(([^)]+)\)/g);
  if (parens && parens.length) {
    return parens.map((p) => p.slice(1, -1)).join(" to ");
  }
  for (const period of AMPHIBIAN_AGES) {
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
  return s ? `/archive/amphibians?${s}` : "/archive/amphibians";
}

export default function AmphibiansArchive({ q = "", order = "", age = "" }: Props) {
  const orders = getOrders();
  const ages = getAges();
  const all = searchAmphibians(q);
  const byOrder = order ? all.filter((t) => t.order === order) : all;
  const filtered = age ? byOrder.filter((t) => periodsForAge(t.age).includes(age)) : byOrder;
  const sorted = [...filtered].sort(
    (a, b) => Number(isDrillable(b.slug)) - Number(isDrillable(a.slug))
  );
  const cards: CardData[] = sorted.map((t) => {
    const cover = getCover(t);
    const coverImg = t.images.find((i) => i.file === cover);
    return {
      id: t.id,
      slug: t.slug,
      order: t.order,
      scientificName: t.scientific_name,
      age: displayAge(t.age),
      distribution: t.distribution,
      cover: cover ? imgSrc(cover) : "",
      alt: speciesImageAlt(t.scientific_name, t.age, t.distribution),
      coverWidth: coverImg?.width,
      coverHeight: coverImg?.height,
      drillable: isDrillable(t.slug),
    };
  });

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/archive/amphibians#collection`,
    url: `${SITE_URL}/archive/amphibians`,
    name: "Fossil Amphibians of China",
    description:
      "A visual archive of 8 fossil amphibian species with fossil photographs, geological ages and scientific classification.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cards.length,
      itemListElement: cards.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.scientificName,
        url: `${SITE_URL}/amphibians/${c.slug}`,
      })),
    },
  };

  return (
    <div className="tri-home-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <form method="get" action="/archive/amphibians" className="search-bar">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by species, genus, age, region..."
          className="search-bar__input"
          aria-label="Search amphibian species"
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

        <nav className="tag-scroll-row" aria-label="Filter by family">
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

      <TrilobiteGrid species={cards} detailBase="/amphibians" />

      {filtered.length === 0 ? (
        <div className="tri-empty">
          <p>No species match your search.</p>
        </div>
      ) : null}

      <footer className="tri-footer">
        <p>
          Data compiled from the <em>Illustration Guide to Amphibians</em> visual database.
          Images are for educational and reference purposes; original copyrights belong to the
          respective institutions and collectors.
        </p>
      </footer>
    </div>
  );
}
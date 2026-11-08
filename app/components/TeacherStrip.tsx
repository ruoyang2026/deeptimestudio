import {
  GUMROAD_AMMONITE_PACK_URL,
  GUMROAD_FREE_COLORING_URL,
  GUMROAD_TRILOBITE_PACK_URL,
} from "../../lib/site";

/**
 * TeacherStrip — homepage strip for teachers & homeschool families.
 * Added above the hero 3D canvas as one new row; nothing existing removed.
 * Links carry utm_campaign=homepage so strip clicks are separable from email.
 */
export default function TeacherStrip() {
  return (
    <section
      style={{
        background: "#fdf6e3",
        borderBottom: "1px solid #e8dcc0",
        padding: "12px 20px",
        textAlign: "center",
        fontSize: "15px",
        lineHeight: 1.6,
      }}
      aria-label="For teachers and homeschool families"
    >
      <strong>For teachers &amp; homeschool families:</strong>{" "}
      <a href={GUMROAD_FREE_COLORING_URL} target="_blank" rel="noopener">
        Free fossil coloring pages
      </a>{" "}
      (trilobite, ammonite, mosasaur) &middot;{" "}
      <a href={GUMROAD_TRILOBITE_PACK_URL} target="_blank" rel="noopener">
        Trilobite Fossil Detectives
      </a>{" "}
      &mdash; NGSS 3-LS4-1 unit, $7 &middot;{" "}
      <a href={GUMROAD_AMMONITE_PACK_URL} target="_blank" rel="noopener">
        Ammonite Fossil Detectives
      </a>{" "}
      &mdash; NGSS 3-LS4-1 unit, $7
    </section>
  );
}

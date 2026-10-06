import type { Metadata } from "next";
import DemoFrame from "./DemoFrame";

export const metadata: Metadata = {
  title: "Live Demo — Build Your Triassic Sea | Deep Time Studio",
  description:
    "Try the interactive Triassic seabed: move creatures, add models, export your scene. No install, runs in the browser.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoFrame />;
}

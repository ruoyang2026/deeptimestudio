import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: {
    q?: string;
    order?: string;
    age?: string;
  };
};

export default function DiscoveryPage({ searchParams }: PageProps) {
  const sp = new URLSearchParams();
  if (searchParams?.q) sp.set("q", searchParams.q);
  if (searchParams?.order) sp.set("order", searchParams.order);
  if (searchParams?.age) sp.set("age", searchParams.age);
  const s = sp.toString();
  redirect(s ? `/archive/trilobites?${s}` : "/archive/trilobites");
}
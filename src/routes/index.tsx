import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "199-Brand — Lead Generation Dashboard" },
      { name: "description", content: "Find home-service leads by city, country and niche." },
      { property: "og:title", content: "199-Brand — Lead Generation Dashboard" },
      { property: "og:description", content: "Find home-service leads by city, country and niche." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Lead = { name: string; phone: string; address: string; website: "Active" | "None" | "Outdated" };
const NICHES = ["Plumbing", "Roofing", "HVAC"] as const;
const PREFIX = ["Apex", "Prime", "Summit", "Reliable", "Metro", "Blue Line", "Ironclad", "Northstar", "Peak", "Allied", "Express", "Precision"];
const SUFFIX: Record<string, string[]> = {
  Plumbing: ["Plumbing Co.", "Pipe Works", "Drain Pros"],
  Roofing: ["Roofing", "Roof Masters", "Shingle Co."],
  HVAC: ["Heating & Air", "HVAC Services", "Climate Control"],
};
const STREETS = ["Main St", "Oak Ave", "Market St", "Elm Rd", "Park Blvd", "King St", "River Dr"];

const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)] as T;

function generate(city: string, country: string, niche: string): Lead[] {
  const n = 8 + Math.floor(Math.random() * 10);
  const statuses: Lead["website"][] = ["Active", "None", "Outdated"];
  return Array.from({ length: n }, () => ({
    name: `${pick(PREFIX)} ${pick(SUFFIX[niche] ?? ["Services"])}`,
    phone: `+1 (${200 + Math.floor(Math.random() * 700)}) ${100 + Math.floor(Math.random() * 900)}-${1000 + Math.floor(Math.random() * 9000)}`,
    address: `${10 + Math.floor(Math.random() * 990)} ${pick(STREETS)}, ${city}, ${country}`,
    website: pick(statuses),
  }));
}

function Index() {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [niche, setNiche] = useState<string>("Plumbing");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const run = () => {
    if (!city.trim() || !country.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLeads(generate(city.trim().slice(0, 80), country.trim().slice(0, 80), niche));
      setLoading(false);
    }, 700);
  };

  const copy = async (l: Lead, i: number) => {
    await navigator.clipboard.writeText(`${l.name}\n${l.phone}\n${l.address}\nWebsite: ${l.website}`);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  const input = "w-full border-2 border-foreground bg-background px-4 py-3 font-mono text-sm outline-none focus:bg-foreground focus:text-background";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b-2 border-foreground px-6 py-5 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tighter">199-BRAND</h1>
        <span className="font-mono text-xs uppercase tracking-widest">Lead Engine</span>
      </header>
      <main className="mx-auto max-w-6xl p-6 space-y-8">
        <section className="grid gap-4 md:grid-cols-4 items-end">
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest">City</span>
            <input className={input} value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} placeholder="Austin" />
          </label>
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest">Country</span>
            <input className={input} value={country} maxLength={80} onChange={(e) => setCountry(e.target.value)} placeholder="USA" />
          </label>
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest">Niche</span>
            <select className={input} value={niche} onChange={(e) => setNiche(e.target.value)}>
              {NICHES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <button
            onClick={run}
            disabled={loading || !city.trim() || !country.trim()}
            className="border-2 border-foreground bg-foreground px-4 py-3 font-bold uppercase tracking-wider text-background transition hover:bg-background hover:text-foreground disabled:opacity-40"
          >
            {loading ? "Searching…" : "Generate Leads"}
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="border-2 border-foreground bg-foreground p-6 text-background">
            <p className="font-mono text-xs uppercase tracking-widest">Total Leads Found</p>
            <p className="mt-2 text-6xl font-black tracking-tighter">{leads.length}</p>
          </div>
          <div className="border-2 border-foreground p-6">
            <p className="font-mono text-xs uppercase tracking-widest">No Website</p>
            <p className="mt-2 text-6xl font-black tracking-tighter">{leads.filter((l) => l.website === "None").length}</p>
          </div>
          <div className="border-2 border-foreground p-6">
            <p className="font-mono text-xs uppercase tracking-widest">Outdated Site</p>
            <p className="mt-2 text-6xl font-black tracking-tighter">{leads.filter((l) => l.website === "Outdated").length}</p>
          </div>
        </section>

        <section className="border-2 border-foreground overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground text-background font-mono text-xs uppercase tracking-widest">
              <tr>
                <th className="p-4">Business</th><th className="p-4">Phone</th><th className="p-4">Address</th><th className="p-4">Website</th><th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center font-mono text-muted-foreground">Enter a city, country and niche, then hit Generate Leads.</td></tr>
              )}
              {leads.map((l, i) => (
                <tr key={i} className="border-t-2 border-foreground">
                  <td className="p-4 font-bold">{l.name}</td>
                  <td className="p-4 font-mono">{l.phone}</td>
                  <td className="p-4">{l.address}</td>
                  <td className="p-4">
                    <span className={`border-2 border-foreground px-2 py-1 font-mono text-xs uppercase ${l.website === "None" ? "bg-foreground text-background" : ""}`}>{l.website}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => copy(l, i)} className="border-2 border-foreground px-3 py-1 font-mono text-xs uppercase hover:bg-foreground hover:text-background">
                      {copied === i ? "Copied" : "Copy Lead"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

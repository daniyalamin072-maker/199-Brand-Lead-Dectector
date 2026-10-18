import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, Copy, ExternalLink, LogOut } from "lucide-react";
import logo from "@/assets/199-logo.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session-provider";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { activeLeads, businessKey, displayableLeads, generate, mapsUrl, NICHES, type Lead } from "@/lib/leads";
import { readHistory, saveContacted } from "@/lib/contacted-history";
import "@lovable.dev/cloud-auth-js/styles.css";
export { generate, NICHES } from "@/lib/leads";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "199-Brand — Lead Generation & Contacted Leads" },
    { name: "description", content: "Find no-website home-service leads and keep a private contacted business history." },
    { property: "og:title", content: "199-Brand — Lead Generation & Contacted Leads" },
    { property: "og:description", content: "Find no-website home-service leads and keep a private contacted business history." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Index,
});

function Index() {
  const { user, ready } = useSession();
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [niche, setNiche] = useState<string>("Plumbing");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"active" | "contacted">("active");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const operation = useRef(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const historyQuery = useQuery({
    queryKey: ["contacted-leads", user?.id],
    queryFn: () => user ? readHistory(user.id) : Promise.resolve([]),
    enabled: !!user,
  });
  const history = user ? historyQuery.data ?? [] : [];
  useEffect(() => { setLeads([]); setError(""); setNeedsSignIn(false); }, [user?.id]);
  const visible = activeLeads(leads, history);
  const qualifiedHistory = displayableLeads(history);
  const displayed = tab === "active" ? visible : qualifiedHistory;
  const input = "w-full border-2 border-foreground bg-background px-4 py-3 font-mono text-sm outline-none focus:bg-foreground focus:text-background";
  const action = "rounded-none border-2 border-foreground bg-background text-foreground shadow-none hover:bg-foreground hover:text-background font-mono uppercase";

  async function signIn(provider: "google" | "lovable") {
    setError("");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) setError("Sign-in failed. Please try again.");
  }
  async function run() {
    if (operation.current || !ready || !city.trim() || !country.trim()) return;
    operation.current = true; setBusy(true); setError("");
    const owner = user?.id;
    try {
      const latest = owner ? await readHistory(owner) : [];
      if (identity.current !== owner) return;
      if (owner) queryClient.setQueryData(["contacted-leads", owner], latest);
      const next = generate(city.trim().slice(0, 80), country.trim().slice(0, 80), niche, latest);
      setLeads(next); setTab("active");
      if (next.length < 120) setError("No more uncontacted sample businesses are available for this search.");
    } catch { setError("Could not check contacted history. No new leads were generated. Please try again."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function markDone(selected: Lead[]) {
    if (!user) { setNeedsSignIn(true); return; }
    if (operation.current || selected.length === 0) return;
    operation.current = true; setBusy(true); setError("");
    const owner = user.id;
    try {
      await saveContacted(owner, selected);
      if (identity.current !== owner) return;
      const completedAt = new Date().toISOString();
      const old = queryClient.getQueryData<typeof history>(["contacted-leads", owner]) ?? [];
      const merged = new Map(old.map(l => [businessKey(l), l]));
      for (const lead of selected) if (!merged.has(businessKey(lead))) merged.set(businessKey(lead), { ...lead, business_key: businessKey(lead), contacted_at: completedAt });
      const saved = [...merged.values()].sort((a, b) => b.contacted_at.localeCompare(a.contacted_at));
      queryClient.setQueryData(["contacted-leads", owner], saved);
      setLeads(current => activeLeads(current, saved));
      void queryClient.invalidateQueries({ queryKey: ["contacted-leads", owner] });
    } catch { setError("Could not save contacted leads. Your active leads have not been removed. Please try again."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function copy(lead: Lead) {
    try { await navigator.clipboard.writeText(`${lead.name}\n${lead.phone}\n${lead.address}\nWebsite: None`); setCopied(businessKey(lead)); setTimeout(() => setCopied(null), 1500); }
    catch { setError("Could not copy this lead. Please allow clipboard access."); }
  }
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear(); setLeads([]);
    const { error: failure } = await supabase.auth.signOut();
    if (failure) setError("Could not sign out. Please try again.");
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl p-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <img src={logo.url} alt="199-Brand logo" className="h-16 w-16" />
          {user && <Button variant="outline" className={action} disabled={busy} onClick={signOut}><LogOut />Sign out</Button>}
        </div>
        <section className="grid gap-4 md:grid-cols-4 items-end">
          <label className="space-y-2"><span className="font-mono text-xs uppercase tracking-widest">City</span><input className={input} value={city} maxLength={80} onChange={e => setCity(e.target.value)} placeholder="Austin" /></label>
          <label className="space-y-2"><span className="font-mono text-xs uppercase tracking-widest">Country</span><input className={input} value={country} maxLength={80} onChange={e => setCountry(e.target.value)} placeholder="USA" /></label>
          <label className="space-y-2"><span className="font-mono text-xs uppercase tracking-widest">Niche</span><select className={input} value={niche} onChange={e => setNiche(e.target.value)}>{NICHES.map(n => <option key={n}>{n}</option>)}</select></label>
          <Button onClick={run} disabled={busy || !ready || !city.trim() || !country.trim()} className={`${action} h-auto py-3 bg-foreground text-background hover:bg-background hover:text-foreground font-bold`}>{busy ? "Working…" : "Generate Leads"}</Button>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="border-2 border-foreground bg-foreground p-6 text-background"><p className="font-mono text-xs uppercase tracking-widest">Total Leads Found</p><p className="mt-2 text-6xl font-black">{visible.length}</p></div>
          <div className="border-2 border-foreground p-6"><p className="font-mono text-xs uppercase tracking-widest">No Website</p><p className="mt-2 text-6xl font-black">{visible.length}</p></div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="tablist" aria-label="Lead lists" className="flex flex-wrap gap-2">
            <Button role="tab" aria-selected={tab === "active"} onClick={() => setTab("active")} className={`${action} ${tab === "active" ? "bg-foreground text-background" : ""}`}>Generate Leads ({visible.length})</Button>
            <Button role="tab" aria-selected={tab === "contacted"} onClick={() => setTab("contacted")} className={`${action} ${tab === "contacted" ? "bg-foreground text-background" : ""}`}>Contacted Leads ({qualifiedHistory.length})</Button>
          </div>
          {tab === "active" && <Button variant="outline" className={action} disabled={busy || visible.length === 0} onClick={() => markDone(visible)}><CheckCheck />Mark All as Done</Button>}
        </div>
        {ready && !user && (tab === "contacted" || needsSignIn) && <section className="border-y-2 border-foreground py-5 space-y-4">
          <p className="font-mono text-sm">Sign in to save and view your contacted leads.</p>
          <div className="flex flex-wrap gap-3"><Button variant="outline" className={action} onClick={() => signIn("google")}>Continue with Google</Button><Button className="lovable-auth-button" onClick={() => signIn("lovable")}>Continue with Lovable</Button></div>
        </section>}
        {(error || historyQuery.isError) && <div role="alert" className="border-2 border-foreground p-4 text-sm"><p>{error || "Could not load contacted history. Please try again."}</p>{historyQuery.isError && <Button variant="outline" className={`${action} mt-3`} onClick={() => historyQuery.refetch()}>Retry history</Button>}</div>}
        <section role="tabpanel" aria-label={tab === "active" ? "Generate Leads" : "Contacted Leads"} className="border-2 border-foreground overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground text-background font-mono text-xs uppercase tracking-widest"><tr><th className="p-4">Business</th><th className="p-4">Phone</th><th className="p-4">Address</th><th className="p-4">Website</th>{tab === "contacted" && <th className="p-4">Contacted</th>}<th className="p-4">Maps Link</th><th className="p-4">Actions</th></tr></thead>
            <tbody>
              {displayed.length === 0 && <tr><td colSpan={tab === "contacted" ? 7 : 6} className="p-10 text-center font-mono text-muted-foreground">{tab === "contacted" ? (user && historyQuery.isPending ? "Loading contacted leads…" : "No contacted leads yet.") : "No active leads."}</td></tr>}
              {displayed.map(lead => <tr key={businessKey(lead)} className="border-t-2 border-foreground">
                <td className="p-4 font-bold">{lead.name}</td><td className="p-4 font-mono whitespace-nowrap">{lead.phone}</td><td className="p-4">{lead.address}</td>
                <td className="p-4"><span className="inline-block whitespace-nowrap border-2 border-foreground bg-foreground text-background px-2 py-1 font-mono text-xs uppercase">No Website</span></td>
                {tab === "contacted" && <td className="p-4 whitespace-nowrap font-mono text-xs">{"contacted_at" in lead && typeof lead.contacted_at === "string" ? new Date(lead.contacted_at).toLocaleDateString() : ""}</td>}
                <td className="p-4 whitespace-nowrap"><a href={mapsUrl(lead)} target="_blank" rel="noopener noreferrer" title="Open this business on Google Maps" className={`${action} inline-flex items-center gap-2 px-2 py-1 text-xs`}><ExternalLink className="h-4 w-4" />Maps Link</a></td>
                <td className="p-4"><div className="flex flex-col items-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => copy(lead)} className={action}><Copy />{copied === businessKey(lead) ? "Copied" : "Copy Lead"}</Button>
                  {tab === "active" && <Button variant="outline" size="sm" disabled={busy} onClick={() => markDone([lead])} className={action}><Check />Mark as Done</Button>}
                </div></td>
              </tr>)}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

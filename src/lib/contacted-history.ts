import { supabase } from "@/integrations/supabase/client";
import { businessKey, displayableLeads, type Lead, type ContactedLead } from "@/lib/leads";

export async function readHistory(userId: string): Promise<ContactedLead[]> {
  const rows: ContactedLead[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("contacted_leads")
      .select("business_key,name,phone,address,website,contacted_at,google_rating,review_count,business_status")
      .eq("user_id", userId).order("contacted_at", { ascending: false }).order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    for (const row of data ?? []) rows.push({ ...row, website: "None" });
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

export async function saveContacted(userId: string, leads: Lead[]) {
  if (displayableLeads(leads).length !== leads.length) throw new Error("Lead does not meet quality requirements");
  const unique = new Map(leads.map(lead => [businessKey(lead), lead]));
  const { error } = await supabase.from("contacted_leads").upsert(
    [...unique].map(([business_key, lead]) => ({
      name: lead.name, phone: lead.phone, address: lead.address, website: lead.website,
      google_rating: lead.google_rating, review_count: lead.review_count,
      business_status: lead.business_status, business_key, user_id: userId,
    })),
    { onConflict: "user_id,business_key", ignoreDuplicates: true },
  );
  if (error) throw error;
}
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SessionContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useSession = () => useContext(SessionContext);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setUser(data.session?.user ?? null); setReady(true); }
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setUser(session?.user ?? null);
      setReady(true);
      if (event === "SIGNED_OUT") queryClient.clear();
      else if (event !== "INITIAL_SESSION") void queryClient.invalidateQueries();
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [queryClient]);
  return <SessionContext.Provider value={{ user, ready }}>{children}</SessionContext.Provider>;
}
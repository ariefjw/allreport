"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isReady: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
      } else if (event === "SIGNED_IN" && session) {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Client-side guard as fallback when middleware cannot reach Supabase
  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    } else if (isAuthenticated && pathname === "/login") {
      router.replace("/critical-jobs");
    }
  }, [isReady, isAuthenticated, pathname, router]);

  // Always keep children mounted so Next.js App Router hook order stays stable
  return (
    <AuthContext.Provider value={{ isAuthenticated, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

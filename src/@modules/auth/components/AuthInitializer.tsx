"use client";

import { useEffect } from "react";
import { User } from "@supabase/supabase-js";
import useGlobalState from "@/src/@libs/hooks/useGlobalState";
import { getSupabaseBrowserClient } from "../libs/supabase/browser-client";



const AuthInitializer = () => {
  const [, setUser] = useGlobalState<User | null>({
    key: "auth-user",
    initialValue: null,
  });
  const supabase = getSupabaseBrowserClient();
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      },
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
};

export default AuthInitializer;

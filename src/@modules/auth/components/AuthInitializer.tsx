"use client";

import { useEffect } from "react";
import { User } from "@supabase/supabase-js";
import useGlobalState from "@/src/@libs/hooks/useGlobalState";

type Props = {
  user: User | null;
};

const AuthInitializer = ({ user }: Props) => {
  const [, setUser] = useGlobalState<User | null>({
    key: "auth-user",
    initialValue: null,
  });

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return null;
};

export default AuthInitializer;

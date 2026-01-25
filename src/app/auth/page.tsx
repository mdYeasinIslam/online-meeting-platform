import AuthInitializer from "@/src/@modules/auth/components/AuthInitializer";
import EmailPasswordPage from "@/src/@modules/auth/components/EmailPasswordPage";
import { createSupabaseServerClient } from "@/src/@modules/auth/libs/supabase/server-client";
import toast from "react-hot-toast";

const page = async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return (
    <>
      <EmailPasswordPage user={data.user} />
    </>
  );
};

export default page;

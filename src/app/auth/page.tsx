import { createSupabaseServerClient } from '@/src/@modules/auth/libs/supabase/server-client'
import EmailPasswordPage from '@/src/@modules/auth/components/EmailPasswordPage'

const page = async () => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {

  }
  console.log(data.user)

  return (
    <>
    <EmailPasswordPage/></>
  )
}

export default page
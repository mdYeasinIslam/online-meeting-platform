import EmailPasswordPage from "@/src/@modules/auth/components/EmailPasswordPage";
import { safeReturnPath } from "@/src/@modules/auth/libs/return-path";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error =
    params.error === "account-exists"
      ? "This email already has an account. Sign in with your password."
      : params.error
        ? "Google authentication failed. Please try again."
        : "";
  return (
    <EmailPasswordPage
      next={safeReturnPath(params.next)}
      initialError={error}
    />
  );
}

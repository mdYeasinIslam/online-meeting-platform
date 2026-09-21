import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import Dashboard from "@/src/@modules/meeting/components/Dashboard";
export default function Page() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

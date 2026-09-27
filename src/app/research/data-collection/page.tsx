import AuthGuard from "@/src/@modules/auth/components/AuthGuard";
import DataCollection from "@/src/@modules/research/components/DataCollection";
export default function Page() { return <AuthGuard><DataCollection /></AuthGuard>; }

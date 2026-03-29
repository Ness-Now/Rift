import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(18,107,95,0.16),_transparent_40%),linear-gradient(180deg,_#f7fbfc_0%,_#eff4f7_100%)] px-6 py-10">
      <AuthForm mode="signup" />
    </main>
  );
}
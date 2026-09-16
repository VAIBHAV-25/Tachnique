import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setSession, type StoredUser } from "@/lib/api-client";
import { AuthLayout } from "@/components/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("meera@taskboard.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: StoredUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-[13px] font-medium text-ink mb-1.5">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="field"
          />
        </label>
        <label className="block">
          <span className="block text-[13px] font-medium text-ink mb-1.5">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="field"
          />
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner /> : null}
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-5 rounded-lg bg-subtle px-3 py-2.5 text-[12px] text-muted">
        <span className="font-semibold text-ink">Demo</span> - prefilled with
        <span className="font-medium text-ink"> meera@taskboard.dev</span> / password123.
      </p>
    </AuthLayout>
  );
}

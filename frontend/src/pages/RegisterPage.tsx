import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, setSession, type StoredUser } from "@/lib/api-client";
import { AuthLayout } from "@/components/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: StoredUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setSession(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start organizing work in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-[13px] font-medium text-ink mb-1.5">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="field"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            className="field"
          />
          <span className="mt-1.5 block text-[12px] text-faint">At least 8 characters.</span>
        </label>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? <Spinner /> : null}
          {submitting ? "Creating..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

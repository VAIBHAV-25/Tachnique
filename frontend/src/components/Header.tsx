import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearSession, getStoredUser } from "@/lib/api-client";
import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";

export function Header() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  useEffect(() => {
    const u = getStoredUser();
    if (u) setName(u.name);
  }, []);

  function onLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg font-bold tracking-tight text-ink">TaskBoard</span>
        </Link>
        {name && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={name} size={30} />
              <span className="hidden sm:block text-sm font-semibold text-ink">{name}</span>
            </div>
            <span className="h-5 w-px bg-line" />
            <button
              onClick={onLogout}
              className="text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -left-24 w-[440px] h-[440px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle, #E7E9FF 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -right-20 w-[480px] h-[480px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, #E6F6EF 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-up">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BrandMark size={34} />
          <span className="font-display text-xl font-bold tracking-tight">TaskBoard</span>
        </div>

        <div className="bg-surface border border-line rounded-2xl shadow-panel p-8">
          <h1 className="text-[22px] font-bold mb-1.5">{title}</h1>
          <p className="text-sm text-muted mb-6">{subtitle}</p>
          {children}
        </div>

        {footer && <p className="text-center text-[13px] text-muted mt-6">{footer}</p>}
      </div>
    </main>
  );
}

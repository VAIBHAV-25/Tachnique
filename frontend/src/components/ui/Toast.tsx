import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: Tone };
type Toast = ToastInput & { id: number; tone: Tone };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

const TONE_BAR: Record<Tone, string> = {
  success: "bg-status-done",
  error: "bg-danger",
  info: "bg-primary",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = nextId++;
    setToasts((cur) => [...cur, { tone: "info", ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2.5rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-slide-in flex overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
          >
            <span className={`w-1 shrink-0 ${TONE_BAR[t.tone]}`} />
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-ink">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

import { createContext, useContext, useMemo, useState } from "react";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    if (!text) return;
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div className="fixed bottom-4 z-[70] mx-auto w-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

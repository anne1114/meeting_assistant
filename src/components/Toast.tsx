import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const icons: Record<ToastType, { node: ReactNode; ring: string }> = {
    success: { node: <CheckCircle2 size={18} className="text-emerald-600" />, ring: 'bg-emerald-50' },
    error: { node: <AlertCircle size={18} className="text-red-600" />, ring: 'bg-red-50' },
    info: { node: <Info size={18} className="text-brand-600" />, ring: 'bg-brand-50' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-in flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 shadow-lift"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${icons[t.type].ring}`}>
              {icons[t.type].node}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
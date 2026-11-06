import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const typeConfigs = {
            success: {
              border: 'border-emerald-500/40',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
            },
            warning: {
              border: 'border-amber-500/40',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
            },
            info: {
              border: 'border-cyan-500/40',
              icon: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
            },
            error: {
              border: 'border-red-500/40',
              icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
            },
          };

          const config = typeConfigs[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl bg-[#0B0F17]/95 backdrop-blur-xl border ${config.border} shadow-2xl flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {config.icon}
              <div className="flex-1 pr-2">
                <div className="font-sans font-semibold text-xs text-slate-100">{toast.title}</div>
                {toast.description && (
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 leading-relaxed break-all">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

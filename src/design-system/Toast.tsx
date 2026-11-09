import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';

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
    }, 4500);
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
              border: 'border-emerald-500/30 bg-[#071712]/95',
              accent: 'bg-emerald-400',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
            },
            warning: {
              border: 'border-amber-500/30 bg-[#1A1208]/95',
              accent: 'bg-amber-400',
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
            },
            info: {
              border: 'border-cyan-500/30 bg-[#091422]/95',
              accent: 'bg-[#00F2FE]',
              icon: <Info className="w-4 h-4 text-[#00F2FE] shrink-0 mt-0.5" />,
            },
            error: {
              border: 'border-rose-500/30 bg-[#1C0A10]/95',
              accent: 'bg-rose-500',
              icon: <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
            },
          };

          const config = typeConfigs[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden p-4 rounded-xl backdrop-blur-xl border ${config.border} shadow-2xl flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
              {config.icon}
              <div className="flex-1 pr-2 min-w-0">
                <div className="font-sans font-semibold text-xs text-slate-100">{toast.title}</div>
                {toast.description && (
                  <div className="text-[11px] font-mono text-slate-300 mt-1 leading-relaxed break-words">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors cursor-pointer"
                title="Dismiss notification"
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

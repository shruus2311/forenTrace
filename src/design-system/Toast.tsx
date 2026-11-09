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
              border: 'border-[#337D5C]/30 dark:border-[#4D9B78]/40 bg-white/95 dark:bg-[#142820]/95',
              accent: 'bg-[#337D5C] dark:bg-[#4D9B78]',
              icon: <CheckCircle2 className="w-4 h-4 text-[#337D5C] dark:text-[#4D9B78] shrink-0 mt-0.5" />,
            },
            warning: {
              border: 'border-[#A9772D]/30 dark:border-[#C69A54]/40 bg-white/95 dark:bg-[#2B2113]/95',
              accent: 'bg-[#A9772D] dark:bg-[#C69A54]',
              icon: <AlertTriangle className="w-4 h-4 text-[#A9772D] dark:text-[#C69A54] shrink-0 mt-0.5" />,
            },
            info: {
              border: 'border-[#416F9E]/30 dark:border-[#648DBB]/40 bg-white/95 dark:bg-[#1A2838]/95',
              accent: 'bg-[#416F9E] dark:bg-[#648DBB]',
              icon: <Info className="w-4 h-4 text-[#416F9E] dark:text-[#648DBB] shrink-0 mt-0.5" />,
            },
            error: {
              border: 'border-[#B74D55]/30 dark:border-[#C66B70]/40 bg-white/95 dark:bg-[#2C181A]/95',
              accent: 'bg-[#B74D55] dark:bg-[#C66B70]',
              icon: <ShieldAlert className="w-4 h-4 text-[#B74D55] dark:text-[#C66B70] shrink-0 mt-0.5" />,
            },
          };

          const config = typeConfigs[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden p-4 rounded-xl backdrop-blur-xl border ${config.border} shadow-xl flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
              {config.icon}
              <div className="flex-1 pr-2 min-w-0">
                <div className="font-sans font-semibold text-xs text-slate-800 dark:text-[#E7EAF0]">
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="text-[11px] font-mono text-slate-600 dark:text-[#9AA4B2] mt-1 leading-relaxed break-words">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors cursor-pointer"
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

export default { ToastProvider, useToast };

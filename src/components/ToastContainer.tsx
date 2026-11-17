import React from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  const bgStyles = {
    success: 'bg-emerald-700 text-white',
    error: 'bg-red-700 text-white',
    warning: 'bg-amber-600 text-white',
    info: 'bg-slate-900 text-white',
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-triangle-exclamation',
    warning: 'fa-circle-exclamation',
    info: 'fa-circle-info',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2.5 transition transform animate-fade-in ${bgStyles[t.type]}`}
        >
          <i className={`fa-solid ${icons[t.type]}`}></i>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};

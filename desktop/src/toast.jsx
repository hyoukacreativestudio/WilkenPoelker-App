import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((message, opts = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type: opts.type || 'info', undo: opts.undo });
    timer.current = setTimeout(() => setToast(null), opts.duration || 4000);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'err' : ''}`}>
          <span>{toast.message}</span>
          {toast.undo && (
            <span className="undo" onClick={() => { setToast(null); toast.undo(); }}>Rückgängig</span>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, remove };
}
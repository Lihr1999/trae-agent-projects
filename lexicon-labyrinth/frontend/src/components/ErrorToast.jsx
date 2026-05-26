import { useEffect } from 'react';

export default function ErrorToast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="error-toast" onClick={onClose}>
      {message}
    </div>
  );
}

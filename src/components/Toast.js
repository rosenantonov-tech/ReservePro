import React, { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const colors = {
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    error: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
    info: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' }
  };

  const color = colors[type] || colors.success;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: color.bg,
        border: `2px solid ${color.border}`,
        color: color.text,
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px',
        wordBreak: 'break-word'
      }}
    >
      {message}
    </div>
  );
}

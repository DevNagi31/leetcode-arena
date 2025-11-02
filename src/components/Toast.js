import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const icons = {
    success: <CheckCircle size={20} strokeWidth={2} />,
    error: <XCircle size={20} strokeWidth={2} />,
    warning: <AlertCircle size={20} strokeWidth={2} />,
    info: <Info size={20} strokeWidth={2} />
  };

  return (
    <div className={`toast ${type} ${isExiting ? 'exit' : ''}`}>
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={handleClose}>
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  );
};

export default Toast;

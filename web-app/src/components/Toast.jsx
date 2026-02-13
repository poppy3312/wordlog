import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

function Toast({ type, message }) {
  useEffect(() => {
    // 播放提示音（可选）
    // const audio = new Audio('/notification.mp3');
    // audio.play().catch(() => {});
  }, []);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-500'
    }
  };

  const { icon: Icon, bgColor, textColor, borderColor, iconColor } = config[type] || config.info;

  return (
    <div
      className={`fixed bottom-16 left-1/2 transform -translate-x-1/2 z-[10000]
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        ${bgColor} ${textColor} ${borderColor} toast-enter
      `}
    >
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export default Toast;

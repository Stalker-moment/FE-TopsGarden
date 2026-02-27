// Notification.tsx
import React, { useEffect, useState } from 'react';

type NotificationProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const [progress, setProgress] = useState(100); // 100% saat awal

  useEffect(() => {
    console.log('Notification mounted');

    const duration = 3000; // total durasi (ms)
    const intervalTime = 50; // update setiap 50ms
    const decrement = (100 * intervalTime) / duration; // persentase yang dikurangi tiap interval

    // Interval untuk mengubah progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, intervalTime);

    // Timer untuk menutup notifikasi setelah 'duration'
    const timer = setTimeout(() => {
      console.log('Timeout finished, calling onClose');
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      console.log('Notification unmounted');
    };
  }, [onClose]);

  // Tentukan warna berdasarkan tipe notifikasi
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const progressColor = type === 'success' ? 'bg-green-300' : 'bg-red-300';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm p-4 text-white rounded-xl shadow-2xl ${bgColor} z-[9999]`}>
      <div className="mb-2 text-sm md:text-base font-semibold">{message}</div>
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden mt-2">
        <div
          className={`${progressColor} h-full rounded-full`}
          style={{
            width: `${progress}%`,
            transition: 'width 50ms linear',
          }}
        />
      </div>
    </div>
  );
};

export default Notification;
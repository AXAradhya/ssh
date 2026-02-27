import { useState, useEffect } from 'react';
import { Wifi, Bell } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedDate = time.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="header">
      <div className="header-left">
        <h2>Command Center</h2>
        <p>{formattedDate}</p>
      </div>
      <div className="header-right">
        <div className="header-status">
          <Wifi size={14} />
          <span>All Systems Online</span>
        </div>
        <div className="header-clock">{formattedTime}</div>
        <Bell size={18} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
      </div>
    </header>
  );
}

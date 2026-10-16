import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface RecentUser {
  id: string;
  name: string;
}

const RECENT_USERS_KEY = 'eventernote-recent-users';
const MAX_RECENT_USERS = 8;

function readRecentUsers(): RecentUser[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(user => typeof user?.id === 'string' && typeof user?.name === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentUsers(users: RecentUser[]) {
  try {
    localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(users));
  } catch {
    return;
  }
}

interface ReportContextType {
  recentUsers: RecentUser[];
  rememberUser: (user: RecentUser) => void;
  forgetUser: (id: string) => void;
  userId: string | null;
  setUserId: (id: string | null) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
    endDate: new Date() // Today - excludes future events
  });

  useEffect(() => {
    setRecentUsers(readRecentUsers());
    // Check URL query parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');

    if (userParam) {
      setUserId(userParam);
      localStorage.setItem('eventernote-user-id', userParam);
    } else {
      // Fall back to localStorage
      const saved = localStorage.getItem('eventernote-user-id');
      if (saved) setUserId(saved);
    }

    const handlePopState = () => {
      setUserId(new URLSearchParams(window.location.search).get('user'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetUserId = (id: string | null) => {
    setUserId(id);
    if (new URLSearchParams(window.location.search).get('user') !== id) {
      window.history.pushState(null, '', id ? `?user=${encodeURIComponent(id)}` : window.location.pathname);
    }
    if (id) {
      localStorage.setItem('eventernote-user-id', id);
    } else {
      localStorage.removeItem('eventernote-user-id');
      setDateRange({
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
      });
    }
  };

  const rememberUser = (user: RecentUser) => {
    setRecentUsers(current => {
      const existing = current.find(item => item.id.toLowerCase() === user.id.toLowerCase());
      if (existing && existing.name === user.name && current[0] === existing) return current;
      const next = [user, ...current.filter(item => item.id.toLowerCase() !== user.id.toLowerCase())].slice(0, MAX_RECENT_USERS);
      writeRecentUsers(next);
      return next;
    });
  };

  const forgetUser = (id: string) => {
    setRecentUsers(current => {
      const next = current.filter(item => item.id !== id);
      writeRecentUsers(next);
      return next;
    });
  };

  return (
    <ReportContext.Provider
      value={{
        recentUsers,
        rememberUser,
        forgetUser,
        userId,
        setUserId: handleSetUserId,
        dateRange,
        setDateRange
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReport() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}

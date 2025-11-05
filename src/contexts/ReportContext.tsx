import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface ReportContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1), // January 1st of current year
    endDate: new Date() // Today - excludes future events
  });

  useEffect(() => {
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
  }, []);

  const handleSetUserId = (id: string | null) => {
    setUserId(id);
    if (id) {
      localStorage.setItem('eventernote-user-id', id);
    } else {
      localStorage.removeItem('eventernote-user-id');
    }
  };

  return (
    <ReportContext.Provider
      value={{
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

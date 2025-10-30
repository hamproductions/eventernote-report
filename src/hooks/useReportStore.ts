import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DateRange, PresetPeriod } from '../shared/types/event';
import type { FilterState, ViewType, SortField, SortDirection } from '../shared/types/report';

interface ReportStore {
  // User ID
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Date Range
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  selectedPreset: PresetPeriod | null;
  setPreset: (preset: PresetPeriod | null) => void;

  // Filters
  filters: FilterState;
  updateFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;

  // View
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Sort
  sortBy: SortField;
  sortDirection: SortDirection;
  setSorting: (field: SortField, direction: SortDirection) => void;
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),

      dateRange: {
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        endDate: new Date()
      },
      setDateRange: (range) => set({ dateRange: range, selectedPreset: null }),

      selectedPreset: 'last_12_months',
      setPreset: (preset) => set({ selectedPreset: preset }),

      filters: {
        searchQuery: '',
        selectedArtists: [],
        selectedVenues: [],
        hasMultipleArtists: false
      },
      updateFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),
      clearFilters: () =>
        set({
          filters: {
            searchQuery: '',
            selectedArtists: [],
            selectedVenues: [],
            hasMultipleArtists: false
          }
        }),

      currentView: 'dashboard',
      setCurrentView: (view) => set({ currentView: view }),

      sortBy: 'date',
      sortDirection: 'desc',
      setSorting: (field, direction) => set({ sortBy: field, sortDirection: direction })
    }),
    {
      name: 'eventernote-reports-store'
    }
  )
);

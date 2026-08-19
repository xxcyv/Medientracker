import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Category } from '../sheets/types';

interface CategoryFilterState {
  listCategory: Category | 'all';
  setListCategory: (category: Category | 'all') => void;
  overviewCategory: Category | 'all';
  setOverviewCategory: (category: Category | 'all') => void;
  yearlyCategory: Category | 'all';
  setYearlyCategory: (category: Category | 'all') => void;
}

const CategoryFilterContext = createContext<CategoryFilterState | undefined>(undefined);

/** Keeps category filters alive across view switches by lifting them out of the per-page component state. */
export function CategoryFilterProvider({ children }: { children: ReactNode }) {
  const [listCategory, setListCategory] = useState<Category | 'all'>('all');
  const [overviewCategory, setOverviewCategory] = useState<Category | 'all'>('all');
  const [yearlyCategory, setYearlyCategory] = useState<Category | 'all'>('all');

  return (
    <CategoryFilterContext.Provider
      value={{ listCategory, setListCategory, overviewCategory, setOverviewCategory, yearlyCategory, setYearlyCategory }}
    >
      {children}
    </CategoryFilterContext.Provider>
  );
}

export function useCategoryFilter(): CategoryFilterState {
  const context = useContext(CategoryFilterContext);
  if (!context) throw new Error('useCategoryFilter must be used within a CategoryFilterProvider');
  return context;
}

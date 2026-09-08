import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PageBreadcrumbItem = {
  label: string;
  to?: string;
};

type PageBreadcrumbContextValue = {
  items: PageBreadcrumbItem[] | null;
  setItems: (items: PageBreadcrumbItem[] | null) => void;
};

const PageBreadcrumbContext = createContext<PageBreadcrumbContextValue | null>(null);

export function PageBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PageBreadcrumbItem[] | null>(null);
  const value = useMemo(() => ({ items, setItems }), [items]);

  return (
    <PageBreadcrumbContext.Provider value={value}>{children}</PageBreadcrumbContext.Provider>
  );
}

function usePageBreadcrumbContext() {
  const context = useContext(PageBreadcrumbContext);
  if (!context) {
    throw new Error('Page breadcrumb hooks must be used within PageBreadcrumbProvider.');
  }
  return context;
}

export function usePageBreadcrumbItems() {
  return useContext(PageBreadcrumbContext)?.items ?? null;
}

export function useSetPageBreadcrumbs(items: PageBreadcrumbItem[] | null) {
  const { setItems } = usePageBreadcrumbContext();

  useEffect(() => {
    setItems(items);
    return () => setItems(null);
  }, [items, setItems]);
}

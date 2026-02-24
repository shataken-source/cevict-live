import dynamic from 'next/dynamic';

// Heavy components that should be loaded dynamically
export const DynamicChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  { 
    ssr: false, 
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-64 w-full" />
  }
);

export const DynamicDatePicker = dynamic(
  () => import('react-day-picker').then(mod => ({ default: mod.DayPicker })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-80 w-full" />
  }
);

export const DynamicCarousel = dynamic(
  () => import('embla-carousel-react').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-48 w-full" />
  }
);

// Admin dashboard components - load only when needed
export const DynamicAdminPanel = dynamic(
  () => import('@/components/AdminPanel'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-96 w-full" />
  }
);

// Chart components - load only on dashboard pages
export const DynamicLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-64 w-full" />
  }
);

export const DynamicBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 rounded h-64 w-full" />
  }
);

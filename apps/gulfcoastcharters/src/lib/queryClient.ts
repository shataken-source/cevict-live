import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logError } from './errorLogger';

// Create query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        logError(error as Error, { context: 'mutation' });
        toast.error('An error occurred. Please try again.');
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError(error as Error, { 
        context: 'query',
        queryKey: query.queryKey,
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      logError(error as Error, {
        context: 'mutation',
        mutationKey: mutation.options.mutationKey,
      });
    },
  }),
});

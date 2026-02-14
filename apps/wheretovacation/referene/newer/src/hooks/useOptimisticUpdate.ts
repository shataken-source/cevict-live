import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export function useOptimisticUpdate<T>(queryKey: string[]) {
  const queryClient = useQueryClient();

  const updateOptimistically = useCallback(
    async (
      updater: (old: T | undefined) => T,
      mutationFn: () => Promise<T>
    ) => {
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, updater);

      try {
        // Perform the mutation
        const result = await mutationFn();
        return result;
      } catch (error) {
        // If the mutation fails, rollback
        queryClient.setQueryData<T>(queryKey, previousData);
        throw error;
      }
    },
    [queryClient, queryKey]
  );

  return { updateOptimistically };
}

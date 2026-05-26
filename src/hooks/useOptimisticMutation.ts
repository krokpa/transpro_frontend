import { useMutation, useQueryClient, MutationOptions, QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OptimisticMutationOptions<TData, TVariables, TContext = TData[]> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: QueryKey;
  optimisticUpdate: (old: TContext, variables: TVariables) => TContext;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables, TContext = TData[]>({
  mutationFn,
  queryKey,
  optimisticUpdate,
  successMessage,
  errorMessage = 'Une erreur est survenue',
  onSuccess,
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables, { previous: TContext | undefined }>({
    mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TContext>(queryKey);
      if (previous !== undefined) {
        queryClient.setQueryData<TContext>(queryKey, (old) =>
          old ? optimisticUpdate(old, variables) : old,
        );
      }
      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(errorMessage);
    },

    onSuccess: (data, variables) => {
      if (successMessage) toast.success(successMessage);
      onSuccess?.(data, variables);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

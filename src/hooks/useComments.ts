import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name?: string;
}

export function useComments(potholeId: string) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', potholeId],
    queryFn: async () => {
      return apiRequest<Comment[]>(`/api/comments?potholeId=${encodeURIComponent(potholeId)}`);
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ content, userId }: { content: string; userId: string }) => {
      await apiRequest('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        pothole_id: potholeId,
        user_id: userId,
        content,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', potholeId] });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
    },
  });

  return { comments, isLoading, addComment: addComment.mutate, isAdding: addComment.isPending };
}

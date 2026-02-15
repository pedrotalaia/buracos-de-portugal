import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('pothole_id', potholeId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Fetch display names
      const userIds = [...new Set((data || []).map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        nameMap[p.id] = p.display_name || 'Utilizador';
      });

      return (data || []).map((c) => ({
        ...c,
        display_name: nameMap[c.user_id] || 'Utilizador',
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ content, userId }: { content: string; userId: string }) => {
      const { error } = await supabase.from('comments').insert({
        pothole_id: potholeId,
        user_id: userId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', potholeId] });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
    },
  });

  return { comments, isLoading, addComment: addComment.mutate, isAdding: addComment.isPending };
}

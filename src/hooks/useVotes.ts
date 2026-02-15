import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function getAnonId() {
  let id = localStorage.getItem('anon_voter_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('anon_voter_id', id);
  }
  return id;
}

export function useVotes(potholeId: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: hasVoted = false } = useQuery({
    queryKey: ['vote-status', potholeId, userId],
    queryFn: async () => {
      if (userId) {
        const { data } = await supabase
          .from('votes')
          .select('id')
          .eq('pothole_id', potholeId)
          .eq('user_id', userId)
          .maybeSingle();
        return !!data;
      }
      const anonId = getAnonId();
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('pothole_id', potholeId)
        .eq('anon_id', anonId)
        .maybeSingle();
      return !!data;
    },
  });

  const vote = useMutation({
    mutationFn: async () => {
      if (userId) {
        if (hasVoted) {
          await supabase.from('votes').delete().eq('pothole_id', potholeId).eq('user_id', userId);
        } else {
          await supabase.from('votes').insert({ pothole_id: potholeId, user_id: userId });
        }
      } else {
        const anonId = getAnonId();
        if (hasVoted) {
          await supabase.from('votes').delete().eq('pothole_id', potholeId).eq('anon_id', anonId);
        } else {
          await supabase.from('votes').insert({ pothole_id: potholeId, anon_id: anonId });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-status', potholeId] });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
    },
  });

  return { hasVoted, toggleVote: vote.mutate, isVoting: vote.isPending };
}

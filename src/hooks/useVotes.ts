import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

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
      const anonId = getAnonId();
      if (userId) {
        const result = await apiRequest<{ hasVoted: boolean }>(
          `/api/votes/status?potholeId=${encodeURIComponent(potholeId)}&userId=${encodeURIComponent(userId)}`,
        );
        return result.hasVoted;
      }

      const result = await apiRequest<{ hasVoted: boolean }>(
        `/api/votes/status?potholeId=${encodeURIComponent(potholeId)}&anonId=${encodeURIComponent(anonId)}`,
      );
      return result.hasVoted;
    },
  });

  const vote = useMutation({
    mutationFn: async () => {
      if (userId) {
        await apiRequest('/api/votes/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pothole_id: potholeId, user_id: userId }),
        });
      } else {
        const anonId = getAnonId();
        await apiRequest('/api/votes/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pothole_id: potholeId, anon_id: anonId }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vote-status', potholeId] });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
    },
  });

  return { hasVoted, toggleVote: vote.mutate, isVoting: vote.isPending };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Pothole } from '@/types/pothole';

async function fetchPotholes(): Promise<Pothole[]> {
  // Fetch potholes with vote and comment counts
  const { data: potholes, error } = await supabase
    .from('potholes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch vote counts
  const { data: voteCounts } = await supabase
    .from('votes')
    .select('pothole_id');

  // Fetch comment counts
  const { data: commentCounts } = await supabase
    .from('comments')
    .select('pothole_id');

  const voteMap: Record<string, number> = {};
  voteCounts?.forEach((v) => {
    voteMap[v.pothole_id] = (voteMap[v.pothole_id] || 0) + 1;
  });

  const commentMap: Record<string, number> = {};
  commentCounts?.forEach((c) => {
    commentMap[c.pothole_id] = (commentMap[c.pothole_id] || 0) + 1;
  });

  return (potholes || []).map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? undefined,
    normalized_address: (p as any).normalized_address ?? undefined,
    parish: (p as any).parish ?? undefined,
    municipality: (p as any).municipality ?? undefined,
    district: (p as any).district ?? undefined,
    postal_code: (p as any).postal_code ?? undefined,
    geocode_status: (p as any).geocode_status ?? undefined,
    geocoded_at: (p as any).geocoded_at ?? undefined,
    description: p.description ?? undefined,
    photo_url: p.photo_url ?? undefined,
    severity: p.severity as Pothole['severity'],
    status: p.status as Pothole['status'],
    votes: voteMap[p.id] || 0,
    comments_count: commentMap[p.id] || 0,
    created_at: p.created_at,
    user_id: p.user_id ?? undefined,
    repaired_at: (p as any).repaired_at ?? undefined,
    reopen_count: (p as any).reopen_count ?? 0,
  }));
}

export function usePotholes() {
  return useQuery({
    queryKey: ['potholes'],
    queryFn: fetchPotholes,
  });
}

import { useQuery } from '@tanstack/react-query';
import { Pothole } from '@/types/pothole';
import { apiRequest, resolveUploadUrl } from '@/lib/api';

async function fetchPotholes(): Promise<Pothole[]> {
  const potholes = await apiRequest<Pothole[]>('/api/potholes');
  return potholes.map((pothole) => ({
    ...pothole,
    photo_url: resolveUploadUrl(pothole.photo_url),
  }));
}

export function usePotholes() {
  return useQuery({
    queryKey: ['potholes'],
    queryFn: fetchPotholes,
  });
}

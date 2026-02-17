import { useQuery } from '@tanstack/react-query';
import { Pothole } from '@/types/pothole';
import { apiRequest } from '@/lib/api';

async function fetchPotholes(): Promise<Pothole[]> {
  return apiRequest<Pothole[]>('/api/potholes');
}

export function usePotholes() {
  return useQuery({
    queryKey: ['potholes'],
    queryFn: fetchPotholes,
  });
}

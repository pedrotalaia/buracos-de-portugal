import { useState, useEffect, useRef } from 'react';
import { GeocodingResult, searchLocations } from '@/lib/geocoding';

export function useGeocoding(query: string) {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const data = await searchLocations(trimmed, controller.signal);
        setResults(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  return { results, isLoading };
}

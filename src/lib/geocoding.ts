export interface GeocodingResult {
  display_name: string;
  lat: number;
  lng: number;
  zoom: number;
}

interface NominatimSearchItem {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
}

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  cycleway?: string;
  house_number?: string;
  suburb?: string;
  city_district?: string;
  neighbourhood?: string;
  quarter?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

export interface NormalizedAddress {
  address: string;
  normalized_address: string;
  parish: string | null;
  municipality: string | null;
  district: string | null;
  postal_code: string | null;
  provider: string;
}

type ProviderName = 'nominatim';

function getProviderOrder(): ProviderName[] {
  const configured = (import.meta.env.VITE_GEOCODING_PROVIDER as string | undefined)?.trim().toLowerCase();
  const ordered: ProviderName[] = [];

  if (configured === 'nominatim') {
    ordered.push('nominatim');
  }

  if (!ordered.includes('nominatim')) {
    ordered.push('nominatim');
  }

  return ordered;
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&countrycodes=pt&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'pt' },
  });

  if (!res.ok) {
    throw new Error('Erro ao pesquisar localização');
  }

  const data = (await res.json()) as NominatimSearchItem[];

  return (data || []).map((item: any) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    zoom: getBoundingBoxZoom(item.boundingbox),
  }));
}

export async function reverseGeocodeWithFallback(lat: number, lng: number): Promise<NormalizedAddress | null> {
  const providers = getProviderOrder();

  for (const provider of providers) {
    try {
      if (provider === 'nominatim') {
        const resolved = await reverseGeocodeNominatim(lat, lng);
        if (resolved) return resolved;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<NormalizedAddress | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'pt' },
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as NominatimReverseResponse;
  if (!data?.display_name) return null;

  const parsed = normalizeAddressFromNominatim(data);
  return {
    ...parsed,
    provider: 'nominatim',
  };
}

function normalizeAddressFromNominatim(data: NominatimReverseResponse): Omit<NormalizedAddress, 'provider'> {
  const address = data.address || {};
  const road = pickFirst(address.road, address.pedestrian, address.footway, address.path, address.cycleway);
  const houseNumber = pickFirst(address.house_number);
  const parish = pickFirst(address.suburb, address.city_district, address.neighbourhood, address.quarter, address.hamlet);
  const municipality = pickFirst(address.city, address.town, address.village, address.municipality, address.county);
  const district = pickFirst(address.state_district, address.state, address.county);
  const postalCode = pickFirst(address.postcode);

  const line1 = [road, houseNumber].filter(Boolean).join(', ');
  const line2 = [postalCode, municipality].filter(Boolean).join(' ');
  const normalized = [line1, parish, line2, district].filter(Boolean).join(', ');

  return {
    address: data.display_name,
    normalized_address: normalized || data.display_name,
    parish: parish || null,
    municipality: municipality || null,
    district: district || null,
    postal_code: postalCode || null,
  };
}

function pickFirst(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function getBoundingBoxZoom(bb: string[]): number {
  if (!bb || bb.length < 4) return 13;
  const latDiff = Math.abs(parseFloat(bb[1]) - parseFloat(bb[0]));
  const lngDiff = Math.abs(parseFloat(bb[3]) - parseFloat(bb[2]));
  const maxDiff = Math.max(latDiff, lngDiff);
  if (maxDiff > 5) return 7;
  if (maxDiff > 1) return 9;
  if (maxDiff > 0.5) return 11;
  if (maxDiff > 0.1) return 13;
  if (maxDiff > 0.01) return 15;
  return 16;
}

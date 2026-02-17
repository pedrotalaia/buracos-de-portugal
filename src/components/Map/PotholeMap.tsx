import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Pothole, SEVERITY_LABELS, STATUS_LABELS } from '@/types/pothole';
import { ThumbsUp, MessageCircle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import PotholeDetailSheet from './PotholeDetailSheet';
import { apiRequest } from '@/lib/api';

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const severityColors: Record<string, string> = {
  low: '#d4a017',
  moderate: '#e8760a',
  high: '#d32f2f',
};

const statusColors: Record<string, string> = {
  reported: '#3366cc',
  repairing: '#e8760a',
  repaired: '#2e9e51',
  archived: '#888888',
};

function createPotholeIcon(severity: string, status: string) {
  const color = status === 'repaired' || status === 'archived' ? statusColors[status] : severityColors[severity];
  const opacity = status === 'repaired' ? 0.5 : status === 'archived' ? 0.3 : 1;
  return L.divIcon({
    className: 'custom-pothole-marker',
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      opacity: ${opacity};
      display: flex; align-items: center; justify-content: center;
    "><div style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.6);"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

interface ClickHandlerProps {
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface FlyToProps {
  lat: number;
  lng: number;
  zoom: number;
}

function MapFlyTo({ lat, lng, zoom }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.5 });
  }, [lat, lng, zoom, map]);
  return null;
}

interface PotholeMapProps {
  potholes: Pothole[];
  onMapClick?: (lat: number, lng: number) => void;
  clickMode?: boolean;
  flyTo?: FlyToProps | null;
  currentUserId?: string;
  showClusters?: boolean;
}

const PORTUGAL_CENTER: [number, number] = [39.5, -8.0];
const PORTUGAL_ZOOM = 7;

export default function PotholeMap({
  potholes,
  onMapClick,
  clickMode = false,
  flyTo,
  currentUserId,
  showClusters = false,
}: PotholeMapProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);

  const handleReopen = async (pothole: Pothole) => {
    setActionLoading(pothole.id);
    try {
      await apiRequest(`/api/potholes/${pothole.id}/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopen_count: (pothole.reopen_count ?? 0) + 1 }),
      });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
      toast({ title: 'Buraco reaberto', description: 'O estado foi alterado para "Reportado".' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reabrir buraco.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (pothole: Pothole) => {
    setActionLoading(pothole.id);
    try {
      await apiRequest(`/api/potholes/${pothole.id}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
      setSelectedPothole(null);
      toast({ title: 'Buraco eliminado', description: 'O reporte foi removido.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao eliminar buraco.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <MapContainer
        center={PORTUGAL_CENTER}
        zoom={PORTUGAL_ZOOM}
        className="h-full w-full z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {flyTo && <MapFlyTo lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}
        {clickMode && <MapClickHandler onMapClick={onMapClick} />}
        {showClusters ? (
          <MarkerClusterGroup chunkedLoading>
            {potholes.map((p) => (
              <Marker
                key={p.id}
                position={[p.lat, p.lng]}
                icon={createPotholeIcon(p.severity, p.status)}
                eventHandlers={{ click: () => setSelectedPothole(p) }}
              />
            ))}
          </MarkerClusterGroup>
        ) : (
          potholes.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createPotholeIcon(p.severity, p.status)}
              eventHandlers={{ click: () => setSelectedPothole(p) }}
            />
          ))
        )}
      </MapContainer>

      <PotholeDetailSheet
        pothole={selectedPothole}
        open={!!selectedPothole}
        onClose={() => setSelectedPothole(null)}
        onReopen={handleReopen}
        onDelete={handleDelete}
        actionLoading={actionLoading}
      />
    </>
  );
}

import { useState, useMemo } from 'react';
import PotholeMap from '@/components/Map/PotholeMap';
import MapFilters from '@/components/Map/MapFilters';
import ReportDialog from '@/components/Map/ReportDialog';
import UserMenu from '@/components/Auth/UserMenu';
import { usePotholes } from '@/hooks/usePotholes';
import { Severity, Status } from '@/types/pothole';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const [reportOpen, setReportOpen] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showClusters, setShowClusters] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: potholes = [], isLoading } = usePotholes();

  const filteredPotholes = useMemo(() => {
    return potholes.filter((p) => {
      if (!showArchived && p.status === 'archived') return false;
      if (selectedSeverities.length > 0 && !selectedSeverities.includes(p.severity)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status)) return false;
      return true;
    });
  }, [potholes, selectedSeverities, selectedStatuses, showArchived]);

  const handleLocationSelect = (lat: number, lng: number, zoom: number) => {
    setFlyTo({ lat, lng, zoom });
  };

  const handleReportClick = () => {
    setClickMode(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (clickMode) {
      setSelectedLocation({ lat, lng });
      setClickMode(false);
      setReportOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <PotholeMap
        potholes={filteredPotholes}
        onMapClick={handleMapClick}
        clickMode={clickMode}
        flyTo={flyTo}
        currentUserId={user?.id}
        showClusters={showClusters}
      />

      <MapFilters
        selectedSeverities={selectedSeverities}
        selectedStatuses={selectedStatuses}
        searchQuery={searchQuery}
        showArchived={showArchived}
        showClusters={showClusters}
        onSeveritiesChange={setSelectedSeverities}
        onStatusesChange={setSelectedStatuses}
        onSearchChange={setSearchQuery}
        onLocationSelect={handleLocationSelect}
        onShowArchivedChange={setShowArchived}
        onShowClustersChange={setShowClusters}
      />

      {/* User menu + stats link */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/stats')}
          className="bg-background/95 backdrop-blur shadow-lg gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Estatísticas
        </Button>
        <UserMenu />
      </div>

      {/* Report button */}
      <div className="absolute bottom-6 right-6 z-10">
        {clickMode ? (
          <div className="flex flex-col items-end gap-2">
            <div className="bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse">
              Clique no mapa para marcar o buraco
            </div>
            <Button
              variant="outline"
              onClick={() => setClickMode(false)}
              className="shadow-lg"
            >
              Cancelar
            </Button>
          </div>
        ) : !reportOpen ? (
          <Button
            size="lg"
            onClick={handleReportClick}
            className="shadow-xl text-base gap-2 px-6 py-6 rounded-full"
          >
            <Plus className="h-5 w-5" />
            Reportar Buraco
          </Button>
        ) : null}
      </div>

      {/* Stats bar */}
      <div className="absolute bottom-6 left-4 z-10 bg-background/95 backdrop-blur rounded-lg shadow-lg px-4 py-2 flex gap-4 text-sm">
        {isLoading ? (
          <span className="text-muted-foreground">A carregar...</span>
        ) : (
          <>
            <span className="font-semibold">{filteredPotholes.length} buracos</span>
            <span className="text-severity-high font-medium">
              {filteredPotholes.filter((p) => p.severity === 'high').length} graves
            </span>
            <span className="text-status-repaired font-medium">
              {filteredPotholes.filter((p) => p.status === 'repaired').length} reparados
            </span>
          </>
        )}
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setSelectedLocation(null);
        }}
        selectedLocation={selectedLocation}
      />
    </div>
  );
};

export default Index;

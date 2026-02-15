import { Severity, Status, SEVERITY_LABELS, STATUS_LABELS } from '@/types/pothole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X, MapPin, Loader2, Archive } from 'lucide-react';
import { useState, useRef } from 'react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GeocodingResult } from '@/lib/geocoding';

interface MapFiltersProps {
  selectedSeverities: Severity[];
  selectedStatuses: Status[];
  searchQuery: string;
  showArchived: boolean;
  showClusters: boolean;
  onSeveritiesChange: (s: Severity[]) => void;
  onStatusesChange: (s: Status[]) => void;
  onSearchChange: (q: string) => void;
  onLocationSelect?: (lat: number, lng: number, zoom: number) => void;
  onShowArchivedChange: (show: boolean) => void;
  onShowClustersChange: (show: boolean) => void;
}

const severityColorClasses: Record<Severity, string> = {
  low: 'bg-severity-low',
  moderate: 'bg-severity-moderate',
  high: 'bg-severity-high',
};

const statusColorClasses: Record<Status, string> = {
  reported: 'bg-status-reported',
  repairing: 'bg-status-repairing',
  repaired: 'bg-status-repaired',
  archived: 'bg-muted-foreground',
};

export default function MapFilters({
  selectedSeverities,
  selectedStatuses,
  searchQuery,
  showArchived,
  showClusters,
  onSeveritiesChange,
  onStatusesChange,
  onSearchChange,
  onLocationSelect,
  onShowArchivedChange,
  onShowClustersChange,
}: MapFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { results, isLoading } = useGeocoding(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSeverity = (s: Severity) => {
    onSeveritiesChange(
      selectedSeverities.includes(s)
        ? selectedSeverities.filter((x) => x !== s)
        : [...selectedSeverities, s]
    );
  };

  const toggleStatus = (s: Status) => {
    onStatusesChange(
      selectedStatuses.includes(s)
        ? selectedStatuses.filter((x) => x !== s)
        : [...selectedStatuses, s]
    );
  };

  const handleSelectResult = (result: GeocodingResult) => {
    onSearchChange(result.display_name);
    setShowSuggestions(false);
    onLocationSelect?.(result.lat, result.lng, result.zoom);
  };

  const hasFilters = selectedSeverities.length > 0 || selectedStatuses.length > 0 || searchQuery || showArchived;

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-xs">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          <Input
            ref={inputRef}
            placeholder="Pesquisar localização..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-9 bg-background/95 backdrop-blur shadow-lg"
          />
          {showSuggestions && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background/95 backdrop-blur rounded-lg shadow-lg border overflow-hidden">
              {results.map((r, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 transition-colors"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectResult(r)}
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant={isOpen ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className="shadow-lg bg-background/95 backdrop-blur"
        >
          <Filter className="h-4 w-4" />
        </Button>
        {hasFilters && (
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              onSeveritiesChange([]);
              onStatusesChange([]);
              onSearchChange('');
              onShowArchivedChange(false);
            }}
            className="shadow-lg bg-background/95 backdrop-blur"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Severidade</p>
            <div className="flex gap-2">
              {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSeverity(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedSeverities.includes(s)
                      ? 'text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {selectedSeverities.includes(s) && (
                    <span className={`w-2 h-2 rounded-full ${severityColorClasses[s]}`} />
                  )}
                  <span
                    className={selectedSeverities.includes(s) ? severityColorClasses[s] + ' px-2 py-0.5 rounded-full text-white' : ''}
                  >
                    {SEVERITY_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Estado</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as Status[]).filter(s => s !== 'archived').map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedStatuses.includes(s)
                      ? statusColorClasses[s] + ' text-white shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={onShowArchivedChange}
            />
            <Label htmlFor="show-archived" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <Archive className="h-3.5 w-3.5" />
              Mostrar arquivados
            </Label>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="show-clusters"
              checked={showClusters}
              onCheckedChange={onShowClustersChange}
            />
            <Label htmlFor="show-clusters" className="text-xs cursor-pointer">
              Ativar clusters
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}

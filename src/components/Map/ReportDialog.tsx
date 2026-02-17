import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Severity, SEVERITY_LABELS } from '@/types/pothole';
import { MapPin, Camera, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageUtils';
import { reverseGeocodeWithFallback } from '@/lib/geocoding';
import { apiRequest } from '@/lib/api';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

const severityOptions: { value: Severity; color: string }[] = [
  { value: 'low', color: 'bg-severity-low' },
  { value: 'moderate', color: 'bg-severity-moderate' },
  { value: 'high', color: 'bg-severity-high' },
];

export default function ReportDialog({ open, onClose, selectedLocation }: ReportDialogProps) {
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resetForm = () => {
    setSeverity('moderate');
    setAddress('');
    setDescription('');
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;

    setSubmitting(true);
    try {
      const typedAddress = address.trim();

      const geocoded = await reverseGeocodeWithFallback(selectedLocation.lat, selectedLocation.lng);
      if (!geocoded) {
        toast({
          title: 'Localização inválida',
          description: 'Só é possível reportar buracos em Portugal (continente e ilhas).',
          variant: 'destructive',
        });
        return;
      }

      if (!geocoded.municipality) {
        toast({
          title: 'Concelho não encontrado',
          description: 'Não foi possível determinar o concelho desta localização. Tente outro ponto no mapa.',
          variant: 'destructive',
        });
        return;
      }

      const resolvedAddress = typedAddress || geocoded.address;
      const normalizedAddress = geocoded.normalized_address;
      const parish = geocoded.parish;
      const municipality = geocoded.municipality;
      const district = geocoded.district;
      const postalCode = geocoded.postal_code;
      const geocodeStatus: 'resolved' = 'resolved';

      const form = new FormData();
      form.append('lat', String(selectedLocation.lat));
      form.append('lng', String(selectedLocation.lng));
      form.append('severity', severity);
      form.append('address', resolvedAddress || '');
      form.append('normalized_address', normalizedAddress || '');
      form.append('parish', parish || '');
      form.append('municipality', municipality || '');
      form.append('district', district || '');
      form.append('postal_code', postalCode || '');
      form.append('geocode_status', geocodeStatus);
      form.append('description', description || '');
      form.append('user_id', user?.id ?? '');

      if (photoFile) {
        const compressed = await compressImage(photoFile);
        form.append('photo', compressed, `${crypto.randomUUID()}.jpg`);
      }

      await apiRequest('/api/potholes', {
        method: 'POST',
        body: form,
      });

      queryClient.invalidateQueries({ queryKey: ['potholes'] });
      toast({ title: 'Buraco reportado!', description: 'Obrigado por contribuir.' });
      resetForm();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reportar buraco.';
      toast({ title: 'Erro ao reportar', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-severity-high" />
            Reportar Buraco
          </DialogTitle>
          <DialogDescription>
            Ajude a comunidade a identificar buracos nas estradas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Localização *</Label>
            {selectedLocation ? (
              <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                </span>
              </div>
            ) : (
              <Input
                placeholder="Morada ou clique no mapa"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required={!selectedLocation}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Morada (opcional)</Label>
            <Input
              placeholder="Ex: Rua Augusta, Lisboa"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Severidade *</Label>
            <div className="flex gap-2">
              {severityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border-2 ${
                    severity === opt.value
                      ? `${opt.color} text-white border-transparent shadow-md`
                      : 'bg-background border-border text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  {SEVERITY_LABELS[opt.value]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Descreva o buraco, tamanho, perigo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto (opcional)</Label>
            <label className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {photoFile ? photoFile.name : 'Clique para adicionar foto'}
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reportar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { usePotholes } from '@/hooks/usePotholes';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, ThumbsUp, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { SEVERITY_LABELS, STATUS_LABELS, Pothole } from '@/types/pothole';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PotholeDetailSheet from '@/components/Map/PotholeDetailSheet';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const SEVERITY_COLORS = {
  low: 'hsl(45, 93%, 47%)',
  moderate: 'hsl(25, 95%, 53%)',
  high: 'hsl(0, 84%, 50%)',
};

const STATUS_COLORS: Record<string, string> = {
  reported: 'hsl(220, 70%, 45%)',
  repairing: 'hsl(25, 95%, 53%)',
  repaired: 'hsl(142, 71%, 45%)',
  archived: 'hsl(0, 0%, 53%)',
};

function extractDistrict(pothole: Pothole): string {
  if (pothole.district) return pothole.district;
  if (pothole.municipality) return pothole.municipality;
  if (pothole.address) {
    const parts = pothole.address.split(',').map((s) => s.trim());
    return parts[parts.length - 1] || 'Desconhecido';
  }
  return 'Desconhecido';
}

export default function Stats() {
  const { data: potholes = [], isLoading } = usePotholes();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const severityData = useMemo(() => {
    const counts = { low: 0, moderate: 0, high: 0 };
    potholes.forEach((p) => counts[p.severity]++);
    return Object.entries(counts).map(([key, value]) => ({
      name: SEVERITY_LABELS[key as keyof typeof SEVERITY_LABELS],
      value,
      fill: SEVERITY_COLORS[key as keyof typeof SEVERITY_COLORS],
    }));
  }, [potholes]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { reported: 0, repairing: 0, repaired: 0, archived: 0 };
    potholes.forEach((p) => counts[p.status]++);
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABELS[key as keyof typeof STATUS_LABELS],
      value,
      fill: STATUS_COLORS[key as keyof typeof STATUS_COLORS],
    }));
  }, [potholes]);

  const districtData = useMemo(() => {
    const map: Record<string, number> = {};
    potholes.forEach((p) => {
      const d = extractDistrict(p);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [potholes]);

  const topVoted = useMemo(() => {
    return [...potholes].sort((a, b) => b.votes - a.votes).slice(0, 5);
  }, [potholes]);

  const handleReopen = async (pothole: Pothole) => {
    setActionLoading(pothole.id);
    try {
      const { error } = await supabase
        .from('potholes')
        .update({
          status: 'reported' as any,
          repaired_at: null,
          reopen_count: (pothole.reopen_count ?? 0) + 1,
        })
        .eq('id', pothole.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
      toast({ title: 'Buraco reaberto', description: 'O estado foi alterado para "Reportado".' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (pothole: Pothole) => {
    setActionLoading(pothole.id);
    try {
      await supabase.from('votes').delete().eq('pothole_id', pothole.id);
      await supabase.from('comments').delete().eq('pothole_id', pothole.id);
      const { error } = await supabase.from('potholes').delete().eq('id', pothole.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['potholes'] });
      setSelectedPothole(null);
      toast({ title: 'Buraco eliminado', description: 'O reporte foi removido.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">A carregar estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Estatísticas</h1>
            <p className="text-sm text-muted-foreground">Visão geral dos buracos reportados em Portugal</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <MapPin className="h-4 w-4" />
                Total
              </div>
              <p className="text-3xl font-bold">{potholes.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-severity-high text-sm mb-1">
                <AlertTriangle className="h-4 w-4" />
                Graves
              </div>
              <p className="text-3xl font-bold">{potholes.filter((p) => p.severity === 'high').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-status-repairing text-sm mb-1">
                <Clock className="h-4 w-4" />
                Em reparação
              </div>
              <p className="text-3xl font-bold">{potholes.filter((p) => p.status === 'repairing').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-status-repaired text-sm mb-1">
                <CheckCircle className="h-4 w-4" />
                Reparados
              </div>
              <p className="text-3xl font-bold">{potholes.filter((p) => p.status === 'repaired').length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Severity pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Severidade</CardTitle>
            </CardHeader>
            <CardContent>
              {potholes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {severityData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* Status pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {potholes.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* District bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Localizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {districtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={districtData} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(220, 70%, 45%)" radius={[0, 4, 4, 0]} name="Buracos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Top voted */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Top Buracos Mais Votados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topVoted.length > 0 ? (
              <div className="space-y-3">
                {topVoted.map((p, i) => (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPothole(p)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge
                          className="text-xs text-white"
                          style={{ backgroundColor: SEVERITY_COLORS[p.severity] }}
                        >
                          {SEVERITY_LABELS[p.severity]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: STATUS_COLORS[p.status], color: STATUS_COLORS[p.status] }}
                        >
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <ThumbsUp className="h-4 w-4" />
                      {p.votes}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </main>

      <PotholeDetailSheet
        pothole={selectedPothole}
        open={!!selectedPothole}
        onClose={() => setSelectedPothole(null)}
        onReopen={handleReopen}
        onDelete={handleDelete}
        actionLoading={actionLoading}
      />
    </div>
  );
}

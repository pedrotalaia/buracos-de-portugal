import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Pothole, SEVERITY_LABELS, STATUS_LABELS } from '@/types/pothole';
import { useAuth } from '@/contexts/AuthContext';
import { useVotes } from '@/hooks/useVotes';
import { useComments } from '@/hooks/useComments';
import {
  ThumbsUp,
  MessageCircle,
  MapPin,
  RotateCcw,
  Wrench,
  Trash2,
  Loader2,
  Send,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { apiRequest } from '@/lib/api';

const severityColors: Record<string, string> = {
  low: 'hsl(var(--severity-low))',
  moderate: 'hsl(var(--severity-moderate))',
  high: 'hsl(var(--severity-high))',
};

const statusColors: Record<string, string> = {
  reported: 'hsl(var(--status-reported))',
  repairing: 'hsl(var(--status-repairing))',
  repaired: 'hsl(var(--status-repaired))',
  archived: 'hsl(215 15% 50%)',
};

interface PotholeDetailSheetProps {
  pothole: Pothole | null;
  open: boolean;
  onClose: () => void;
  onSetRepairing: (pothole: Pothole) => void;
  onResolve: (pothole: Pothole) => void;
  onReopen: (pothole: Pothole) => void;
  onDelete: (pothole: Pothole) => void;
  actionLoading: string | null;
}

export default function PotholeDetailSheet({
  pothole,
  open,
  onClose,
  onSetRepairing,
  onResolve,
  onReopen,
  onDelete,
  actionLoading,
}: PotholeDetailSheetProps) {
  const { user } = useAuth();
  const [reporterName, setReporterName] = useState<string | null>(null);

  // Fetch reporter profile when pothole changes
  useEffect(() => {
    if (!pothole?.user_id) {
      setReporterName('Anônimo');
      return;
    }
    
    const fetchReporter = async () => {
      try {
        const profile = await apiRequest<{ id: string; display_name: string | null }>(`/api/profiles/${pothole.user_id}`);
        setReporterName(profile.display_name || 'Usuário');
      } catch {
        setReporterName('Usuário');
      }
    };
    
    fetchReporter();
  }, [pothole?.user_id]);

  if (!pothole) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="truncate">{pothole.address || 'Localização no mapa'}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Photo */}
          {pothole.photo_url && (
            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border">
              <img
                src={pothole.photo_url}
                alt="Foto do buraco"
                className="h-full w-full object-cover"
              />
            </AspectRatio>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="text-white" style={{ backgroundColor: severityColors[pothole.severity] }}>
              {SEVERITY_LABELS[pothole.severity]}
            </Badge>
            <Badge
              variant="outline"
              style={{ borderColor: statusColors[pothole.status], color: statusColors[pothole.status] }}
            >
              {STATUS_LABELS[pothole.status]}
            </Badge>
            {(pothole.reopen_count ?? 0) > 0 && (
              <Badge variant="secondary">Reaberto {pothole.reopen_count}x</Badge>
            )}
          </div>

          {/* Description */}
          {pothole.description && (
            <p className="text-sm text-muted-foreground">{pothole.description}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(pothole.created_at), { addSuffix: true, locale: pt })}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {reporterName || 'A carregar...'}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> {pothole.comments_count}
            </span>
          </div>

          {/* Vote section */}
          <VoteSection pothole={pothole} userId={user?.id} />

          {/* Action buttons */}
          <div className="flex gap-2">
            {pothole.status === 'reported' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => onSetRepairing(pothole)}
                disabled={actionLoading === pothole.id}
              >
                {actionLoading === pothole.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                Em reparação
              </Button>
            )}
            {(pothole.status === 'reported' || pothole.status === 'repairing') && (
              <Button
                size="sm"
                className="flex-1 gap-1"
                onClick={() => onResolve(pothole)}
                disabled={!user || actionLoading === pothole.id}
                title={!user ? 'Inicie sessão para marcar como reparado' : undefined}
              >
                {actionLoading === pothole.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
                Marcar reparado
              </Button>
            )}
            {(pothole.status === 'repaired' || pothole.status === 'archived') && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => onReopen(pothole)}
                disabled={actionLoading === pothole.id}
              >
                {actionLoading === pothole.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Reabrir
              </Button>
            )}
            {user && pothole.user_id === user.id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1" disabled={actionLoading === pothole.id}>
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar buraco?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. O reporte e todos os votos e comentários associados serão eliminados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(pothole)}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Comments section */}
          <CommentsSection pothole={pothole} user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VoteSection({ pothole, userId }: { pothole: Pothole; userId?: string }) {
  const { hasVoted, toggleVote, isVoting } = useVotes(pothole.id, userId);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Button
        size="sm"
        variant={hasVoted ? 'default' : 'outline'}
        className="gap-2"
        onClick={() => toggleVote()}
        disabled={isVoting}
      >
        {isVoting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className={`h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
        )}
        {hasVoted ? 'Votado' : 'Confirmar'}
      </Button>
      <span className="text-sm text-muted-foreground">
        <strong className="text-foreground">{pothole.votes}</strong> confirmações
      </span>
    </div>
  );
}

function CommentsSection({ pothole, user }: { pothole: Pothole; user: any }) {
  const { comments, isLoading, addComment, isAdding } = useComments(pothole.id);
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    addComment(
      { content: text.trim(), userId: user.id },
      { onSuccess: () => setText('') }
    );
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <MessageCircle className="h-4 w-4" /> Comentários
      </h4>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-muted p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{c.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: pt })}
                </span>
              </div>
              <p className="text-sm">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            placeholder="Escreva um comentário..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="flex-1 min-h-[60px]"
          />
          <Button type="submit" size="icon" disabled={isAdding || !text.trim()} className="self-end">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Inicie sessão para comentar.
        </p>
      )}
    </div>
  );
}

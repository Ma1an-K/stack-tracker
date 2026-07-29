import { ActionError, PlayerClaimRequestWithDetails } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ClaimRequestsCardProps {
  requests: PlayerClaimRequestWithDetails[];
  loading: boolean;
  onApprove: (requestId: string, playerId: string, userId: string) => Promise<{ error: ActionError }>;
  onReject: (requestId: string) => Promise<{ error: ActionError }>;
}

export function ClaimRequestsCard({
  requests,
  loading,
  onApprove,
  onReject,
}: ClaimRequestsCardProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (request: PlayerClaimRequestWithDetails) => {
    setProcessingId(request.id);
    await onApprove(request.id, request.player_id, request.user_id);
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    await onReject(requestId);
    setProcessingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <span className="section-header">Pending Claims</span>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="section-header text-primary">
            Pending Player Claims ({requests.length})
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/50">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between py-3 gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {request.profile.display_name || request.profile.username}
                  <span className="text-muted-foreground text-xs ml-1">
                    #{request.profile.discriminator}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  wants to claim <span className="font-medium text-foreground">{request.player.name}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => handleApprove(request)}
                  disabled={processingId === request.id}
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

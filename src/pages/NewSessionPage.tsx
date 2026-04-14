import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useSessions } from '@/hooks/useSessions';
import { SessionForm } from '@/components/sessions/SessionForm';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function NewSessionPage() {
  const navigate = useNavigate();
  const { homegame, isOwner } = useAuthContext();
  const { activePlayers, loading: playersLoading, addPlayer } = usePlayers(homegame?.id);
  const { createSession } = useSessions(homegame?.id, homegame?.name);

  const handleSubmit = async (
    date: string,
    players: { player_id: string; buy_in: number; cash_out: number }[],
    notes?: string
  ) => {
    const result = await createSession(date, players, notes);
    if (!result.error) {
      navigate('/');
    }
    return result;
  };

  if (activePlayers.length < 2 && !playersLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">New Session</h1>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              You need at least 2 active players to create a session.
            </p>
            {isOwner ? (
              <Button asChild>
                <Link to="/players">Add Players</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ask the homegame owner to add players.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <PlusCircle className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">New Session</h1>
      </div>

      <SessionForm
        players={activePlayers}
        onSubmit={handleSubmit}
        onAddPlayer={isOwner ? addPlayer : undefined}
      />
    </div>
  );
}

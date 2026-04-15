import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTutorialContext } from '@/contexts/TutorialContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface HomegameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'create' | 'join';
}

export function HomegameDialog({ open, onOpenChange, defaultTab = 'create' }: HomegameDialogProps) {
  const { createHomegame, joinHomegame } = useAuthContext();
  const { startTour } = useTutorialContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newHomegameName, setNewHomegameName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateHomegame = async () => {
    if (!newHomegameName.trim()) {
      toast({ title: 'Error', description: 'Please enter a homegame name', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await createHomegame(newHomegameName);
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message || 'Failed to create homegame', variant: 'destructive' });
    } else {
      toast({ title: 'Homegame created' });
      setNewHomegameName('');
      onOpenChange(false);
      startTour('owner');
    }
  };

  const handleJoinHomegame = async () => {
    if (!inviteCode.trim()) {
      toast({ title: 'Error', description: 'Please enter an invite code', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await joinHomegame(inviteCode);
    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message || 'Failed to join homegame', variant: 'destructive' });
    } else {
      toast({ title: 'Joined homegame successfully' });
      setInviteCode('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Homegame</DialogTitle>
          <DialogDescription>
            Create a new homegame or join an existing one with an invite code.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New</TabsTrigger>
            <TabsTrigger value="join">Join Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="homegame-name">Homegame Name</Label>
              <Input
                id="homegame-name"
                placeholder="e.g., Friday Night Poker"
                value={newHomegameName}
                onChange={(e) => setNewHomegameName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateHomegame()}
              />
            </div>
            <Button 
              onClick={handleCreateHomegame} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Homegame
            </Button>
          </TabsContent>

          <TabsContent value="join" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="e.g., ABCD1234"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinHomegame()}
                className="font-mono tracking-wider"
              />
            </div>
            <Button 
              onClick={handleJoinHomegame} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Homegame
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

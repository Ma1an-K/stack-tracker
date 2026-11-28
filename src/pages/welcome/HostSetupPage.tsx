import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Loader2, Plus, Share2, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlayers } from '@/hooks/usePlayers';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { validateNames } from '@/lib/oneOff/localStore';
import { markInviteShared, pickInviteCode } from '@/lib/onboarding/ensureInviteCode';
import { publicOrigin } from '@/lib/platform';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4;
type CrewRow = { key: string; name: string; you: boolean };

const STEPS = 4;
const TITLES: Record<Step, string> = { 1: 'Name your game', 2: 'Who plays?', 3: 'Bring them in', 4: 'Log your first game' };

/** Why the crew can't continue yet, or null when it can. */
function crewProblem(names: string[]): string | null {
  if (names.length < 2) return 'Add at least 2 players';
  return validateNames(names);
}

/** "Sam", "Sam and Dan", "Sam, Dan and Maya". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function Progress({ step }: { step: Step }) {
  return (
    <div
      role="progressbar"
      aria-label="Setup progress"
      aria-valuemin={1}
      aria-valuemax={STEPS}
      aria-valuenow={step}
      className="flex gap-1.5"
    >
      {Array.from({ length: STEPS }, (_, i) => (
        <span key={i} className={cn('h-[3px] flex-1 rounded-full', i < step ? 'bg-gold' : 'bg-secondary')} />
      ))}
    </div>
  );
}

/** Guided host setup at /welcome/host: name the game, add the crew, invite them, log the first game. */
export function HostSetupPage() {
  const navigate = useNavigate();
  const { user, profile, homegame, homegames, createHomegame, selectHomegame, updateHomegame } = useAuthContext();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [gameName, setGameName] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Step 2
  const [crew, setCrew] = useState<CrewRow[]>(() => [
    { key: 'you', name: profile?.display_name || profile?.username || '', you: true },
  ]);
  const [draft, setDraft] = useState('');
  const [savingCrew, setSavingCrew] = useState(false);
  const savedNames = useRef(new Set<string>());
  const nextKey = useRef(1);

  // Step 3
  const { addPlayer } = usePlayers(createdId ?? undefined);
  const { activeInviteCodes, loading: codesLoading, createInviteCode } = useInviteCodes(createdId ?? undefined);
  const [newCode, setNewCode] = useState<string | null>(null);
  const creatingCode = useRef(false);
  const inviteCode = pickInviteCode(activeInviteCodes)?.code ?? newCode;

  // createHomegame refetches the user's homegames; make sure the new one is the current one.
  useEffect(() => {
    if (createdId && homegame?.id !== createdId && homegames.some((h) => h.id === createdId)) {
      selectHomegame(createdId);
    }
  }, [createdId, homegame?.id, homegames, selectHomegame]);

  // Step 3 shows the newest working code, or makes one with the usual defaults.
  useEffect(() => {
    if (step !== 3 || !createdId || codesLoading || inviteCode || creatingCode.current) return;
    creatingCode.current = true;
    createInviteCode().then((res) => {
      const created = (res as { code?: { code: string } }).code;
      if (created) setNewCode(created.code);
      else creatingCode.current = false;
    });
  }, [step, createdId, codesLoading, inviteCode, createInviteCode]);

  const back = () => (step === 1 ? navigate('/welcome') : setStep((s) => (s - 1) as Step));

  const submitName = async (e: FormEvent) => {
    e.preventDefault();
    const name = gameName.trim();
    if (!name) return;
    setNameError(null);
    setSavingName(true);
    if (!createdId) {
      const { error, homegame: created } = await createHomegame(name);
      setSavingName(false);
      if (error || !created) {
        setNameError(error instanceof Error ? error.message : 'Could not create your game. Try again.');
        return;
      }
      setCreatedId(created.id);
      setCreatedName(name);
    } else if (name !== createdName && homegame?.id === createdId) {
      // Came back to rename it.
      const { error } = await updateHomegame({ name });
      setSavingName(false);
      if (error) {
        setNameError('Could not rename your game. Try again.');
        return;
      }
      setCreatedName(name);
    } else {
      setSavingName(false);
    }
    setStep(2);
  };

  const names = [...crew.map((r) => r.name), ...(draft.trim() ? [draft] : [])];
  const problem = crewProblem(names);

  const addDraft = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    setCrew((rows) => [...rows, { key: `p${nextKey.current++}`, name: draft, you: false }]);
    setDraft('');
  };

  const saveCrew = async () => {
    if (problem) return;
    const rows = [...crew, ...(draft.trim() ? [{ key: `p${nextKey.current++}`, name: draft, you: false }] : [])];
    setCrew(rows);
    setDraft('');
    setSavingCrew(true);
    for (const row of rows) {
      const name = row.name.trim();
      const id = name.toLowerCase();
      if (savedNames.current.has(id)) continue;
      const { error } = await addPlayer(name, { quiet: true, ...(row.you && user ? { linkUserId: user.id } : {}) });
      if (error) {
        // addPlayer has already shown a toast.
        setSavingCrew(false);
        return;
      }
      savedNames.current.add(id);
    }
    setSavingCrew(false);
    setStep(3);
  };

  const inviteLink = inviteCode ? `${publicOrigin()}/auth?mode=signup&code=${encodeURIComponent(inviteCode)}` : '';

  const copyLink = async () => {
    if (!inviteCode || !createdId) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      markInviteShared(createdId);
      toast({ title: 'Link copied', description: 'Paste it into your group chat.' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const shareLink = async () => {
    if (!inviteCode || !createdId) return;
    if (!navigator.share) return copyLink();
    const text = `Join ${createdName || 'our homegame'} on Stack Tracker: ${inviteLink} (invite code ${inviteCode}).`;
    try {
      await navigator.share({ title: 'Stack Tracker invite', text });
      markInviteShared(createdId);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') await copyLink();
    }
  };

  const top = (
    <div className="mb-8 flex flex-col gap-3">
      <button
        type="button"
        onClick={back}
        className="-ml-2 flex min-h-11 items-center gap-1 self-start rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>
      <Progress step={step} />
    </div>
  );

  return (
    <AuthScreen top={top} eyebrow={`Step ${step} of ${STEPS}`} headline={TITLES[step]}>
      {step === 1 && (
        <form onSubmit={submitName} className="flex flex-1 flex-col">
          <p className="mb-6 text-sm text-muted-foreground">This is what your crew sees when they join.</p>
          <div className="space-y-2">
            <Label htmlFor="game-name">Game name</Label>
            <Input
              id="game-name"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Friday Night Game"
              maxLength={50}
              autoComplete="off"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'game-name-error' : undefined}
              className="h-12"
            />
            {nameError && (
              <p id="game-name-error" role="alert" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
          </div>
          <div className="mt-auto pt-8">
            <Button type="submit" size="lg" className="w-full" disabled={!gameName.trim() || savingName}>
              {savingName && <Loader2 className="animate-spin" />}
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col">
          <p className="mb-6 text-sm text-muted-foreground">Add the regulars. They can link their own accounts later.</p>
          <ul className="grid gap-2">
            {crew.map((row, i) => (
              <li key={row.key} className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card py-1 pl-2.5 pr-1">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                  {row.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => setCrew((rows) => rows.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))}
                  aria-label={`Player ${i + 1}`}
                  maxLength={50}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent py-2 text-base text-foreground outline-none"
                />
                {row.you && (
                  <span className="rounded-md border border-gold/40 px-1.5 text-[0.6875rem] text-gold">You</span>
                )}
                <button
                  type="button"
                  onClick={() => setCrew((rows) => rows.filter((r) => r.key !== row.key))}
                  aria-label={`Remove ${row.name.trim() || `player ${i + 1}`}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
            <li>
              <form onSubmit={addDraft} className="flex min-h-12 items-center gap-2.5 rounded-xl border border-dashed border-border bg-card/60 py-1 pl-2.5 pr-1">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <Plus className="h-4 w-4" />
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a name"
                  aria-label="Add a name"
                  maxLength={50}
                  autoComplete="off"
                  enterKeyHint="done"
                  className="min-w-0 flex-1 bg-transparent py-2 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  aria-label="Add player"
                  disabled={!draft.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gold disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </form>
            </li>
          </ul>
          <p aria-live="polite" className={cn('mt-3 text-sm', problem ? 'text-muted-foreground' : 'text-gold')}>
            {problem ?? `${names.length} players · ready for a first game`}
          </p>
          <div className="mt-auto pt-8">
            <Button size="lg" className="w-full" onClick={saveCrew} disabled={!!problem || savingCrew}>
              {savingCrew && <Loader2 className="animate-spin" />}
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col">
          <p className="mb-6 text-sm text-muted-foreground">Friends who join can see standings and claim their name.</p>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Invite code</p>
            {inviteCode ? (
              <code className="mt-1 block font-display text-[2rem] font-semibold leading-tight tracking-[0.18em] text-gold">{inviteCode}</code>
            ) : (
              <Loader2 className="my-3 h-6 w-6 animate-spin text-muted-foreground" aria-label="Making your invite code" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={copyLink} disabled={!inviteCode}>
                <Copy />
                Copy link
              </Button>
              <Button variant="secondary" onClick={shareLink} disabled={!inviteCode}>
                <Share2 />
                Share…
              </Button>
            </div>
          </div>
          <div className="mt-auto grid gap-1 pt-8">
            <Button size="lg" className="w-full" onClick={() => setStep(4)}>
              Done
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(4)}>
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col">
          <p className="mb-6 text-sm text-muted-foreground">
            {listNames(crew.map((r) => r.name.trim()))} {crew.length === 1 ? 'is' : 'are'} seated. Playing now, or catching up on one you already played?
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => navigate('/live-session?seat=all')}
              className="pressable gold-fill rounded-2xl p-[18px] text-left text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[1.0625rem] font-semibold">Play live</span>
              <span className="text-[0.8125rem] opacity-80">Track buy-ins and rebuys as you go</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/new-session?seat=all')}
              className="pressable rounded-2xl border border-border bg-card p-[18px] text-left hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[1.0625rem] font-semibold text-foreground">Enter final totals</span>
              <span className="text-[0.8125rem] text-muted-foreground">The game's done, just add the numbers</span>
            </button>
          </div>
          <div className="mt-auto pt-8">
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/')}>
              I'll do this later
            </Button>
          </div>
        </div>
      )}
    </AuthScreen>
  );
}

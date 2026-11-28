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
import { validateNames } from '@/lib/oneOff/localStore';
import { pickInviteCode } from '@/lib/onboarding/ensureInviteCode';
import { copyInviteLink, shareInvite } from '@/lib/onboarding/shareInvite';
import { cn } from '@/lib/utils';
import type { HomegameWithRole } from '@/types/database';

type Step = 1 | 2 | 3 | 4;
type CrewRow = { key: string; name: string; you: boolean };

// Progress survives a reload, so a reload after step 1 never creates a second homegame.
const PROGRESS_KEY = 'host_setup';
type Progress = { homegameId: string; step: Step };

function readProgress(homegames: HomegameWithRole[]): (Progress & { name: string }) | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Progress>;
    const game = homegames.find((h) => h.id === saved.homegameId && h.role === 'owner');
    if (!game) {
      sessionStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    // The homegame exists, so never resume at naming it.
    const step = Math.min(4, Math.max(2, Number(saved.step) || 2)) as Step;
    return { homegameId: game.id, step, name: game.name };
  } catch {
    return null;
  }
}

function writeProgress(progress: Progress | null) {
  try {
    if (progress) sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    else sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* storage unavailable: a reload just starts over */
  }
}

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

function ProgressBar({ step }: { step: Step }) {
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
  const [resumed] = useState(() => readProgress(homegames));
  const [step, setStep] = useState<Step>(resumed?.step ?? 1);

  // Step 1
  const [gameName, setGameName] = useState(resumed?.name ?? '');
  const [createdId, setCreatedId] = useState<string | null>(resumed?.homegameId ?? null);
  const [createdName, setCreatedName] = useState(resumed?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Step 2
  const youRow = (): CrewRow => ({ key: 'you', name: profile?.display_name || profile?.username || '', you: true });
  // Rows not saved yet. A resumed flow waits for the saved players before offering "You".
  const [crew, setCrew] = useState<CrewRow[]>(() => (resumed ? [] : [youRow()]));
  const [draft, setDraft] = useState('');
  const [savingCrew, setSavingCrew] = useState(false);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const nextKey = useRef(1);
  const offeredYou = useRef(!resumed);
  const { players, loading: playersLoading, addPlayer } = usePlayers(createdId ?? undefined);
  // Saved players, in the order they were added here (the hook sorts by name).
  const rank = (name: string) => {
    const i = savedOrder.indexOf(name);
    return i === -1 ? savedOrder.length : i;
  };
  const saved = [...players].sort((a, b) => rank(a.name) - rank(b.name));

  // Step 3
  const { activeInviteCodes, loading: codesLoading, createInviteCode } = useInviteCodes(createdId ?? undefined);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [codeFailed, setCodeFailed] = useState(false);
  const creatingCode = useRef(false);
  const inviteCode = pickInviteCode(activeInviteCodes)?.code ?? newCode;

  useEffect(() => {
    if (resumed) selectHomegame(resumed.homegameId);
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (createdId) writeProgress({ homegameId: createdId, step });
  }, [createdId, step]);

  useEffect(() => {
    if (offeredYou.current || playersLoading) return;
    offeredYou.current = true;
    if (players.length === 0) setCrew((rows) => (rows.length ? rows : [youRow()]));
    // youRow only reads the profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playersLoading, players.length]);

  // createHomegame refetches the user's homegames; make sure the new one is the current one.
  useEffect(() => {
    if (createdId && homegame?.id !== createdId && homegames.some((h) => h.id === createdId)) {
      selectHomegame(createdId);
    }
  }, [createdId, homegame?.id, homegames, selectHomegame]);

  // Step 3 shows the newest working code, or makes one with the usual defaults.
  // One attempt; after a failure only Retry tries again.
  useEffect(() => {
    if (step !== 3 || !createdId || codesLoading || inviteCode || codeFailed || creatingCode.current) return;
    creatingCode.current = true;
    createInviteCode({ quiet: true }).then((res) => {
      const created = (res as { code?: { code: string } }).code;
      creatingCode.current = false;
      if (created) setNewCode(created.code);
      else setCodeFailed(true);
    });
  }, [step, createdId, codesLoading, inviteCode, codeFailed, createInviteCode]);

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

  const names = [...saved.map((p) => p.name), ...crew.map((r) => r.name), ...(draft.trim() ? [draft] : [])];
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
    for (const [i, row] of rows.entries()) {
      const name = row.name.trim();
      const { error } = await addPlayer(name, { quiet: true, ...(row.you && user ? { linkUserId: user.id } : {}) });
      if (error) {
        // addPlayer has already shown a toast; keep the rows that didn't save.
        setCrew(rows.slice(i));
        setSavingCrew(false);
        return;
      }
      setSavedOrder((order) => [...order, name]);
    }
    setCrew([]);
    setSavingCrew(false);
    setStep(3);
  };

  const finish = (to: string) => {
    writeProgress(null);
    navigate(to);
  };

  const copyLink = () => {
    if (inviteCode && createdId) void copyInviteLink(createdId, inviteCode);
  };

  const shareLink = () => {
    if (inviteCode && createdId) void shareInvite(createdId, createdName, inviteCode);
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
      <ProgressBar step={step} />
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
            {saved.map((p) => (
              <li key={p.id} className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card py-1 pl-2.5 pr-3">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate py-2 text-base text-foreground">{p.name}</span>
                {p.user_id && p.user_id === user?.id && (
                  <span className="rounded-md border border-gold/40 px-1.5 text-[0.6875rem] text-gold">You</span>
                )}
              </li>
            ))}
            {crew.map((row, i) => (
              <li key={row.key} className="flex min-h-12 items-center gap-2.5 rounded-xl border border-border bg-card py-1 pl-2.5 pr-1">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                  {row.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => setCrew((rows) => rows.map((r) => (r.key === row.key ? { ...r, name: e.target.value } : r)))}
                  aria-label={`Player ${saved.length + i + 1}`}
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
                  aria-label={`Remove ${row.name.trim() || `player ${saved.length + i + 1}`}`}
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
          {saved.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Edit names later in Players</p>}
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
            ) : codeFailed ? (
              <div role="alert" className="mt-1 flex min-h-11 items-center justify-between gap-3">
                <p className="text-sm text-destructive">Couldn't make your invite code.</p>
                <Button variant="outline" size="sm" className="min-h-11" onClick={() => setCodeFailed(false)}>
                  Retry
                </Button>
              </div>
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
            {listNames(saved.map((p) => p.name))} {saved.length === 1 ? 'is' : 'are'} seated. Playing now, or catching up on one you already played?
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => finish('/live-session?seat=all')}
              className="pressable gold-fill rounded-2xl p-[18px] text-left text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[1.0625rem] font-semibold">Play live</span>
              <span className="text-[0.8125rem] opacity-80">Track buy-ins and rebuys as you go</span>
            </button>
            <button
              type="button"
              onClick={() => finish('/new-session?seat=all')}
              className="pressable rounded-2xl border border-border bg-card p-[18px] text-left hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block text-[1.0625rem] font-semibold text-foreground">Enter final totals</span>
              <span className="text-[0.8125rem] text-muted-foreground">The game's done, just add the numbers</span>
            </button>
          </div>
          <div className="mt-auto pt-8">
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => finish('/')}>
              I'll do this later
            </Button>
          </div>
        </div>
      )}
    </AuthScreen>
  );
}

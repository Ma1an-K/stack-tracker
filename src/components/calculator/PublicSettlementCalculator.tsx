import { useMemo, useState } from 'react';
import { Plus, Trash2, ArrowRight, Calculator as CalculatorIcon } from 'lucide-react';
import {
  computePublicSettlement,
  SettlementInputPlayer,
} from '@/lib/publicSettlement';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'NZD', symbol: 'NZ$' },
];

function newPlayer(): SettlementInputPlayer {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Math.random()),
    name: '',
    buyIn: 0,
    cashOut: 0,
  };
}

function formatMoney(value: number, symbol: string): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(value).toFixed(2)}`;
}

export function PublicSettlementCalculator() {
  const [players, setPlayers] = useState<SettlementInputPlayer[]>(() => [
    { ...newPlayer(), name: 'Player 1' },
    { ...newPlayer(), name: 'Player 2' },
    { ...newPlayer(), name: 'Player 3' },
  ]);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [submitted, setSubmitted] = useState(false);

  const symbol = CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? '$';

  const result = useMemo(() => computePublicSettlement(players), [players]);
  const showResults = submitted;

  const updatePlayer = (id: string, patch: Partial<SettlementInputPlayer>) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addPlayer = () => {
    setPlayers(prev => [
      ...prev,
      { ...newPlayer(), name: `Player ${prev.length + 1}` },
    ]);
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => (prev.length > 2 ? prev.filter(p => p.id !== id) : prev));
  };

  const reset = () => {
    setPlayers([
      { ...newPlayer(), name: 'Player 1' },
      { ...newPlayer(), name: 'Player 2' },
      { ...newPlayer(), name: 'Player 3' },
    ]);
    setSubmitted(false);
  };

  const imbalanceWarning =
    Math.abs(result.imbalance) > 0.01
      ? `Buy-ins (${formatMoney(result.totalBuyIn, symbol)}) and cash-outs (${formatMoney(
          result.totalCashOut,
          symbol,
        )}) don't match — off by ${formatMoney(Math.abs(result.imbalance), symbol)}.`
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[rgba(200,155,60,0.18)] bg-card/40 backdrop-blur-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Players</h2>
            <p className="text-sm text-muted-foreground">
              Enter every player's total buy-in and final cash-out.
            </p>
          </div>
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            Currency
            <select
              value={currencyCode}
              onChange={e => setCurrencyCode(e.target.value)}
              className="bg-background border border-[rgba(200,155,60,0.25)] rounded-md px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          {/* Header row (sm and up) */}
          <div className="hidden sm:grid grid-cols-[1fr_120px_120px_40px] gap-3 px-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span>Name</span>
            <span className="text-right">Buy-in</span>
            <span className="text-right">Cash-out</span>
            <span />
          </div>

          {players.map((p, idx) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_40px] gap-2 sm:gap-3 sm:items-center p-3 rounded-lg bg-background/60 border border-[rgba(200,155,60,0.12)]"
            >
              <input
                type="text"
                value={p.name}
                onChange={e => updatePlayer(p.id, { name: e.target.value })}
                placeholder={`Player ${idx + 1}`}
                aria-label={`Player ${idx + 1} name`}
                className="bg-transparent border border-transparent focus:border-[rgba(200,155,60,0.35)] focus:outline-none rounded-md px-2 py-2 text-base sm:text-sm"
              />
              <div className="grid grid-cols-2 sm:contents gap-2">
                <label className="sm:hidden text-xs text-muted-foreground self-center">Buy-in</label>
                <NumberField
                  value={p.buyIn}
                  symbol={symbol}
                  onChange={v => updatePlayer(p.id, { buyIn: v })}
                  ariaLabel={`${p.name || `Player ${idx + 1}`} buy-in`}
                />
                <label className="sm:hidden text-xs text-muted-foreground self-center">Cash-out</label>
                <NumberField
                  value={p.cashOut}
                  symbol={symbol}
                  onChange={v => updatePlayer(p.id, { cashOut: v })}
                  ariaLabel={`${p.name || `Player ${idx + 1}`} cash-out`}
                />
              </div>
              <button
                type="button"
                onClick={() => removePlayer(p.id)}
                disabled={players.length <= 2}
                aria-label={`Remove ${p.name || `Player ${idx + 1}`}`}
                className="justify-self-end sm:justify-self-center text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed h-9 w-9 rounded-md inline-flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button
            type="button"
            onClick={addPlayer}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[rgba(200,155,60,0.3)] text-gold font-medium hover:bg-gold/10 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add player
          </button>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gold text-background font-semibold shadow-[0_4px_18px_rgba(200,155,60,0.4)] hover:bg-gold/90 transition-colors"
          >
            <CalculatorIcon className="h-4 w-4" />
            Calculate settlements
          </button>
          {showResults && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="space-y-4">
          {imbalanceWarning && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
              {imbalanceWarning}
            </div>
          )}

          <div className="rounded-2xl border border-[rgba(200,155,60,0.18)] bg-card/40 p-5 sm:p-6">
            <h2 className="text-lg font-semibold mb-1">Per-player profit</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Cash-out minus buy-in for each player.
            </p>
            <div className="divide-y divide-[rgba(200,155,60,0.12)]">
              {result.results
                .slice()
                .sort((a, b) => b.profit - a.profit)
                .map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span
                      className={
                        r.profit > 0
                          ? 'text-emerald-400 font-semibold'
                          : r.profit < 0
                          ? 'text-rose-400 font-semibold'
                          : 'text-muted-foreground'
                      }
                    >
                      {r.profit >= 0 ? '+' : ''}
                      {formatMoney(r.profit, symbol)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(200,155,60,0.18)] bg-card/40 p-5 sm:p-6">
            <h2 className="text-lg font-semibold mb-1">Settlements</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {result.transfers.length === 0
                ? 'Nothing to settle — everyone broke even.'
                : `${result.transfers.length} payment${
                    result.transfers.length === 1 ? '' : 's'
                  } settles the night.`}
            </p>
            <ul className="space-y-2">
              {result.transfers.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-[rgba(200,155,60,0.12)] text-sm"
                >
                  <span className="font-medium">{t.fromName}</span>
                  <ArrowRight className="h-4 w-4 text-gold flex-shrink-0" />
                  <span className="font-medium">{t.toName}</span>
                  <span className="ml-auto font-mono text-gold font-semibold">
                    {formatMoney(t.amount, symbol)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

interface NumberFieldProps {
  value: number;
  symbol: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}

function NumberField({ value, symbol, onChange, ariaLabel }: NumberFieldProps) {
  const [text, setText] = useState(value === 0 ? '' : String(value));

  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        {symbol}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        onChange={e => {
          const next = e.target.value.replace(/[^0-9.]/g, '');
          setText(next);
          const parsed = parseFloat(next);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        onBlur={() => {
          const parsed = parseFloat(text);
          setText(Number.isFinite(parsed) ? String(parsed) : '');
        }}
        placeholder="0"
        className="w-full bg-background/80 border border-[rgba(200,155,60,0.18)] focus:border-gold focus:outline-none rounded-md pl-7 pr-2 py-2 text-base sm:text-sm text-right tabular-nums"
      />
    </div>
  );
}

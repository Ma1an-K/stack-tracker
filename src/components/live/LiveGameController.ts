/** A player the tracker can seat or name. A subset of the homegame `Player` row. */
export interface RosterPlayer {
  id: string;
  name: string;
  is_active: boolean;
}

/**
 * Everything the live tracker needs, independent of where the game is stored.
 * Field names mirror `LiveSessionContextType` and `LiveSession` so the homegame
 * adapter is a thin mapping.
 */
export interface LiveGameController {
  players: { player_id: string; buy_in: number; cash_out?: number }[];
  payments: { from_player_id: string; to_player_id: string; amount: number }[];
  defaultBuyIn: number;
  startedAt: string;
  totalPot: number;
  totalBuyIn: number;
  seatedCount: number;
  roster: RosterPlayer[];
  currency: string | undefined;
  ownerName: string | null;
  canCreatePlayer: boolean;
  createPlayer(name: string): Promise<{ error: unknown | null; player: RosterPlayer | null }>;
  addBuyIn(id: string, amount: number): Promise<{ error: unknown }>;
  setBuyIn(id: string, total: number): Promise<{ error: unknown }>;
  addPlayer(id: string, buyIn: number): Promise<{ error: unknown }>;
  removePlayer(id: string): Promise<{ error: unknown }>;
  cashOut(id: string, amount: number): Promise<{ error: unknown }>;
  rejoin(id: string): Promise<{ error: unknown }>;
  addPayment(p: { from_player_id: string; to_player_id: string; amount: number }): Promise<{ error: unknown }>;
  removePayment(index: number): Promise<{ error: unknown }>;
  endHref: string;
}

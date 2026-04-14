export interface Profile {
  id: string;
  username: string;
  discriminator: number;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Homegame {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type HomegameRole = 'owner' | 'admin' | 'member';

export interface HomegameMember {
  id: string;
  homegame_id: string;
  user_id: string;
  role: HomegameRole;
  created_at: string;
}

export interface HomegameMemberWithProfile extends HomegameMember {
  profile: Profile;
}

export interface HomegameWithRole extends Homegame {
  role: HomegameRole;
}

export interface InviteCode {
  id: string;
  homegame_id: string;
  code: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Player {
  id: string;
  homegame_id: string;
  name: string;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  homegame_id: string;
  date: string;
  notes: string | null;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionPlayer {
  id: string;
  session_id: string;
  player_id: string;
  buy_in: number;
  cash_out: number;
  created_at: string;
  updated_at: string;
}

export interface SessionPlayerWithDetails extends SessionPlayer {
  player: Player;
}

export interface SessionWithPlayers extends Session {
  session_players: SessionPlayerWithDetails[];
}

export interface PlayerStats {
  player: Player;
  totalBuyIn: number;
  totalCashOut: number;
  netProfit: number;
  sessionsPlayed: number;
  avgProfit: number;
}

export interface Settlement {
  from: Player;
  to: Player;
  amount: number;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface PlayerClaimRequest {
  id: string;
  player_id: string;
  user_id: string;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface PlayerClaimRequestWithDetails extends PlayerClaimRequest {
  player: Player;
  profile: Profile;
}

export interface Player {
  id: string;    // crypto.randomUUID()
  name: string;
}

export interface CourtGame {
  courtName: string;                        // "Court 1", "Court 2"
  team1: [string, string];                  // player ids
  team2: [string, string];                  // player ids
  score?: { team1: number; team2: number };
}

export interface Round {
  roundNumber: number;
  courts: CourtGame[];   // always 2 in V1
  sittingOut: string[];  // player ids
}

export interface Session {
  date: string;          // YYYY-MM-DD
  players: Player[];     // 8–11 players
  rounds: Round[];
}

export interface PlayerStats {
  player: Player;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
}

import { Injectable } from '@angular/core';
import { Player, Round, CourtGame } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  generateRounds(players: Player[], courtCount: number): Round[] {
    if (players.length < 8) return [];
    const n = players.length;
    const normalizedCourtCount = Math.max(1, Math.floor(courtCount));
    if (n < normalizedCourtCount * 4) return [];
    const activePlayersPerRound = normalizedCourtCount * 4;
    const sitOutsPerRound = n - activePlayersPerRound;
    // Target: enough rounds that every player has rotated through sit-outs
    // and played with varied partners. Min 7 rounds.
    const numRounds = sitOutsPerRound > 0 ? Math.max(7, n) : 7;

    const sitOutCount = new Array(n).fill(0);
    const pairCount: Record<string, number> = {};
    const rounds: Round[] = [];

    for (let r = 0; r < numRounds; r++) {
      const indices = Array.from({ length: n }, (_, i) => i);

      // Select sit-outs: players with fewest sit-outs first (their turn)
      const sorted = [...indices].sort((a, b) =>
        sitOutCount[a] !== sitOutCount[b]
          ? sitOutCount[a] - sitOutCount[b]
          : a - b
      );
      const sittingOutIndices = sorted.slice(0, sitOutsPerRound);
      const playingIndices = sorted.slice(sitOutsPerRound);
      sittingOutIndices.forEach(i => sitOutCount[i]++);

      // Rotate playing order each round to vary court assignments
      const offset = r % playingIndices.length;
      const rotated = [
        ...playingIndices.slice(offset),
        ...playingIndices.slice(0, offset),
      ];

      const courts: CourtGame[] = [];

      for (let courtIndex = 0; courtIndex < normalizedCourtCount; courtIndex++) {
        const group = rotated.slice(courtIndex * 4, courtIndex * 4 + 4);
        const [team1, team2] = this.bestTeamSplit(group, players, pairCount);

        this.recordPair(players[team1[0]].id, players[team1[1]].id, pairCount);
        this.recordPair(players[team2[0]].id, players[team2[1]].id, pairCount);

        courts.push({
          courtName: `Court ${courtIndex + 1}`,
          team1: [players[team1[0]].id, players[team1[1]].id],
          team2: [players[team2[0]].id, players[team2[1]].id],
        });
      }

      rounds.push({
        roundNumber: r + 1,
        courts,
        sittingOut: sittingOutIndices.map(i => players[i].id),
      });
    }

    return rounds;
  }

  private bestTeamSplit(
    group: number[],
    players: Player[],
    pairCount: Record<string, number>
  ): [number[], number[]] {
    const score = (i: number, j: number) =>
      pairCount[this.pairKey(players[group[i]].id, players[group[j]].id)] ?? 0;

    const splits = [
      { teams: [[0, 1], [2, 3]], score: score(0, 1) + score(2, 3) },
      { teams: [[0, 2], [1, 3]], score: score(0, 2) + score(1, 3) },
      { teams: [[0, 3], [1, 2]], score: score(0, 3) + score(1, 2) },
    ];
    splits.sort((a, b) => a.score - b.score);
    return [
      splits[0].teams[0].map(i => group[i]),
      splits[0].teams[1].map(i => group[i]),
    ];
  }

  private pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
  }

  private recordPair(a: string, b: string, pairCount: Record<string, number>): void {
    const key = this.pairKey(a, b);
    pairCount[key] = (pairCount[key] ?? 0) + 1;
  }
}

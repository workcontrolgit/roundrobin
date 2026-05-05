import { Injectable } from '@angular/core';
import { Player, Round, CourtGame } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {

  generateRounds(players: Player[]): Round[] {
    if (players.length < 8) return [];
    const n = players.length;
    const sitOutsPerRound = n - 8;
    // Target: enough rounds that every player has rotated through sit-outs
    // and played with varied partners. Min 7 rounds.
    const numRounds = Math.max(7, n <= 8 ? 7 : n <= 9 ? 9 : n <= 10 ? 10 : 11);

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

      const court1Group = rotated.slice(0, 4);
      const court2Group = rotated.slice(4, 8);

      const [c1t1, c1t2] = this.bestTeamSplit(court1Group, players, pairCount);
      const [c2t1, c2t2] = this.bestTeamSplit(court2Group, players, pairCount);

      this.recordPair(players[c1t1[0]].id, players[c1t1[1]].id, pairCount);
      this.recordPair(players[c1t2[0]].id, players[c1t2[1]].id, pairCount);
      this.recordPair(players[c2t1[0]].id, players[c2t1[1]].id, pairCount);
      this.recordPair(players[c2t2[0]].id, players[c2t2[1]].id, pairCount);

      rounds.push({
        roundNumber: r + 1,
        courts: [
          {
            courtName: 'Court 1',
            team1: [players[c1t1[0]].id, players[c1t1[1]].id],
            team2: [players[c1t2[0]].id, players[c1t2[1]].id],
          },
          {
            courtName: 'Court 2',
            team1: [players[c2t1[0]].id, players[c2t1[1]].id],
            team2: [players[c2t2[0]].id, players[c2t2[1]].id],
          },
        ],
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

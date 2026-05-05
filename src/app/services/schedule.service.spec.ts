import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';
import { Player, Round } from '../models/session.models';

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i + 1}`,
  }));
}

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateRounds()', () => {
    it('generates at least 7 rounds for 8 players', () => {
      const rounds = service.generateRounds(makePlayers(8));
      expect(rounds.length).toBeGreaterThanOrEqual(7);
    });

    it('generates rounds for 11 players', () => {
      const rounds = service.generateRounds(makePlayers(11));
      expect(rounds.length).toBeGreaterThanOrEqual(7);
    });

    it('every round has exactly 2 courts', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => expect(r.courts.length).toBe(2));
    });

    it('every court has exactly 4 unique players per round', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(round => {
        round.courts.forEach(court => {
          const ids = [...court.team1, ...court.team2];
          expect(ids.length).toBe(4);
          expect(new Set(ids).size).toBe(4);
        });
      });
    });

    it('no player appears twice in the same round', () => {
      const rounds = service.generateRounds(makePlayers(9));
      rounds.forEach(round => {
        const allPlaying = round.courts.flatMap(c => [...c.team1, ...c.team2]);
        expect(new Set(allPlaying).size).toBe(allPlaying.length);
      });
    });

    it('with 8 players, no one sits out', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(0));
    });

    it('with 9 players, exactly 1 sits out per round', () => {
      const rounds = service.generateRounds(makePlayers(9));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(1));
    });

    it('with 11 players, exactly 3 sit out per round', () => {
      const rounds = service.generateRounds(makePlayers(11));
      rounds.forEach(r => expect(r.sittingOut.length).toBe(3));
    });

    it('sit-outs are distributed fairly across all players', () => {
      const players = makePlayers(9);
      const rounds = service.generateRounds(players);
      const sitOutCounts: Record<string, number> = {};
      players.forEach(p => (sitOutCounts[p.id] = 0));
      rounds.forEach(r => r.sittingOut.forEach(id => sitOutCounts[id]++));
      const counts = Object.values(sitOutCounts);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      expect(max - min).toBeLessThanOrEqual(1);
    });

    it('round numbers are sequential starting at 1', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach((r, i) => expect(r.roundNumber).toBe(i + 1));
    });

    it('court names are Court 1 and Court 2', () => {
      const rounds = service.generateRounds(makePlayers(8));
      rounds.forEach(r => {
        expect(r.courts[0].courtName).toBe('Court 1');
        expect(r.courts[1].courtName).toBe('Court 2');
      });
    });

    it('is deterministic — same players produce same schedule', () => {
      const players = makePlayers(10);
      const r1 = service.generateRounds(players);
      const r2 = service.generateRounds(players);
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    });
  });
});

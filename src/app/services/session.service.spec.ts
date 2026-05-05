import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Session, Player } from '../models/session.models';

function makeSession(date: string): Session {
  return { date, players: [], rounds: [] };
}

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('storageKey()', () => {
    it('returns correct key for a date', () => {
      expect(service.storageKey('2026-05-04')).toBe('pickleball-session-2026-05-04');
    });
  });

  describe('saveSession()', () => {
    it('saves session to localStorage under date key', () => {
      const session = makeSession('2026-05-04');
      service.saveSession(session);
      const raw = localStorage.getItem('pickleball-session-2026-05-04');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).date).toBe('2026-05-04');
    });
  });

  describe('loadSession()', () => {
    it('returns null when no session exists for date', () => {
      expect(service.loadSession('2026-01-01')).toBeNull();
    });

    it('returns the saved session for a date', () => {
      const session = makeSession('2026-05-04');
      service.saveSession(session);
      const loaded = service.loadSession('2026-05-04');
      expect(loaded).not.toBeNull();
      expect(loaded!.date).toBe('2026-05-04');
    });
  });

  describe('getSavedDates()', () => {
    it('returns empty array when no sessions saved', () => {
      expect(service.getSavedDates()).toEqual([]);
    });

    it('returns list of saved dates sorted descending', () => {
      service.saveSession(makeSession('2026-05-01'));
      service.saveSession(makeSession('2026-05-04'));
      service.saveSession(makeSession('2026-04-30'));
      const dates = service.getSavedDates();
      expect(dates).toEqual(['2026-05-04', '2026-05-01', '2026-04-30']);
    });
  });

  describe('clearSession()', () => {
    it('removes session from localStorage', () => {
      service.saveSession(makeSession('2026-05-04'));
      service.clearSession('2026-05-04');
      expect(service.loadSession('2026-05-04')).toBeNull();
    });
  });

  describe('addPlayer()', () => {
    it('adds a player to the active session and saves', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const session = service.activeSession();
      expect(session!.players.length).toBe(1);
      expect(session!.players[0].name).toBe('Alice');
    });

    it('generates a unique id for each player', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      service.addPlayer('Bob');
      const ids = service.activeSession()!.players.map(p => p.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('removePlayer()', () => {
    it('removes a player by id', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const id = service.activeSession()!.players[0].id;
      service.removePlayer(id);
      expect(service.activeSession()!.players.length).toBe(0);
    });
  });

  describe('setRounds()', () => {
    it('saves rounds to the active session', () => {
      service.initSession('2026-05-04');
      service.setRounds([]);
      expect(service.activeSession()!.rounds).toEqual([]);
    });
  });

  describe('saveScore()', () => {
    it('saves score for the correct court in the correct round', () => {
      service.initSession('2026-05-04');
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            { courtName: 'Court 1', team1: ['p0', 'p1'], team2: ['p2', 'p3'] },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      service.saveScore(0, 'Court 1', 11, 7);
      const court = service.activeSession()!.rounds[0].courts[0];
      expect(court.score).toEqual({ team1: 11, team2: 7 });
    });
  });

  describe('getPlayerStats()', () => {
    it('returns 0 wins and 0 points when no scores', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            { courtName: 'Court 1', team1: [service.activeSession()!.players[0].id, 'p1'], team2: ['p2', 'p3'] },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      const stats = service.getPlayerStats();
      const alice = stats.find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(0);
      expect(alice.totalPoints).toBe(0);
    });

    it('counts wins and points correctly', () => {
      service.initSession('2026-05-04');
      service.addPlayer('Alice');
      const aliceId = service.activeSession()!.players[0].id;
      service.setRounds([
        {
          roundNumber: 1,
          courts: [
            {
              courtName: 'Court 1',
              team1: [aliceId, 'p1'],
              team2: ['p2', 'p3'],
              score: { team1: 11, team2: 7 },
            },
            { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
          ],
          sittingOut: [],
        },
      ]);
      const stats = service.getPlayerStats();
      const alice = stats.find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(1);
      expect(alice.totalPoints).toBe(11);
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';
import { Session } from '../models/session.models';

function makeSession(date: string, sessionNumber = 1): Session {
  return { date, sessionNumber, players: [], rounds: [] };
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
    it('returns key combining date and session number', () => {
      expect(service.storageKey('2026-05-04', 1)).toBe('pickleball-session-2026-05-04-1');
      expect(service.storageKey('2026-05-04', 2)).toBe('pickleball-session-2026-05-04-2');
    });
  });

  describe('saveSession()', () => {
    it('saves session under date-session key', () => {
      const session = makeSession('2026-05-04', 1);
      service.saveSession(session);
      const raw = localStorage.getItem('pickleball-session-2026-05-04-1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.date).toBe('2026-05-04');
      expect(parsed.sessionNumber).toBe(1);
    });
  });

  describe('loadSession()', () => {
    it('returns null when no session exists', () => {
      expect(service.loadSession('2026-01-01', 1)).toBeNull();
    });

    it('returns the saved session for date and session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      const loaded = service.loadSession('2026-05-04', 1);
      expect(loaded).not.toBeNull();
      expect(loaded!.date).toBe('2026-05-04');
      expect(loaded!.sessionNumber).toBe(1);
    });

    it('does not return session for a different session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      expect(service.loadSession('2026-05-04', 2)).toBeNull();
    });
  });

  describe('getSavedDates()', () => {
    it('returns empty array when no sessions saved', () => {
      expect(service.getSavedDates()).toEqual([]);
    });

    it('returns deduplicated dates sorted descending', () => {
      service.saveSession(makeSession('2026-05-01', 1));
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 2));
      service.saveSession(makeSession('2026-04-30', 1));
      const dates = service.getSavedDates();
      expect(dates).toEqual(['2026-05-04', '2026-05-01', '2026-04-30']);
    });
  });

  describe('clearSession()', () => {
    it('removes the session from localStorage', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.clearSession('2026-05-04', 1);
      expect(service.loadSession('2026-05-04', 1)).toBeNull();
    });

    it('does not remove a session with a different session number', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 2));
      service.clearSession('2026-05-04', 1);
      expect(service.loadSession('2026-05-04', 2)).not.toBeNull();
    });
  });

  describe('initSession()', () => {
    it('creates a new session if none exists', () => {
      service.initSession('2026-05-04', 1);
      expect(service.activeSession()).not.toBeNull();
      expect(service.activeSession()!.sessionNumber).toBe(1);
    });

    it('loads existing session if already saved', () => {
      const existing = makeSession('2026-05-04', 1);
      service.saveSession(existing);
      service.initSession('2026-05-04', 1);
      expect(service.activeSession()!.sessionNumber).toBe(1);
    });
  });

  describe('addPlayer()', () => {
    it('adds a player to the active session and saves', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      expect(service.activeSession()!.players.length).toBe(1);
      expect(service.activeSession()!.players[0].name).toBe('Alice');
    });

    it('generates a unique id for each player', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.addPlayer('Bob');
      const ids = service.activeSession()!.players.map(p => p.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('removePlayer()', () => {
    it('removes a player by id', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      const id = service.activeSession()!.players[0].id;
      service.removePlayer(id);
      expect(service.activeSession()!.players.length).toBe(0);
    });
  });

  describe('setRounds()', () => {
    it('saves rounds to the active session', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([]);
      expect(service.activeSession()!.rounds).toEqual([]);
    });
  });

  describe('saveScore()', () => {
    it('saves score for the correct court in the correct round', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: ['p0', 'p1'], team2: ['p2', 'p3'] },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      service.saveScore(0, 'Court 1', 11, 7);
      const court = service.activeSession()!.rounds[0].courts[0];
      expect(court.score).toEqual({ team1: 11, team2: 7 });
    });
  });

  describe('getPlayerStats()', () => {
    it('returns 0 wins and 0 points when no scores', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: [service.activeSession()!.players[0].id, 'p1'], team2: ['p2', 'p3'] },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      const alice = service.getPlayerStats().find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(0);
      expect(alice.totalPoints).toBe(0);
    });

    it('counts wins and points correctly', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      const aliceId = service.activeSession()!.players[0].id;
      service.setRounds([{
        roundNumber: 1,
        courts: [
          { courtName: 'Court 1', team1: [aliceId, 'p1'], team2: ['p2', 'p3'], score: { team1: 11, team2: 7 } },
          { courtName: 'Court 2', team1: ['p4', 'p5'], team2: ['p6', 'p7'] },
        ],
        sittingOut: [],
      }]);
      const alice = service.getPlayerStats().find(s => s.player.name === 'Alice')!;
      expect(alice.wins).toBe(1);
      expect(alice.totalPoints).toBe(11);
    });
  });

  describe('getSavedSessionsForDate()', () => {
    it('returns empty array when no sessions for that date', () => {
      expect(service.getSavedSessionsForDate('2026-05-04')).toEqual([]);
    });

    it('returns sorted session numbers for the date', () => {
      service.saveSession(makeSession('2026-05-04', 2));
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 3));
      expect(service.getSavedSessionsForDate('2026-05-04')).toEqual([1, 2, 3]);
    });

    it('does not include sessions from other dates', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-05', 1));
      expect(service.getSavedSessionsForDate('2026-05-04')).toEqual([1]);
    });
  });

  describe('getNextSessionNumber()', () => {
    it('returns 1 when no sessions exist for the date', () => {
      expect(service.getNextSessionNumber('2026-05-04')).toBe(1);
    });

    it('returns max session number + 1', () => {
      service.saveSession(makeSession('2026-05-04', 1));
      service.saveSession(makeSession('2026-05-04', 2));
      expect(service.getNextSessionNumber('2026-05-04')).toBe(3);
    });
  });

  describe('migrateOldKeys()', () => {
    it('migrates old-format key to new format with sessionNumber 1', () => {
      localStorage.setItem('pickleball-session-2026-03-15', JSON.stringify({
        date: '2026-03-15',
        players: [],
        rounds: [],
      }));
      service.migrateOldKeys();
      expect(localStorage.getItem('pickleball-session-2026-03-15')).toBeNull();
      const migrated = JSON.parse(localStorage.getItem('pickleball-session-2026-03-15-1')!);
      expect(migrated.date).toBe('2026-03-15');
      expect(migrated.sessionNumber).toBe(1);
    });

    it('does not affect already-migrated keys', () => {
      service.saveSession(makeSession('2026-03-15', 1));
      service.migrateOldKeys();
      // New-format key still present
      expect(service.loadSession('2026-03-15', 1)).not.toBeNull();
      // No spurious double-migration key
      expect(localStorage.getItem('pickleball-session-2026-03-15-1-1')).toBeNull();
    });
  });

  describe('resetRoundsAndScores()', () => {
    it('clears rounds but preserves players', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.addPlayer('Bob');
      service.setRounds([{
        roundNumber: 1,
        courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
        sittingOut: [],
      }]);
      service.resetRoundsAndScores('2026-05-04', 1);
      expect(service.activeSession()!.rounds).toEqual([]);
      expect(service.activeSession()!.players.length).toBe(2);
    });

    it('updates active session signal', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([{
        roundNumber: 1,
        courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
        sittingOut: [],
      }]);
      service.resetRoundsAndScores('2026-05-04', 1);
      expect(service.activeSession()!.rounds.length).toBe(0);
    });

    it('persists to localStorage', () => {
      service.initSession('2026-05-04', 1);
      service.setRounds([{
        roundNumber: 1,
        courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
        sittingOut: [],
      }]);
      service.resetRoundsAndScores('2026-05-04', 1);
      const saved = service.loadSession('2026-05-04', 1);
      expect(saved!.rounds).toEqual([]);
    });
  });

  describe('resetEverything()', () => {
    it('clears both players and rounds', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.setRounds([{
        roundNumber: 1,
        courts: [{ courtName: 'Court 1', team1: ['a', 'b'], team2: ['c', 'd'] }],
        sittingOut: [],
      }]);
      service.resetEverything('2026-05-04', 1);
      expect(service.activeSession()!.players).toEqual([]);
      expect(service.activeSession()!.rounds).toEqual([]);
    });

    it('keeps the session in localStorage (does not delete the key)', () => {
      service.initSession('2026-05-04', 1);
      service.addPlayer('Alice');
      service.resetEverything('2026-05-04', 1);
      expect(service.loadSession('2026-05-04', 1)).not.toBeNull();
    });
  });
});

import { Injectable, signal } from '@angular/core';
import { Session, Player, Round, PlayerStats } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly PREFIX = 'pickleball-session-';
  private _activeSession = signal<Session | null>(null);

  readonly activeSession = this._activeSession.asReadonly();

  storageKey(date: string, sessionNumber: number): string {
    return `${this.PREFIX}${date}-${sessionNumber}`;
  }

  saveSession(session: Session): void {
    localStorage.setItem(this.storageKey(session.date, session.sessionNumber), JSON.stringify(session));
  }

  loadSession(date: string, sessionNumber: number): Session | null {
    const raw = localStorage.getItem(this.storageKey(date, sessionNumber));
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  getSavedDates(): string[] {
    const dates = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        const suffix = key.slice(this.PREFIX.length);
        const match = suffix.match(/^(\d{4}-\d{2}-\d{2})-\d+$/);
        if (match) dates.add(match[1]);
      }
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }

  clearSession(date: string, sessionNumber: number): void {
    localStorage.removeItem(this.storageKey(date, sessionNumber));
    const active = this._activeSession();
    if (active?.date === date && active?.sessionNumber === sessionNumber) {
      this._activeSession.set(null);
    }
  }

  resetRoundsAndScores(date: string, sessionNumber: number): void {
    this.update(s => ({ ...s, rounds: [] }));
  }

  resetEverything(date: string, sessionNumber: number): void {
    this.update(s => ({ ...s, players: [], rounds: [] }));
  }

  loadSharedSession(session: Session): void {
    this._activeSession.set(session);
  }

  initSession(date: string, sessionNumber: number): void {
    const existing = this.loadSession(date, sessionNumber);
    if (existing) {
      this._activeSession.set(existing);
    } else {
      const session: Session = { date, sessionNumber, players: [], rounds: [] };
      this.saveSession(session);
      this._activeSession.set(session);
    }
  }

  getSavedSessionsForDate(date: string): number[] {
    const prefix = `${this.PREFIX}${date}-`;
    const numbers: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(prefix)) {
        const suffix = key.slice(prefix.length);
        const n = parseInt(suffix, 10);
        if (!isNaN(n) && String(n) === suffix) numbers.push(n);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  getNextSessionNumber(date: string): number {
    const sessions = this.getSavedSessionsForDate(date);
    return sessions.length === 0 ? 1 : Math.max(...sessions) + 1;
  }

  migrateOldKeys(): void {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        const suffix = key.slice(this.PREFIX.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(suffix)) {
          keysToMigrate.push(key);
        }
      }
    }
    keysToMigrate.forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const session = JSON.parse(raw) as Session;
      session.sessionNumber = 1;
      const newKey = `${key}-1`;
      localStorage.setItem(newKey, JSON.stringify(session));
      localStorage.removeItem(key);
    });
  }

  todayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private update(fn: (s: Session) => Session): void {
    const current = this._activeSession();
    if (!current) return;
    const updated = fn(current);
    this._activeSession.set(updated);
    this.saveSession(updated);
  }

  addPlayer(name: string): void {
    if (!this._activeSession()) {
      const today = this.todayDate();
      this.initSession(today, this.getNextSessionNumber(today));
    }
    this.update(s => ({
      ...s,
      players: [...s.players, { id: crypto.randomUUID(), name: name.trim() }],
    }));
  }

  removePlayer(id: string): void {
    this.update(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
  }

  renamePlayer(id: string, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.update(s => ({
      ...s,
      players: s.players.map(p => p.id === id ? { ...p, name: trimmed } : p),
    }));
  }

  importPlayers(names: string[]): void {
    names.forEach(name => {
      const trimmed = name.trim();
      if (trimmed) this.addPlayer(trimmed);
    });
  }

  setRounds(rounds: Round[]): void {
    this.update(s => ({ ...s, rounds }));
  }

  saveScore(roundIndex: number, courtName: string, team1Score: number, team2Score: number): void {
    this.update(s => {
      const rounds = s.rounds.map((r, ri) => {
        if (ri !== roundIndex) return r;
        return {
          ...r,
          courts: r.courts.map(c =>
            c.courtName === courtName
              ? { ...c, score: { team1: team1Score, team2: team2Score } }
              : c
          ),
        };
      });
      return { ...s, rounds };
    });
  }

  getPlayerStats(): PlayerStats[] {
    const session = this._activeSession();
    if (!session) return [];

    const statsMap = new Map<string, PlayerStats>(
      session.players.map(p => [p.id, { player: p, wins: 0, totalPoints: 0, gamesPlayed: 0 }])
    );

    session.rounds.forEach(round => {
      round.courts.forEach(court => {
        if (!court.score) return;
        const { team1, team2, score } = court;
        const team1Won = score.team1 > score.team2;

        [...team1].forEach(id => {
          const s = statsMap.get(id);
          if (!s) return;
          s.gamesPlayed++;
          s.totalPoints += score.team1;
          if (team1Won) s.wins++;
        });

        [...team2].forEach(id => {
          const s = statsMap.get(id);
          if (!s) return;
          s.gamesPlayed++;
          s.totalPoints += score.team2;
          if (!team1Won) s.wins++;
        });
      });
    });

    return Array.from(statsMap.values());
  }

  encodeSessionToHash(session: Session): string {
    const json = JSON.stringify(session);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  decodeSessionFromHash(hash: string): Session | null {
    try {
      const binary = atob(hash);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as Session;
    } catch {
      return null;
    }
  }
}

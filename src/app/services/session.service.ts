import { Injectable, signal } from '@angular/core';
import { Session, Player, Round, PlayerStats } from '../models/session.models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly PREFIX = 'pickleball-session-';
  private _activeSession = signal<Session | null>(null);

  readonly activeSession = this._activeSession.asReadonly();

  storageKey(date: string): string {
    return `${this.PREFIX}${date}`;
  }

  saveSession(session: Session): void {
    localStorage.setItem(this.storageKey(session.date), JSON.stringify(session));
  }

  loadSession(date: string): Session | null {
    const raw = localStorage.getItem(this.storageKey(date));
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  getSavedDates(): string[] {
    const dates: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith(this.PREFIX)) {
        dates.push(key.slice(this.PREFIX.length));
      }
    }
    return dates.sort((a, b) => b.localeCompare(a));
  }

  clearSession(date: string): void {
    localStorage.removeItem(this.storageKey(date));
    if (this._activeSession()?.date === date) {
      this._activeSession.set(null);
    }
  }

  initSession(date: string): void {
    const existing = this.loadSession(date);
    if (existing) {
      this._activeSession.set(existing);
    } else {
      const session: Session = { date, players: [], rounds: [] };
      this.saveSession(session);
      this._activeSession.set(session);
    }
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
    this.update(s => ({
      ...s,
      players: [...s.players, { id: crypto.randomUUID(), name: name.trim() }],
    }));
  }

  removePlayer(id: string): void {
    this.update(s => ({ ...s, players: s.players.filter(p => p.id !== id) }));
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
    return btoa(JSON.stringify(session));
  }

  decodeSessionFromHash(hash: string): Session | null {
    try {
      return JSON.parse(atob(hash)) as Session;
    } catch {
      return null;
    }
  }
}

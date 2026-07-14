import { BaseRepository } from './BaseRepository';

export type User = {
  id: number;
  username: string;
  email: string;
};

export class UserRepository extends BaseRepository {
  create(username: string, email: string): User {
    const result = this.db.run('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
    return this.getById(result.lastInsertRowid as number)!;
  }

  getById(id: number): User | undefined {
    return this.db.queryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  update(id: number, fields: Partial<Pick<User, 'username' | 'email'>>): User | undefined {
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      return this.getById(id);
    }
    const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);
    this.db.run(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
    return this.getById(id);
  }

  delete(id: number): void {
    this.db.run('DELETE FROM users WHERE id = ?', [id]);
  }

  exists(id: number): boolean {
    return this.getById(id) !== undefined;
  }
}

import { DbService } from '../services/DbService';

export abstract class BaseRepository {
  constructor(protected readonly db: DbService) {}
}

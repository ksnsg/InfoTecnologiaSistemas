import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

/**
 * Runs once after the entire module graph is initialised.
 * Placing seed logic here (not in UsersService) preserves SRP:
 * UsersService manages the User domain; SeedService manages bootstrap data.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedDefaultAdminUser();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        JSON.stringify({ event: 'seed_failed', error: message }),
      );
    }
  }

  private async seedDefaultAdminUser(): Promise<void> {
    const existingUsers = await this.usersService.findAllUsers();
    if (existingUsers.length > 0) {
      this.logger.log(
        JSON.stringify({ event: 'seed_skipped', reason: 'users_table_not_empty' }),
      );
      return;
    }

    await this.usersService.createUser({
      name: 'Aivacol Admin',
      nickname: 'aivacol',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aivacol.com',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@Aivacol2026!',
    });

    this.logger.log(
      JSON.stringify({ event: 'seed_completed', user: 'aivacol' }),
    );
  }
}

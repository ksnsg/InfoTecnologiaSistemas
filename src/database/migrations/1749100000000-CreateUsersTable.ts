import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1749100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [users] (
        [id]         uniqueidentifier NOT NULL CONSTRAINT [DF_users_id] DEFAULT NEWSEQUENTIALID(),
        [name]       nvarchar(120)    NOT NULL,
        [nickname]   nvarchar(60)     NOT NULL,
        [email]      nvarchar(180)    NOT NULL,
        [password]   nvarchar(255)    NOT NULL,
        [created_at] datetime2        NOT NULL CONSTRAINT [DF_users_created_at] DEFAULT GETUTCDATE(),
        [updated_at] datetime2        NOT NULL CONSTRAINT [DF_users_updated_at] DEFAULT GETUTCDATE(),
        [created_by] nvarchar(255)    NULL,
        CONSTRAINT [PK_users]          PRIMARY KEY ([id]),
        CONSTRAINT [UQ_users_nickname] UNIQUE ([nickname]),
        CONSTRAINT [UQ_users_email]    UNIQUE ([email])
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [users]`);
  }
}

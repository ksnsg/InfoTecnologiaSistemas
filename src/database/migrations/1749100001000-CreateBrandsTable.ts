import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBrandsTable1749100001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [brands] (
        [id]         uniqueidentifier NOT NULL CONSTRAINT [DF_brands_id] DEFAULT NEWSEQUENTIALID(),
        [name]       nvarchar(120)    NOT NULL,
        [created_at] datetime2        NOT NULL CONSTRAINT [DF_brands_created_at] DEFAULT GETUTCDATE(),
        [updated_at] datetime2        NOT NULL CONSTRAINT [DF_brands_updated_at] DEFAULT GETUTCDATE(),
        [created_by] nvarchar(255)    NULL,
        CONSTRAINT [PK_brands]       PRIMARY KEY ([id]),
        CONSTRAINT [UQ_brands_name]  UNIQUE ([name])
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [brands]`);
  }
}

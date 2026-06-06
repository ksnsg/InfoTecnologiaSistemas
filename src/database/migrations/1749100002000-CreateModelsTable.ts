import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateModelsTable1749100002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [models] (
        [id]         uniqueidentifier NOT NULL CONSTRAINT [DF_models_id] DEFAULT NEWSEQUENTIALID(),
        [name]       nvarchar(120)    NOT NULL,
        [brand_id]   uniqueidentifier NOT NULL,
        [created_at] datetime2        NOT NULL CONSTRAINT [DF_models_created_at] DEFAULT GETUTCDATE(),
        [updated_at] datetime2        NOT NULL CONSTRAINT [DF_models_updated_at] DEFAULT GETUTCDATE(),
        [created_by] nvarchar(255)    NULL,
        CONSTRAINT [PK_models]           PRIMARY KEY ([id]),
        CONSTRAINT [FK_models_brand_id]  FOREIGN KEY ([brand_id])
          REFERENCES [brands]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [models] DROP CONSTRAINT [FK_models_brand_id]`);
    await queryRunner.query(`DROP TABLE [models]`);
  }
}

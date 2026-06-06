import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehiclesTable1749100003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [vehicles] (
        [id]            uniqueidentifier NOT NULL CONSTRAINT [DF_vehicles_id] DEFAULT NEWSEQUENTIALID(),
        [license_plate] nvarchar(10)     NOT NULL,
        [chassis]       nvarchar(17)     NOT NULL,
        [renavam]       nvarchar(11)     NOT NULL,
        [year]          int              NOT NULL,
        [model_id]      uniqueidentifier NOT NULL,
        [created_at]    datetime2        NOT NULL CONSTRAINT [DF_vehicles_created_at] DEFAULT GETUTCDATE(),
        [updated_at]    datetime2        NOT NULL CONSTRAINT [DF_vehicles_updated_at] DEFAULT GETUTCDATE(),
        [created_by]    nvarchar(255)    NULL,
        CONSTRAINT [PK_vehicles]                 PRIMARY KEY ([id]),
        CONSTRAINT [UQ_vehicles_license_plate]   UNIQUE ([license_plate]),
        CONSTRAINT [UQ_vehicles_chassis]         UNIQUE ([chassis]),
        CONSTRAINT [UQ_vehicles_renavam]         UNIQUE ([renavam]),
        CONSTRAINT [FK_vehicles_model_id]        FOREIGN KEY ([model_id])
          REFERENCES [models]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [vehicles] DROP CONSTRAINT [FK_vehicles_model_id]`);
    await queryRunner.query(`DROP TABLE [vehicles]`);
  }
}

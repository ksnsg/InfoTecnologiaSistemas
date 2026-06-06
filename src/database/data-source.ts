import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Standalone DataSource used exclusively by the TypeORM CLI
 * (migration:generate / migration:run / migration:revert).
 * The application runtime uses DatabaseModule instead.
 *
 * Load .env from project root so credentials are available when running
 * CLI commands outside of Docker (e.g. npx typeorm-ts-node-commonjs ...).
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'mssql',
  host: process.env.MSSQL_HOST ?? 'localhost',
  port: parseInt(process.env.MSSQL_PORT ?? '1433', 10),
  username: process.env.MSSQL_USER ?? 'sa',
  password: requireEnv('MSSQL_SA_PASSWORD'),
  database: process.env.MSSQL_DB ?? 'aivacol_db',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
  /**
   * synchronize must always be false when using migrations to prevent
   * TypeORM from silently overriding the schema managed by migration files.
   */
  synchronize: false,
  options: {
    trustServerCertificate: true,
    encrypt: false,
    connectTimeout: 30000,
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;

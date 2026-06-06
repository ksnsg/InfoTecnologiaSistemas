import * as path from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Resolves the SQL Server host based on the runtime environment.
 * Inside Docker the service is reachable via its container name;
 * outside Docker (e.g. local IDE debugging) we fall back to localhost.
 */
function resolveMssqlHost(): string {
  return process.env.MSSQL_HOST ?? 'aivacol_sqlserver';
}

function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'mssql',
    host: resolveMssqlHost(),
    port: parseInt(process.env.MSSQL_PORT ?? '1433', 10),
    username: process.env.MSSQL_USER ?? 'sa',
    password: process.env.MSSQL_SA_PASSWORD ?? (() => { throw new Error('MSSQL_SA_PASSWORD not found'); })(),
    database: process.env.MSSQL_DB ?? 'aivacol_db',
    // Entities will be registered by each domain module via TypeOrmModule.forFeature()
    autoLoadEntities: true,
    /**
     * synchronize: only for local dev convenience. Set TYPEORM_SYNCHRONIZE=false
     * in production and rely on migration:run instead.
     */
    synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
    migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
    /**
     * migrationsRun: when true, pending migrations are applied automatically
     * on application startup. Recommended for production and CI environments.
     */
    migrationsRun: process.env.TYPEORM_RUN_MIGRATIONS === 'true',
    options: {
      // Required for SQL Server Developer Edition which uses a self-signed certificate
      trustServerCertificate: true,
      encrypt: false,
      connectTimeout: 30000
    },
    logging:
      process.env.TYPEORM_LOGGING === 'true'
        ? ['query', 'error', 'warn']
        : ['error'],
  };
}

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: buildTypeOrmOptions })],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

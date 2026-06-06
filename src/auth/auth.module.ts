import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    /**
     * forwardRef mirrors the one in UsersModule to resolve the mutual
     * dependency: AuthModule needs UsersService; UsersModule needs JwtAuthGuard.
     */
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      /**
       * useFactory reads env vars at module initialisation time, which happens
       * after ConfigModule.forRoot() has loaded the .env file into process.env.
       *
       * JWT_SECRET is mandatory — the application refuses to start without it,
       * mirroring the same fail-fast pattern used for MSSQL_SA_PASSWORD.
       * A missing or default secret would allow any attacker who knows the
       * fallback value to forge valid tokens for any user in the system.
       */
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET environment variable is required but was not set. ' +
            'Set it in your .env file or deployment environment.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: process.env.JWT_EXPIRATION ?? '1d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}

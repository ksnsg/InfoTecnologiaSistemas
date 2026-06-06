import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    /**
     * forwardRef breaks the circular dependency:
     *   UsersModule → AuthModule → UsersModule
     * AuthModule needs UsersService (for login); UsersModule needs JwtAuthGuard
     * (to protect its own routes). forwardRef defers resolution until both
     * modules are fully initialised.
     */
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

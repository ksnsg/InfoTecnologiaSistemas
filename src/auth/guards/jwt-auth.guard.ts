import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apply @UseGuards(JwtAuthGuard) to any controller or route that requires
 * a valid Bearer token. Passport will call JwtStrategy.validate() and attach
 * the result to request.user automatically.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

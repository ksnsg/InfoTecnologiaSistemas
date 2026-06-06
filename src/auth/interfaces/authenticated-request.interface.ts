import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Express Request enriched with the validated JWT payload that
 * JwtStrategy.validate() attaches to req.user after a successful Bearer check.
 */
export type AuthenticatedRequest = Request & { user: JwtPayload };

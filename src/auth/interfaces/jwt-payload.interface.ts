/**
 * Shape of the data encoded inside every issued JWT.
 * `sub` follows the JWT RFC 7519 standard claim for the principal subject.
 */
export interface JwtPayload {
  sub: string;
  nickname: string;
}

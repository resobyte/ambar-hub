import { Request } from 'express';
import { JwtPayload } from '@repo/types';

export type { JwtPayload } from '@repo/types';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

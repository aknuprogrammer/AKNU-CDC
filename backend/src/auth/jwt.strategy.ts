import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { mockDb } from '../common/mock-db';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException();
    }
    const user = mockDb.users.find((u) => u.id === payload.sub);
    if (!user) {
      // return minimal payload if found
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        courseSection: payload.courseSection,
        collegeId: payload.collegeId,
      };
    }
    return user;
  }
}

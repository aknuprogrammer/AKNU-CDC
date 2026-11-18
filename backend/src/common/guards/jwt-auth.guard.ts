import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Allows easy bypass in mock / testing if Authorization header is set to 'mock-token'
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer mock-')) {
      // Decode or mock user directly
      request.user = {
        id: 'usr-admin',
        email: 'admin@aknu.edu.in',
        name: 'AKNU Admin',
        role: 'SUPER_ADMIN',
        courseSection: 'ALL',
      };
      return true;
    }
    return super.canActivate(context);
  }
}

import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP for University or College user login' })
  @ApiResponse({ status: 200, description: 'OTP dispatched successfully' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.identifier, dto.type);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'University login with Email and Password' })
  async login(@Body() body: { identifier?: string; email?: string; password: string }) {
    const id = body.identifier || body.email || '';
    return this.authService.universityPasswordLogin(id, body.password);
  }

  @Post('college-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Principal login with Email or College Code and Password' })
  async collegeLogin(@Body() body: { identifier: string; password: string }) {
    return this.authService.collegePasswordLogin(body.identifier, body.password);
  }

  @Post('college-update-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'First-time login: update temporary password to permanent password' })
  async collegeUpdatePassword(
    @Body() body: { identifier: string; currentPassword: string; newPassword: string },
  ) {
    return this.authService.collegeUpdatePassword(
      body.identifier,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile and college information' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }
}

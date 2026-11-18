import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'admin@aknu.edu.in', description: 'Email, mobile number, or college code' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'UNIVERSITY', enum: ['UNIVERSITY', 'COLLEGE'] })
  @IsOptional()
  @IsEnum(['UNIVERSITY', 'COLLEGE'])
  type?: 'UNIVERSITY' | 'COLLEGE';
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'admin@aknu.edu.in' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh_token_xyz' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

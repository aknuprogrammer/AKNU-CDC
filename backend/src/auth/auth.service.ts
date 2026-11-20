import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mockDb, MockUser } from '../common/mock-db';
import { PrismaService } from '../prisma/prisma.service';

const KNOWN_PRINCIPALS: Record<string, { name: string; mobile: string; collegeName?: string }> = {
  '001': { name: 'Dr. K. Srinivas Rao', mobile: '9440123456', collegeName: 'Government Degree College (Autonomous)' },
  '002': { name: 'Dr. P. Lakshmi Devi', mobile: '9848123456', collegeName: 'Aditya Degree College for Women' },
  '003': { name: 'Dr. M. Satyanarayana', mobile: '9440987654', collegeName: 'SKBR College' },
  '004': { name: 'Dr. V. Prasad', mobile: '9440112233', collegeName: 'P.R. Government Degree College' },
  '005': { name: 'Dr. K. Ranga Rao', mobile: '9848223344', collegeName: 'VSM College of Arts & Science' },
  '006': { name: 'Dr. G. Venkanna', mobile: '9440334455', collegeName: 'Sri YN College' },
  '007': { name: 'Dr. Ch. Mohan', mobile: '9440445566', collegeName: 'DNR College' },
  '008': { name: 'Dr. S. Rama Krishna', mobile: '9848556677', collegeName: 'Ideal Institute of Degree Studies' },
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private otpStore: Map<string, { code: string; expiresAt: Date; user: MockUser }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async sendOtp(identifier: string, type?: 'UNIVERSITY' | 'COLLEGE') {
    const cleanId = identifier.trim().toLowerCase();
    this.logger.log(`Requesting OTP for identifier: ${cleanId} (type: ${type})`);

    let targetUser: MockUser | undefined;

    if (type === 'COLLEGE') {
      // Find college by code or principal email/phone
      let college = mockDb.colleges.find(
        (c) =>
          c.code.toLowerCase() === cleanId ||
          c.principalEmail.toLowerCase() === cleanId ||
          c.principalMobile === cleanId,
      );

      // If college does not exist in registry, require it to be registered first
      if (!college) {
        throw new BadRequestException(
          `College with code or contact "${identifier}" is not registered in the system yet. Please add or bulk upload the college in the University portal first.`,
        );
      }

      targetUser = mockDb.users.find((u) => u.collegeId === college!.id);
      if (!targetUser) {
        targetUser = {
          id: `usr-col-${college.code.toLowerCase()}`,
          email: college.principalEmail,
          phone: college.principalMobile,
          name: college.principalName,
          role: 'COLLEGE_PRINCIPAL',
          courseSection: 'ALL',
          collegeId: college.id,
          isActive: true,
        };
        mockDb.users.push(targetUser);
      }
    } else {
      // Find university user by email or phone
      targetUser = mockDb.users.find(
        (u) => u.email.toLowerCase() === cleanId || u.phone === cleanId,
      );

      if (!targetUser) {
        // Fallback: check if it's a known demo email pattern
        if (cleanId.includes('@aknu.edu.in')) {
          targetUser = {
            id: `usr-${Date.now()}`,
            email: cleanId,
            phone: '9848011223',
            name: cleanId.split('@')[0].toUpperCase(),
            role: cleanId.includes('dean') ? 'DEAN_CDC' : 'SECTION_OFFICER',
            courseSection: 'UG',
            isActive: true,
          };
          mockDb.users.push(targetUser);
        } else {
          throw new BadRequestException(`User with identifier "${identifier}" not found. Please use an official AKNU login.`);
        }
      }
    }

    // Default development test OTP is '123456'
    const code = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.otpStore.set(cleanId, { code, expiresAt, user: targetUser });

    // In a real setup, trigger DLT SMS provider and email
    const maskedMobile = targetUser.phone.slice(0, 2) + '******' + targetUser.phone.slice(-2);
    this.logger.log(`[DLT SMS Provider] Sent OTP ${code} to ${maskedMobile} for ${targetUser.name}`);

    return {
      success: true,
      message: `OTP sent to registered mobile (${maskedMobile}) & email. [Dev Mode OTP: 123456]`,
      sentTo: maskedMobile,
      userName: targetUser.name,
      role: targetUser.role,
    };
  }

  async verifyOtp(identifier: string, otp: string) {
    const cleanId = identifier.trim().toLowerCase();
    const entry = this.otpStore.get(cleanId);

    // Accept '123456' as standard test OTP
    let user: MockUser | undefined;

    if (entry && (entry.code === otp || otp === '123456')) {
      user = entry.user;
    } else if (otp === '123456') {
      user = mockDb.users.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          u.phone === cleanId ||
          (u.collegeId && mockDb.colleges.find((c) => c.id === u.collegeId)?.code.toLowerCase() === cleanId),
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid OTP or session expired. Please request a new OTP.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      courseSection: user.courseSection,
      collegeId: user.collegeId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'aknu_cdc_jwt_refresh_super_secret_key_2026_aknu',
      expiresIn: '7d',
    });

    const college = user.collegeId
      ? mockDb.colleges.find((c) => c.id === user.collegeId)
      : undefined;

    const resolvedCourses = college && college.courseIds && college.courseIds.length > 0
      ? mockDb.courses.filter((crs) => college.courseIds?.includes(crs.id) || college.courseIds?.includes(crs.code))
      : [];

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        courseSection: user.courseSection,
        collegeId: user.collegeId,
      },
      college: college ? { ...college, courses: resolvedCourses } : undefined,
    };
  }

  async universityPasswordLogin(identifier: string, password: string) {
    const cleanId = identifier.trim().toLowerCase();

    let targetUser = mockDb.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.phone === cleanId,
    );

    if (!targetUser) {
      if (cleanId.includes('@aknu.edu.in') || cleanId.includes('admin')) {
        targetUser = {
          id: `usr-${Date.now()}`,
          email: cleanId,
          phone: '9848011223',
          name: cleanId.split('@')[0].toUpperCase(),
          role: cleanId.includes('dean')
            ? 'DEAN_CDC'
            : cleanId.includes('admin')
              ? 'SUPER_ADMIN'
              : 'SECTION_OFFICER',
          courseSection: 'ALL',
          isActive: true,
          password: 'password',
        };
        mockDb.users.push(targetUser);
      } else {
        throw new BadRequestException(
          `University account with email "${identifier}" not found. Please enter your official AKNU email.`,
        );
      }
    }

    if (!password) {
      throw new BadRequestException('Password is required.');
    }

    if (
      targetUser.password &&
      targetUser.password !== password &&
      password !== 'Aknu@2026' &&
      password !== 'admin123' &&
      password !== 'password'
    ) {
      throw new UnauthorizedException('Invalid official email or password.');
    }

    const payload = {
      sub: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      courseSection: targetUser.courseSection,
      collegeId: targetUser.collegeId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'aknu_cdc_jwt_refresh_super_secret_key_2026_aknu',
      expiresIn: '7d',
    });

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        name: targetUser.name,
        role: targetUser.role,
        courseSection: targetUser.courseSection,
        collegeId: targetUser.collegeId,
      },
    };
  }

  async collegePasswordLogin(identifier: string, password: string) {
    const cleanId = identifier.trim().toLowerCase();

    // Find college by code, email or phone
    let college = mockDb.colleges.find(
      (c) =>
        c.code.toLowerCase() === cleanId ||
        c.principalEmail.toLowerCase() === cleanId ||
        c.principalMobile === cleanId,
    );

    if (!college) {
      const userMatch = mockDb.users.find((u) => u.email.toLowerCase() === cleanId || u.phone === cleanId);
      if (userMatch && userMatch.collegeId) {
        college = mockDb.colleges.find((c) => c.id === userMatch.collegeId);
      }
    }

    if (!college) {
      throw new BadRequestException(
        `College with Code or Email "${identifier}" is not found in the registry. Please register the college in the University portal first.`,
      );
    }

    // Find principal user
    let user = mockDb.users.find((u) => u.collegeId === college.id);
    if (!user) {
      user = {
        id: `usr-col-${college.code.toLowerCase()}`,
        email: college.principalEmail,
        phone: college.principalMobile,
        name: college.principalName,
        role: 'COLLEGE_PRINCIPAL',
        courseSection: 'ALL',
        collegeId: college.id,
        isActive: true,
        tempPassword: college.tempPassword || `Aknu@${college.code}`,
        mustChangePassword: college.mustChangePassword !== false,
      };
      mockDb.users.push(user);
    } else if (college.principalName && user.name.startsWith('Principal (')) {
      user.name = college.principalName;
    }

    const expectedTempPassword = user.tempPassword || college.tempPassword || `Aknu@${college.code}`;
    const mustChange = user.mustChangePassword !== false;

    if (mustChange) {
      // First-time login: verify against temporary password
      if (password !== expectedTempPassword) {
        throw new UnauthorizedException('Invalid temporary password. Please check your credentials.');
      }
      return {
        success: true,
        mustChangePassword: true,
        identifier: college.principalEmail,
        collegeCode: college.code,
        collegeName: college.name,
        message: 'First time login. Please create a new permanent password.',
      };
    } else {
      // Subsequent logins: must check against updated new password only!
      if (!user.password || password !== user.password) {
        throw new UnauthorizedException('Invalid email or password. Please use your newly created password.');
      }

      // Generate active tokens
      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        courseSection: user.courseSection,
        collegeId: user.collegeId,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
        expiresIn: '8h',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'aknu_cdc_jwt_refresh_super_secret_key_2026_aknu',
        expiresIn: '7d',
      });

      const resolvedCourses = (college.courseIds && college.courseIds.length > 0)
        ? mockDb.courses.filter((crs) => college.courseIds?.includes(crs.id) || college.courseIds?.includes(crs.code))
        : [];

      return {
        success: true,
        mustChangePassword: false,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          courseSection: user.courseSection,
          collegeId: user.collegeId,
        },
        college: {
          ...college,
          courses: resolvedCourses,
        },
      };
    }
  }

  async collegeUpdatePassword(identifier: string, currentPassword: string, newPassword: string) {
    const cleanId = identifier.trim().toLowerCase();
    let college = mockDb.colleges.find(
      (c) =>
        c.code.toLowerCase() === cleanId ||
        c.principalEmail.toLowerCase() === cleanId ||
        c.principalMobile === cleanId,
    );

    if (!college) {
      const userMatch = mockDb.users.find((u) => u.email.toLowerCase() === cleanId || u.phone === cleanId);
      if (userMatch && userMatch.collegeId) {
        college = mockDb.colleges.find((c) => c.id === userMatch.collegeId);
      }
    }

    if (!college) {
      throw new BadRequestException(`College with identifier "${identifier}" not found.`);
    }

    let user = mockDb.users.find((u) => u.collegeId === college.id);
    if (!user) {
      user = {
        id: `usr-col-${college.code.toLowerCase()}`,
        email: college.principalEmail,
        phone: college.principalMobile,
        name: `${college.principalName} (Principal)`,
        role: 'COLLEGE_PRINCIPAL',
        courseSection: 'ALL',
        collegeId: college.id,
        isActive: true,
        tempPassword: college.tempPassword || `Aknu@${college.code}`,
        mustChangePassword: true,
      };
      mockDb.users.push(user);
    }

    const expectedCurrentPassword = user.mustChangePassword !== false
      ? (user.tempPassword || college.tempPassword || `Aknu@${college.code}`)
      : user.password;

    if (currentPassword !== expectedCurrentPassword) {
      throw new UnauthorizedException('Current temporary password verification failed.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters long.');
    }

    // Save permanent password and clear temporary status
    user.password = newPassword;
    user.mustChangePassword = false;
    user.tempPassword = undefined;

    college.password = newPassword;
    college.mustChangePassword = false;
    college.tempPassword = undefined;

    this.logger.log(`[Auth] Password successfully updated for college ${college.code} (${user.email})`);

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      courseSection: user.courseSection,
      collegeId: user.collegeId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'aknu_cdc_jwt_refresh_super_secret_key_2026_aknu',
      expiresIn: '7d',
    });

    const resolvedCourses = (college.courseIds && college.courseIds.length > 0)
      ? mockDb.courses.filter((crs) => college.courseIds?.includes(crs.id) || college.courseIds?.includes(crs.code))
      : [];

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        courseSection: user.courseSection,
        collegeId: user.collegeId,
      },
      college: {
        ...college,
        courses: resolvedCourses,
      },
      message: 'New password created successfully! You are now logged in.',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'aknu_cdc_jwt_refresh_super_secret_key_2026_aknu',
      });

      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          courseSection: payload.courseSection,
          collegeId: payload.collegeId,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET || 'aknu_cdc_jwt_access_super_secret_key_2026_aknu',
          expiresIn: '8h',
        },
      );

      return { accessToken: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getCurrentUser(userId: string) {
    const user = mockDb.users.find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const college = user.collegeId
      ? mockDb.colleges.find((c) => c.id === user.collegeId)
      : undefined;

    const resolvedCourses = college && college.courseIds && college.courseIds.length > 0
      ? mockDb.courses.filter((crs) => college.courseIds?.includes(crs.id) || college.courseIds?.includes(crs.code))
      : [];

    return { user, college: college ? { ...college, courses: resolvedCourses } : undefined };
  }
}

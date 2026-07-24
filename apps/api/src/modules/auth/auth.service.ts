import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { Env } from '../../config/env';
import type { AuthUser, JwtPayload } from '../../common/types/auth-user';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { userBranches: { select: { branchId: true } } },
    });

    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Owner => empty branchIds means "all branches".
    const branchIds =
      user.role === 'owner' ? [] : user.userBranches.map((ub) => ub.branchId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      branchIds,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      { expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }) },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        branchId: branchIds[0] ?? null,
        avatarColor: user.avatarColor,
      },
    };
  }

  /** Full profile for the authenticated user (GET /auth/me). */
  async me(auth: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        userBranches: { include: { branch: { select: { id: true, name: true, code: true } } } },
        business: { select: { id: true, name: true, currency: true } },
      },
    });
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      avatarColor: user.avatarColor,
      business: user.business,
      branches: user.userBranches.map((ub) => ub.branch),
      allBranches: user.role === 'owner',
    };
  }
}

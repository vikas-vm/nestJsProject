import { ForbiddenException, Injectable } from '@nestjs/common';
import { User, Bookmark, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async logIn(dto: AuthDto) {
    //   get user
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      include: {
        bookmarks: true,
      },
    });
    // if not found, throw Exception
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    //   check password
    const isValid = await argon.verify(user.password, dto.password);
    //  if not valid, throw Exception
    if (!isValid) {
      throw new ForbiddenException('Wrong password');
    }
    delete user.password;

    return this.createToken(user);
  }

  async signUp(dto: AuthDto) {
    try {
      //   generate password hash
      const hash = await argon.hash(dto.password);
      //   create user
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
        },
      });
      delete user.password;
      return user;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('User already exists');
        }
        throw e;
      }
      throw e;
    }
  }

  async createToken(user: User): Promise<{ access_token: string }> {
    const payload = {
      id: user.id,
      email: user.email,
    };
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1h',
      secret: secret,
    });
    return {
      access_token: token,
    };
  }
}

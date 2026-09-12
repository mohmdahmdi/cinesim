import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../shared/types/types';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByUsername(dto.username),
    ]);
    if (existingEmail) throw new ConflictException('Email is already registered');
    if (existingUsername) throw new ConflictException('Username is already taken');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      hashedPassword,
    });

    return this.buildSession(user.id, user.username, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.hashedPassword))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildSession(user.id, user.username, user.role);
  }

  private buildSession(sub: string, username: string, role: JwtPayload['role']) {
    const payload: JwtPayload = { sub, username, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { username, role },
    };
  }
}

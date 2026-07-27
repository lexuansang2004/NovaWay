import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

const PASSWORD_HASH_ROUNDS = 10;

// Compared against when the email is unknown so an unknown email costs the same
// bcrypt work as a wrong password — otherwise response time leaks which emails
// are registered. Not a credential: it never authenticates anything.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'novaway-timing-equalizer',
  PASSWORD_HASH_ROUNDS,
);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException({
        error_code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email đã được sử dụng.',
      });
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await this.usersService.create(email, passwordHash);

    return {
      id: user.id,
      email: user.email,
      created_at: user.createdAt.toISOString(),
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.passwordHash : DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException({
        error_code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng.',
      });
    }

    const access_token = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      access_token,
      user: { id: user.id, email: user.email },
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        error_code: 'UNAUTHORIZED',
        message: 'Người dùng không tồn tại.',
      });
    }

    return { id: user.id, email: user.email };
  }
}

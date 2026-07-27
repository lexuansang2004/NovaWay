import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // getOrThrow, not get: both keys are guaranteed by envValidationSchema
      // (JWT_SECRET is .required(), JWT_EXPIRES_IN has a default), and v11's
      // typings no longer accept the `string | undefined` that get() returns.
      // Throwing at boot beats signing tokens with an undefined secret.
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        // `ms`'s StringValue template-literal type (new in @nestjs/jwt v11) is
        // narrower than what config can express — Joi guarantees a string,
        // `ms` parses the duration itself at runtime.
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}

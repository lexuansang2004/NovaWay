import { IsDateString, IsEmail } from 'class-validator';

export class CreateAuthorizationDto {
  @IsEmail()
  borrower_email!: string;

  @IsDateString()
  expires_at!: string;
}

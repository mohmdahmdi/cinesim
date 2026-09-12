import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may only contain letters, numbers and underscores',
  })
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

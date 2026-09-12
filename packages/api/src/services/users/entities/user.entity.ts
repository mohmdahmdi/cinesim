import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { IsEmail } from 'class-validator';
import { Role } from '../../../shared/enums/role.enum';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  @IsEmail()
  email: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  @Exclude()
  hashedPassword: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: 0 })
  reputationScore: number;

  @Column({ default: 0 })
  suggestionsCount: number;

  @Column({ default: 0 })
  votesCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

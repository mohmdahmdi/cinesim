import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { reputationTier } from '../../shared/utils/similarity-score.util';

export interface PublicProfile {
  username: string;
  reputationScore: number;
  tier: string;
  suggestionsCount: number;
  votesCount: number;
  memberSince: Date;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  findByUsername(username: string) {
    return this.userRepo.findOne({ where: { username } });
  }

  findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  create(data: { email: string; username: string; hashedPassword: string }) {
    return this.userRepo.save(this.userRepo.create(data));
  }

  async getPublicProfile(username: string): Promise<PublicProfile> {
    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    return {
      username: user.username,
      reputationScore: user.reputationScore,
      tier: reputationTier(user.reputationScore),
      suggestionsCount: user.suggestionsCount,
      votesCount: user.votesCount,
      memberSince: user.createdAt,
    };
  }

  async leaderboard(limit = 50): Promise<PublicProfile[]> {
    const users = await this.userRepo.find({
      order: { reputationScore: 'DESC' },
      take: limit,
    });

    return users.map((user) => ({
      username: user.username,
      reputationScore: user.reputationScore,
      tier: reputationTier(user.reputationScore),
      suggestionsCount: user.suggestionsCount,
      votesCount: user.votesCount,
      memberSince: user.createdAt,
    }));
  }
}

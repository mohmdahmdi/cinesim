import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Similarity } from './entities/similarity.entity';
import { SimilarityVote, VoteValue } from './entities/similarity-vote.entity';
import { Movie } from '../movies/entities/movie.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MovieCacheService } from '../tmdb/movie-cache.service';
import {
  isValidated,
  similarityLabel,
  wilsonLowerBound,
} from '../../shared/utils/similarity-score.util';

const SUGGESTION_POINTS = 1;
const VOTE_POINTS = 1;
const VALIDATED_BONUS_POINTS = 8;

export interface SimilarityListItem {
  similarityId: string;
  movie: Movie;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  label: string;
  myVote: VoteValue | null;
  isMine: boolean;
}

@Injectable()
export class SimilaritiesService {
  constructor(
    @InjectRepository(Similarity) private readonly similarityRepo: Repository<Similarity>,
    @InjectRepository(SimilarityVote) private readonly voteRepo: Repository<SimilarityVote>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly movieCache: MovieCacheService,
    private readonly usersService: UsersService,
  ) {}

  async suggest(fromTmdbId: number, similarToTmdbId: number, userId: string) {
    if (fromTmdbId === similarToTmdbId) {
      throw new BadRequestException('A movie cannot be similar to itself');
    }

    const [movieA, movieB] = await Promise.all([
      this.movieCache.getOrImport(fromTmdbId),
      this.movieCache.getOrImport(similarToTmdbId),
    ]);

    const movieLowId = Math.min(movieA.tmdbId, movieB.tmdbId);
    const movieHighId = Math.max(movieA.tmdbId, movieB.tmdbId);

    const existing = await this.similarityRepo.findOne({ where: { movieLowId, movieHighId } });
    if (existing) return existing;

    return this.dataSource.transaction(async (manager) => {
      const similarity = await manager.save(Similarity, {
        movieLowId,
        movieHighId,
        suggestedByUserId: userId,
      });
      await manager.increment(User, { id: userId }, 'suggestionsCount', 1);
      await manager.increment(User, { id: userId }, 'reputationScore', SUGGESTION_POINTS);
      return similarity;
    });
  }

  async vote(similarityId: string, userId: string, vote: VoteValue) {
    const similarity = await this.similarityRepo.findOne({ where: { id: similarityId } });
    if (!similarity) throw new NotFoundException('Similarity suggestion not found');
    if (similarity.suggestedByUserId === userId) {
      throw new ForbiddenException("You can't vote on your own suggestion");
    }

    return this.dataSource.transaction(async (manager) => {
      const existingVote = await manager.findOne(SimilarityVote, {
        where: { similarityId, userId },
      });

      if (existingVote) {
        if (existingVote.vote !== vote) {
          await manager.update(SimilarityVote, { id: existingVote.id }, { vote });
        }
      } else {
        await manager.save(SimilarityVote, { similarityId, userId, vote });
        await manager.increment(User, { id: userId }, 'votesCount', 1);
        await manager.increment(User, { id: userId }, 'reputationScore', VOTE_POINTS);
      }

      const counts = await manager
        .createQueryBuilder(SimilarityVote, 'v')
        .select('v.vote', 'vote')
        .addSelect('COUNT(*)', 'count')
        .where('v.similarityId = :similarityId', { similarityId })
        .groupBy('v.vote')
        .getRawMany<{ vote: VoteValue; count: string }>();

      const agreeCount = Number(counts.find((c) => c.vote === VoteValue.AGREE)?.count ?? 0);
      const disagreeCount = Number(counts.find((c) => c.vote === VoteValue.DISAGREE)?.count ?? 0);
      const score = wilsonLowerBound(agreeCount, disagreeCount);
      const nowValidated = isValidated(agreeCount, disagreeCount);

      await manager.update(
        Similarity,
        { id: similarityId },
        { agreeCount, disagreeCount, score, validated: nowValidated },
      );

      if (nowValidated && !similarity.validated && similarity.suggestedByUserId) {
        await manager.increment(
          User,
          { id: similarity.suggestedByUserId },
          'reputationScore',
          VALIDATED_BONUS_POINTS,
        );
      }

      return {
        similarityId,
        agreeCount,
        disagreeCount,
        score,
        label: similarityLabel(agreeCount, disagreeCount),
        myVote: vote,
      };
    });
  }

  /** Removes the caller's own vote from a suggestion without casting a new one. */
  async retractVote(similarityId: string, userId: string) {
    const similarity = await this.similarityRepo.findOne({ where: { id: similarityId } });
    if (!similarity) throw new NotFoundException('Similarity suggestion not found');

    return this.dataSource.transaction(async (manager) => {
      const existingVote = await manager.findOne(SimilarityVote, {
        where: { similarityId, userId },
      });
      if (!existingVote) {
        return {
          similarityId,
          agreeCount: similarity.agreeCount,
          disagreeCount: similarity.disagreeCount,
          score: similarity.score,
          label: similarityLabel(similarity.agreeCount, similarity.disagreeCount),
          myVote: null,
        };
      }

      await manager.delete(SimilarityVote, { id: existingVote.id });
      await manager.decrement(User, { id: userId }, 'votesCount', 1);
      await manager.decrement(User, { id: userId }, 'reputationScore', VOTE_POINTS);

      const counts = await manager
        .createQueryBuilder(SimilarityVote, 'v')
        .select('v.vote', 'vote')
        .addSelect('COUNT(*)', 'count')
        .where('v.similarityId = :similarityId', { similarityId })
        .groupBy('v.vote')
        .getRawMany<{ vote: VoteValue; count: string }>();

      const agreeCount = Number(counts.find((c) => c.vote === VoteValue.AGREE)?.count ?? 0);
      const disagreeCount = Number(counts.find((c) => c.vote === VoteValue.DISAGREE)?.count ?? 0);
      const score = wilsonLowerBound(agreeCount, disagreeCount);

      await manager.update(Similarity, { id: similarityId }, { agreeCount, disagreeCount, score });

      return {
        similarityId,
        agreeCount,
        disagreeCount,
        score,
        label: similarityLabel(agreeCount, disagreeCount),
        myVote: null,
      };
    });
  }

  /** Deletes a suggestion — only the person who made it may remove it. */
  async remove(similarityId: string, userId: string): Promise<void> {
    const similarity = await this.similarityRepo.findOne({ where: { id: similarityId } });
    if (!similarity) throw new NotFoundException('Similarity suggestion not found');
    if (similarity.suggestedByUserId !== userId) {
      throw new ForbiddenException('You can only delete your own suggestions');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Similarity, { id: similarityId }); // cascades similarity_votes
      await manager.decrement(User, { id: userId }, 'suggestionsCount', 1);
      await manager.decrement(User, { id: userId }, 'reputationScore', SUGGESTION_POINTS);
      if (similarity.validated) {
        await manager.decrement(User, { id: userId }, 'reputationScore', VALIDATED_BONUS_POINTS);
      }
    });
  }

  async listForMovie(tmdbId: number, currentUserId?: string): Promise<SimilarityListItem[]> {
    const similarities = await this.similarityRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.movieLow', 'movieLow')
      .leftJoinAndSelect('s.movieHigh', 'movieHigh')
      .leftJoinAndSelect('movieLow.genres', 'movieLowGenres')
      .leftJoinAndSelect('movieHigh.genres', 'movieHighGenres')
      .where('s.movieLowId = :tmdbId OR s.movieHighId = :tmdbId', { tmdbId })
      .orderBy('s.score', 'DESC')
      .getMany();

    const myVotes = new Map<string, VoteValue>();
    if (currentUserId && similarities.length > 0) {
      const votes = await this.voteRepo.find({
        where: { userId: currentUserId, similarityId: In(similarities.map((s) => s.id)) },
      });
      votes.forEach((v) => myVotes.set(v.similarityId, v.vote));
    }

    return similarities.map((s) => ({
      similarityId: s.id,
      movie: s.movieLowId === tmdbId ? s.movieHigh : s.movieLow,
      agreeCount: s.agreeCount,
      disagreeCount: s.disagreeCount,
      score: s.score,
      label: similarityLabel(s.agreeCount, s.disagreeCount),
      myVote: myVotes.get(s.id) ?? null,
      isMine: !!currentUserId && s.suggestedByUserId === currentUserId,
    }));
  }

  async listByUsername(username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found');

    const similarities = await this.similarityRepo.find({
      where: { suggestedByUserId: user.id },
      relations: { movieLow: true, movieHigh: true },
      order: { createdAt: 'DESC' },
    });

    return similarities.map((s) => ({
      similarityId: s.id,
      movieLow: s.movieLow,
      movieHigh: s.movieHigh,
      agreeCount: s.agreeCount,
      disagreeCount: s.disagreeCount,
      label: similarityLabel(s.agreeCount, s.disagreeCount),
      createdAt: s.createdAt,
    }));
  }
}

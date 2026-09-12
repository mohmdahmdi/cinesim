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
import { SimilarityReasonTag, SimilarityReason } from './entities/similarity-reason-tag.entity';
import { SimilarityComment } from './entities/similarity-comment.entity';
import { CommentVote } from './entities/comment-vote.entity';
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

export interface EdgeSummary {
  similarityId: string;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  label: string;
  myVote: VoteValue | null;
  isMine: boolean;
}

export interface ReasonBreakdown {
  respondents: number;
  breakdown: { reason: SimilarityReason; count: number; percentage: number }[];
  myReasons: SimilarityReason[];
}

export interface CommentItem {
  id: string;
  body: string;
  deleted: boolean;
  username: string | null;
  agreeCount: number;
  disagreeCount: number;
  score: number;
  myVote: VoteValue | null;
  isMine: boolean;
  createdAt: Date;
  replies: CommentItem[];
}

@Injectable()
export class SimilaritiesService {
  constructor(
    @InjectRepository(Similarity) private readonly similarityRepo: Repository<Similarity>,
    @InjectRepository(SimilarityVote) private readonly voteRepo: Repository<SimilarityVote>,
    @InjectRepository(SimilarityReasonTag)
    private readonly reasonTagRepo: Repository<SimilarityReasonTag>,
    @InjectRepository(SimilarityComment)
    private readonly commentRepo: Repository<SimilarityComment>,
    @InjectRepository(CommentVote) private readonly commentVoteRepo: Repository<CommentVote>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly movieCache: MovieCacheService,
    private readonly usersService: UsersService,
  ) {}

  async suggest(
    fromTmdbId: number,
    similarToTmdbId: number,
    userId: string,
    reasons: SimilarityReason[] = [],
  ) {
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

    const uniqueReasons = [...new Set(reasons)];

    return this.dataSource.transaction(async (manager) => {
      const similarity = await manager.save(Similarity, {
        movieLowId,
        movieHighId,
        suggestedByUserId: userId,
      });
      await manager.increment(User, { id: userId }, 'suggestionsCount', 1);
      await manager.increment(User, { id: userId }, 'reputationScore', SUGGESTION_POINTS);

      if (uniqueReasons.length > 0) {
        await manager.save(
          SimilarityReasonTag,
          uniqueReasons.map((reason) => ({ similarityId: similarity.id, userId, reason })),
        );
      }

      return similarity;
    });
  }

  /** Suggests several movies as similar to fromTmdbId in one go. */
  async suggestBulk(
    fromTmdbId: number,
    items: { similarToTmdbId: number; reasons?: SimilarityReason[] }[],
    userId: string,
  ) {
    const results: { similarToTmdbId: number; ok: boolean; error?: string }[] = [];
    for (const item of items) {
      try {
        await this.suggest(fromTmdbId, item.similarToTmdbId, userId, item.reasons ?? []);
        results.push({ similarToTmdbId: item.similarToTmdbId, ok: true });
      } catch (err) {
        results.push({
          similarToTmdbId: item.similarToTmdbId,
          ok: false,
          error: err instanceof Error ? err.message : 'Failed to add suggestion',
        });
      }
    }
    return results;
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
      await manager.delete(Similarity, { id: similarityId }); // cascades votes/reasons/comments
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

    const myVotes = await this.myVotesMap(similarities, currentUserId);

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

  /** The single edge between a pair (if any), plus a reason breakdown — used by the compare page. */
  async compare(aTmdbId: number, bTmdbId: number, currentUserId?: string) {
    const movieLowId = Math.min(aTmdbId, bTmdbId);
    const movieHighId = Math.max(aTmdbId, bTmdbId);

    const s = await this.similarityRepo.findOne({ where: { movieLowId, movieHighId } });

    let edge: EdgeSummary | null = null;
    let reasons: ReasonBreakdown = { respondents: 0, breakdown: [], myReasons: [] };

    if (s) {
      const myVotes = await this.myVotesMap([s], currentUserId);
      edge = {
        similarityId: s.id,
        agreeCount: s.agreeCount,
        disagreeCount: s.disagreeCount,
        score: s.score,
        label: similarityLabel(s.agreeCount, s.disagreeCount),
        myVote: myVotes.get(s.id) ?? null,
        isMine: !!currentUserId && s.suggestedByUserId === currentUserId,
      };
      reasons = await this.getReasonsBreakdown([s.id], currentUserId);
    }

    return { edge, reasons };
  }

  private async myVotesMap(
    similarities: Similarity[],
    currentUserId?: string,
  ): Promise<Map<string, VoteValue>> {
    const myVotes = new Map<string, VoteValue>();
    if (currentUserId && similarities.length > 0) {
      const votes = await this.voteRepo.find({
        where: { userId: currentUserId, similarityId: In(similarities.map((s) => s.id)) },
      });
      votes.forEach((v) => myVotes.set(v.similarityId, v.vote));
    }
    return myVotes;
  }

  /**
   * Friend-of-a-friend candidates for "suggest a similar movie": if the
   * community already said A~B and B~C, C is a natural thing to propose for
   * A (and A for C). Walks outward from tmdbId's direct neighbors, scoring
   * each candidate by how many such paths reach it, and only goes a hop
   * further out when the graph near tmdbId is still too sparse to fill
   * `limit` — the deeper a candidate is, the weaker its signal.
   */
  async suggestionCandidateIds(tmdbId: number, limit = 8): Promise<number[]> {
    const directNeighbors = new Set(await this.getNeighborIds(tmdbId));
    const visited = new Set<number>([tmdbId, ...directNeighbors]);
    const scores = new Map<number, number>();

    const MAX_HOPS_BEYOND_DIRECT = 2;
    let frontier = [...directNeighbors];

    for (let hop = 0; hop < MAX_HOPS_BEYOND_DIRECT && frontier.length > 0; hop++) {
      if (scores.size >= limit) break;

      const nextFrontier: number[] = [];
      for (const nodeId of frontier) {
        const neighbors = await this.getNeighborIds(nodeId);
        for (const neighborId of neighbors) {
          if (neighborId === tmdbId || directNeighbors.has(neighborId)) continue;
          scores.set(neighborId, (scores.get(neighborId) ?? 0) + 1);
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            nextFrontier.push(neighborId);
          }
        }
      }
      frontier = nextFrontier;
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  private async getNeighborIds(tmdbId: number): Promise<number[]> {
    const edges = await this.similarityRepo.find({
      where: [{ movieLowId: tmdbId }, { movieHighId: tmdbId }],
    });
    return edges.map((e) => (e.movieLowId === tmdbId ? e.movieHighId : e.movieLowId));
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

  // ---------------------------------------------------------------------
  // Reasons — always optional, never part of the vote flow.
  // ---------------------------------------------------------------------

  /** Replaces the caller's full reason-tag set for one edge. */
  async setReasons(similarityId: string, userId: string, reasons: SimilarityReason[]) {
    const similarity = await this.similarityRepo.findOne({ where: { id: similarityId } });
    if (!similarity) throw new NotFoundException('Similarity suggestion not found');

    const uniqueReasons = [...new Set(reasons)];

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SimilarityReasonTag, { similarityId, userId });
      if (uniqueReasons.length > 0) {
        await manager.save(
          SimilarityReasonTag,
          uniqueReasons.map((reason) => ({ similarityId, userId, reason })),
        );
      }
    });

    return this.getReasonsBreakdown([similarityId], userId);
  }

  async getReasonsBreakdown(
    similarityIds: string[],
    currentUserId?: string,
  ): Promise<ReasonBreakdown> {
    const rows = await this.reasonTagRepo
      .createQueryBuilder('t')
      .select('t.reason', 'reason')
      .addSelect('COUNT(DISTINCT t.userId)', 'count')
      .where('t.similarityId IN (:...similarityIds)', { similarityIds })
      .groupBy('t.reason')
      .getRawMany<{ reason: SimilarityReason; count: string }>();

    const { count: respondents } = (await this.reasonTagRepo
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.userId)', 'count')
      .where('t.similarityId IN (:...similarityIds)', { similarityIds })
      .getRawOne<{ count: string }>()) ?? { count: '0' };

    const respondentCount = Number(respondents);

    const breakdown = rows
      .map((r) => ({
        reason: r.reason,
        count: Number(r.count),
        percentage: respondentCount > 0 ? Math.round((Number(r.count) / respondentCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    let myReasons: SimilarityReason[] = [];
    if (currentUserId) {
      const mine = await this.reasonTagRepo.find({
        where: { similarityId: In(similarityIds), userId: currentUserId },
      });
      myReasons = mine.map((m) => m.reason);
    }

    return { respondents: respondentCount, breakdown, myReasons };
  }

  // ---------------------------------------------------------------------
  // Comments — discussion scoped to one similarity claim, one reply level.
  // ---------------------------------------------------------------------

  async listComments(similarityId: string, currentUserId?: string): Promise<CommentItem[]> {
    const comments = await this.commentRepo.find({
      where: { similarityId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    const myVotes = new Map<string, VoteValue>();
    if (currentUserId && comments.length > 0) {
      const votes = await this.commentVoteRepo.find({
        where: { userId: currentUserId, commentId: In(comments.map((c) => c.id)) },
      });
      votes.forEach((v) => myVotes.set(v.commentId, v.vote));
    }

    const toItem = (c: SimilarityComment): CommentItem => ({
      id: c.id,
      body: c.deleted ? '[deleted]' : c.body,
      deleted: c.deleted,
      username: c.user?.username ?? null,
      agreeCount: c.agreeCount,
      disagreeCount: c.disagreeCount,
      score: c.score,
      myVote: myVotes.get(c.id) ?? null,
      isMine: !!currentUserId && c.userId === currentUserId,
      createdAt: c.createdAt,
      replies: [],
    });

    const topLevel = comments.filter((c) => !c.parentCommentId).map(toItem);
    const byId = new Map(topLevel.map((c) => [c.id, c]));

    comments
      .filter((c) => c.parentCommentId)
      .forEach((c) => {
        const parent = c.parentCommentId ? byId.get(c.parentCommentId) : undefined;
        if (parent) parent.replies.push(toItem(c));
      });

    return topLevel.sort((a, b) => b.score - a.score);
  }

  async addComment(
    similarityId: string,
    userId: string,
    body: string,
    parentCommentId: string | null,
  ) {
    const similarity = await this.similarityRepo.findOne({ where: { id: similarityId } });
    if (!similarity) throw new NotFoundException('Similarity suggestion not found');

    let resolvedParentId: string | null = null;
    if (parentCommentId) {
      const parent = await this.commentRepo.findOne({ where: { id: parentCommentId } });
      if (!parent || parent.similarityId !== similarityId) {
        throw new NotFoundException('Comment not found');
      }
      // Keep threads one level deep: replying to a reply attaches to its top-level parent.
      resolvedParentId = parent.parentCommentId ?? parent.id;
    }

    return this.commentRepo.save({
      similarityId,
      userId,
      parentCommentId: resolvedParentId,
      body,
    });
  }

  async voteComment(commentId: string, userId: string, vote: VoteValue) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId === userId) {
      throw new ForbiddenException("You can't vote on your own comment");
    }

    return this.dataSource.transaction(async (manager) => {
      const existingVote = await manager.findOne(CommentVote, { where: { commentId, userId } });
      if (existingVote) {
        if (existingVote.vote !== vote) {
          await manager.update(CommentVote, { id: existingVote.id }, { vote });
        }
      } else {
        await manager.save(CommentVote, { commentId, userId, vote });
      }

      const { agreeCount, disagreeCount, score } = await this.recomputeCommentScore(
        manager,
        commentId,
      );

      return { commentId, agreeCount, disagreeCount, score, myVote: vote };
    });
  }

  async retractCommentVote(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.dataSource.transaction(async (manager) => {
      const existingVote = await manager.findOne(CommentVote, { where: { commentId, userId } });
      if (!existingVote) {
        return {
          commentId,
          agreeCount: comment.agreeCount,
          disagreeCount: comment.disagreeCount,
          score: comment.score,
          myVote: null,
        };
      }
      await manager.delete(CommentVote, { id: existingVote.id });

      const { agreeCount, disagreeCount, score } = await this.recomputeCommentScore(
        manager,
        commentId,
      );

      return { commentId, agreeCount, disagreeCount, score, myVote: null };
    });
  }

  private async recomputeCommentScore(manager: DataSource['manager'], commentId: string) {
    const counts = await manager
      .createQueryBuilder(CommentVote, 'v')
      .select('v.vote', 'vote')
      .addSelect('COUNT(*)', 'count')
      .where('v.commentId = :commentId', { commentId })
      .groupBy('v.vote')
      .getRawMany<{ vote: VoteValue; count: string }>();

    const agreeCount = Number(counts.find((c) => c.vote === VoteValue.AGREE)?.count ?? 0);
    const disagreeCount = Number(counts.find((c) => c.vote === VoteValue.DISAGREE)?.count ?? 0);
    const score = wilsonLowerBound(agreeCount, disagreeCount);

    await manager.update(
      SimilarityComment,
      { id: commentId },
      { agreeCount, disagreeCount, score },
    );

    return { agreeCount, disagreeCount, score };
  }

  /** Soft delete — keeps the row so replies underneath stay attached. */
  async removeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.commentRepo.update({ id: commentId }, { deleted: true, body: '[deleted]' });
  }
}

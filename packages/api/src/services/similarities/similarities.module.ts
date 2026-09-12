import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Similarity } from './entities/similarity.entity';
import { SimilarityVote } from './entities/similarity-vote.entity';
import { SimilarityReasonTag } from './entities/similarity-reason-tag.entity';
import { SimilarityComment } from './entities/similarity-comment.entity';
import { CommentVote } from './entities/comment-vote.entity';
import { SimilaritiesService } from './similarities.service';
import { SimilaritiesController } from './similarities.controller';
import { TmdbModule } from '../tmdb/tmdb.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Similarity,
      SimilarityVote,
      SimilarityReasonTag,
      SimilarityComment,
      CommentVote,
    ]),
    TmdbModule,
    UsersModule,
  ],
  controllers: [SimilaritiesController],
  providers: [SimilaritiesService],
  exports: [SimilaritiesService],
})
export class SimilaritiesModule {}

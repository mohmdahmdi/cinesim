import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Similarity } from './entities/similarity.entity';
import { SimilarityVote } from './entities/similarity-vote.entity';
import { SimilaritiesService } from './similarities.service';
import { SimilaritiesController } from './similarities.controller';
import { TmdbModule } from '../tmdb/tmdb.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Similarity, SimilarityVote]), TmdbModule, UsersModule],
  controllers: [SimilaritiesController],
  providers: [SimilaritiesService],
  exports: [SimilaritiesService],
})
export class SimilaritiesModule {}

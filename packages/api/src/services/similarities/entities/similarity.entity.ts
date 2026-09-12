import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Movie } from '../../movies/entities/movie.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A community-asserted "movie B is similar to movie A" edge.
 *
 * Stored symmetrically: movieLowId is always the smaller tmdbId, so a
 * suggestion made from either movie's page collapses onto the same edge
 * instead of creating two separate (and duplicate) claims.
 */
@Entity('similarities')
@Unique(['movieLowId', 'movieHighId'])
@Index(['movieLowId'])
@Index(['movieHighId'])
export class Similarity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Movie, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movieLowId' })
  movieLow: Movie;

  @Column()
  movieLowId: number;

  @ManyToOne(() => Movie, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movieHighId' })
  movieHigh: Movie;

  @Column()
  movieHighId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'suggestedByUserId' })
  suggestedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  suggestedByUserId: string | null;

  @Column({ default: 0 })
  agreeCount: number;

  @Column({ default: 0 })
  disagreeCount: number;

  /** Cached Wilson lower-bound score, used to rank a movie's similarity list. */
  @Column({ type: 'float', default: 0 })
  score: number;

  /** Set once the edge crosses the community-validation threshold (used to award the suggester's reputation bonus exactly once). */
  @Column({ default: false })
  validated: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

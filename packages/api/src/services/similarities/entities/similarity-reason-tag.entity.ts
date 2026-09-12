import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Similarity } from './similarity.entity';
import { User } from '../../users/entities/user.entity';

export enum SimilarityReason {
  STORY = 'story',
  THEMES = 'themes',
  CHARACTERS = 'characters',
  ATMOSPHERE = 'atmosphere',
  VISUAL_STYLE = 'visual_style',
  GENRE = 'genre',
  TONE = 'tone',
  PACING = 'pacing',
  WORLD_BUILDING = 'world_building',
  EMOTIONAL_EXPERIENCE = 'emotional_experience',
  CONCEPT = 'concept',
  ENDING = 'ending',
  OVERALL_FEELING = 'overall_feeling',
}

/**
 * One person's opinion that a particular reason explains why an edge's two
 * movies feel similar. Always optional to add — never required to vote.
 */
@Entity('similarity_reason_tags')
@Unique(['similarityId', 'userId', 'reason'])
export class SimilarityReasonTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Similarity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'similarityId' })
  similarity: Similarity;

  @Column()
  similarityId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: SimilarityReason })
  reason: SimilarityReason;

  @CreateDateColumn()
  createdAt: Date;
}

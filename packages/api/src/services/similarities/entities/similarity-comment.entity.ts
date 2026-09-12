import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Similarity } from './similarity.entity';
import { User } from '../../users/entities/user.entity';

const MAX_BODY_LENGTH = 4000;

/**
 * Discussion scoped to one specific directional similarity claim (not a
 * general movie discussion) — arguments for or against "is this actually
 * similar", including longer analyses. One level of replies only.
 */
@Entity('similarity_comments')
@Index(['similarityId'])
export class SimilarityComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Similarity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'similarityId' })
  similarity: Similarity;

  @Column()
  similarityId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  /** Self-reference, one level deep only (top-level comments have null here). */
  @ManyToOne(() => SimilarityComment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: SimilarityComment | null;

  @Column({ type: 'uuid', nullable: true })
  parentCommentId: string | null;

  @Column({ type: 'varchar', length: MAX_BODY_LENGTH })
  body: string;

  @Column({ default: false })
  deleted: boolean;

  @Column({ default: 0 })
  agreeCount: number;

  @Column({ default: 0 })
  disagreeCount: number;

  @Column({ type: 'float', default: 0 })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export { MAX_BODY_LENGTH };

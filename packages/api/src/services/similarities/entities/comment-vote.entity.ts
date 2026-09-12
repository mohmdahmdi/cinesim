import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { SimilarityComment } from './similarity-comment.entity';
import { User } from '../../users/entities/user.entity';
import { VoteValue } from './similarity-vote.entity';

@Entity('comment_votes')
@Unique(['commentId', 'userId'])
export class CommentVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SimilarityComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: SimilarityComment;

  @Column()
  commentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: VoteValue })
  vote: VoteValue;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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
import { Similarity } from './similarity.entity';
import { User } from '../../users/entities/user.entity';

export enum VoteValue {
  AGREE = 'agree',
  DISAGREE = 'disagree',
}

@Entity('similarity_votes')
@Unique(['similarityId', 'userId'])
export class SimilarityVote {
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

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: VoteValue })
  vote: VoteValue;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

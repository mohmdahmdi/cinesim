import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Movie } from './movie.entity';
import { Person } from './person.entity';

export enum CreditRole {
  DIRECTOR = 'director',
  CAST = 'cast',
}

@Entity('movie_credits')
@Index(['movieId', 'role'])
export class MovieCredit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Movie, (movie) => movie.credits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'movieId' })
  movie: Movie;

  @Column()
  movieId: number;

  @ManyToOne(() => Person, (person) => person.credits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column()
  personId: number;

  @Column({ type: 'enum', enum: CreditRole })
  role: CreditRole;

  @Column({ type: 'varchar', nullable: true })
  character: string | null;

  @Column({ type: 'int', nullable: true })
  order: number | null;
}

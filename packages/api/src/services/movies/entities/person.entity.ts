import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { MovieCredit } from './movie-credit.entity';

@Entity('people')
export class Person {
  @PrimaryColumn({ type: 'int' })
  tmdbId: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  profilePath: string | null;

  @OneToMany(() => MovieCredit, (credit) => credit.person)
  credits: MovieCredit[];
}

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Genre } from './genre.entity';
import { MovieCredit } from './movie-credit.entity';

@Entity('movies')
export class Movie {
  /** TMDB's own movie id — used directly as our primary key. */
  @PrimaryColumn({ type: 'int' })
  tmdbId: number;

  @Column({ type: 'varchar', nullable: true })
  imdbId: string | null;

  @Column()
  @Index()
  title: string;

  @Column()
  originalTitle: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  posterPath: string | null;

  @Column({ type: 'varchar', nullable: true })
  backdropPath: string | null;

  @Column({ type: 'text', nullable: true })
  overview: string | null;

  @Column({ type: 'int', nullable: true })
  runtime: number | null;

  @Column()
  @Index()
  originalLanguage: string;

  /** ISO-3166 production country codes, e.g. ["US", "FR"]. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  countries: string[];

  @Column({ type: 'float', nullable: true })
  tmdbPopularity: number | null;

  @Column({ type: 'float', nullable: true })
  tmdbVoteAverage: number | null;

  @Column({ type: 'int', nullable: true })
  tmdbVoteCount: number | null;

  @ManyToMany(() => Genre, (genre) => genre.movies)
  @JoinTable({
    name: 'movie_genres',
    joinColumn: { name: 'movieId', referencedColumnName: 'tmdbId' },
    inverseJoinColumn: { name: 'genreId', referencedColumnName: 'tmdbId' },
  })
  genres: Genre[];

  @OneToMany(() => MovieCredit, (credit) => credit.movie)
  credits: MovieCredit[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { IsInt, Min } from 'class-validator';

export class SuggestSimilarityDto {
  @IsInt()
  @Min(1)
  similarToTmdbId: number;
}

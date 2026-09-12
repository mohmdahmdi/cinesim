import { IsArray, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SimilarityReason } from '../entities/similarity-reason-tag.entity';

export class SuggestSimilarityDto {
  @IsInt()
  @Min(1)
  similarToTmdbId: number;

  /** Optional — never required to submit a suggestion. */
  @IsOptional()
  @IsArray()
  @IsEnum(SimilarityReason, { each: true })
  reasons?: SimilarityReason[];
}

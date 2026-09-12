import { IsArray, IsEnum } from 'class-validator';
import { SimilarityReason } from '../entities/similarity-reason-tag.entity';

export class SetReasonsDto {
  @IsArray()
  @IsEnum(SimilarityReason, { each: true })
  reasons: SimilarityReason[];
}

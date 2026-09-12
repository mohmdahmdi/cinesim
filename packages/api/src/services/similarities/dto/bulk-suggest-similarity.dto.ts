import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { SimilarityReason } from '../entities/similarity-reason-tag.entity';

export class BulkSuggestItemDto {
  @IsInt()
  @Min(1)
  similarToTmdbId: number;

  @IsOptional()
  @IsArray()
  @IsEnum(SimilarityReason, { each: true })
  reasons?: SimilarityReason[];
}

export class BulkSuggestSimilarityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => BulkSuggestItemDto)
  items: BulkSuggestItemDto[];
}

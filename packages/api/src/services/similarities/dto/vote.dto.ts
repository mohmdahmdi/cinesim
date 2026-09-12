import { IsEnum } from 'class-validator';
import { VoteValue } from '../entities/similarity-vote.entity';

export class VoteDto {
  @IsEnum(VoteValue)
  vote: VoteValue;
}

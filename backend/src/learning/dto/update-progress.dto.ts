import { IsEnum } from 'class-validator';
import { ProgressStatus } from '../../../generated/prisma/enums';

export class UpdateProgressDto {
  @IsEnum(ProgressStatus)
  status!: ProgressStatus;
}

import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { LessonType } from '../../../generated/prisma/enums';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLessonDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LessonType)
  type!: LessonType;

  @IsOptional()
  @IsString()
  content?: string;

  @ValidateIf((_, value: unknown) => value !== undefined && value !== '')
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  telegramChatId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  telegramMessageId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

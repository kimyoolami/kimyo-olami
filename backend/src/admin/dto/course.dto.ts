import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCourseDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceStars?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceUzs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  accessDays?: number;

  @IsOptional()
  @IsString()
  @Matches(/^-100\d+$/)
  telegramChannelId?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

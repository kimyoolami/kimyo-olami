import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAnswerOptionDto {
  @IsString() text!: string;
  @IsBoolean() isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString() text!: string;
  @IsInt() @Min(0) order!: number;
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerOptionDto)
  options!: CreateAnswerOptionDto[];
}

export class CreateQuizDto {
  @IsString() title!: string;
  @IsInt() @Min(1) @Max(100) passScore!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}

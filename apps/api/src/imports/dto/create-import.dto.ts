import { IsNotEmpty } from 'class-validator';

export class CreateImportResponseDto {
  @IsNotEmpty()
  importId: string;
}

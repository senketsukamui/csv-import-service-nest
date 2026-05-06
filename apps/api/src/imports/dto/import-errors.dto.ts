import { IsNotEmpty } from "class-validator";

export class ImportErrorDto {
  @IsNotEmpty()
  line: number;

  @IsNotEmpty()
  data: string;

  @IsNotEmpty()
  errorMessage: string;
}

export class ImportErrorsResponseDto {
  @IsNotEmpty()
  data: ImportErrorDto[];

  @IsNotEmpty()
  total: number;

  @IsNotEmpty()
  page: number;

  limit: number;
}

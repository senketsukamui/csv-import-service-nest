import { ApiProperty } from "@nestjs/swagger";

export class ImportErrorDto {
  @ApiProperty({ example: 42 })
  line: number;

  @ApiProperty({ example: "John,not-an-email" })
  data: string;

  @ApiProperty({ example: "Expected 3 columns but got 2" })
  errorMessage: string;
}

export class ImportErrorsResponseDto {
  @ApiProperty({ type: [ImportErrorDto] })
  data: ImportErrorDto[];

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;
}

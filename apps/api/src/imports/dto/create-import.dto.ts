import { ApiProperty } from "@nestjs/swagger";

export class CreateImportResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  importId: string;
}

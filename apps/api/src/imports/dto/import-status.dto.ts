import { ApiProperty } from "@nestjs/swagger";
import { ImportStatus } from "@prisma/client";

export class ImportStatusDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "tenant-demo" })
  tenantId: string;

  @ApiProperty({ example: "data.csv" })
  fileName: string;

  @ApiProperty({ example: "imports/tenant-demo/1714000000000.csv" })
  filePath: string;

  @ApiProperty({ enum: ImportStatus, example: ImportStatus.COMPLETED })
  status: ImportStatus;

  @ApiProperty({ example: 1000 })
  processedRows: number;

  @ApiProperty({ example: 998 })
  importedCount: number;

  @ApiProperty({ example: 2 })
  errorCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  finishedAt: Date | null;
}

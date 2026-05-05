import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, ImportStatus } from '@prisma/client';
import { MinioService } from '@csv-import/minio';
import csvParser from 'csv-parser';
import { Readable } from 'node:stream';

@Injectable()
export class ImportProcessorService {
  private readonly prisma = new PrismaClient();

  constructor(private readonly minioService: MinioService) {}

  async process(importId: string): Promise<void> {
    const record = await this.prisma.import.findUnique({
      where: { id: importId },
    });

    if (!record || record.status !== ImportStatus.PENDING) {
      console.log(`Skipping import ${importId} — status: ${record?.status}`);
      return;
    }

    await this.prisma.import.update({
      where: { id: importId },
      data: { status: ImportStatus.PROCESSING },
    });

    try {
      const stream = await this.minioService.getStream(record.filePath);
      await this.parseAndSave(
        stream,
        importId,
        record.tenantId,
        record.processedRows,
      );

      await this.prisma.import.update({
        where: { id: importId },
        data: {
          status: ImportStatus.COMPLETED,
          finishedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Import ${importId} failed:`, error);
      await this.prisma.import.update({
        where: { id: importId },
        data: {
          status: ImportStatus.FAILED,
          finishedAt: new Date(),
        },
      });
    }
  }

  private async parseAndSave(
    stream: Readable,
    importId: string,
    tenantId: string,
    startFromRow: number,
  ): Promise<void> {
    let rowNumber = 0;
    let batch: Prisma.ImportedRowCreateManyInput[] = [];
    let errorBatch: Prisma.ImportErrorCreateManyInput[] = [];
    let processedRows = startFromRow;

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', async (row) => {
          rowNumber++;

          if (rowNumber <= startFromRow) return;

          const { valid, errors } = this.validateRow(row);

          if (valid) {
            batch.push({ importId, tenantId });
          } else {
            errorBatch.push({
              importId,
              tenantId,
              line: rowNumber,
              data: JSON.stringify(row),
              errorMessage: errors.join(', '),
            });
          }

          if (batch.length + errorBatch.length >= 500) {
            stream.pause();
            try {
              await this.flushBatch(
                importId,
                batch,
                errorBatch,
                processedRows + 500,
              );
              processedRows += 500;
              batch = [];
              errorBatch = [];
            } finally {
              stream.resume();
            }
          }
        })
        .on('end', async () => {
          try {
            if (batch.length > 0 || errorBatch.length > 0) {
              await this.flushBatch(
                importId,
                batch,
                errorBatch,
                processedRows + batch.length + errorBatch.length,
              );
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private validateRow(row: Record<string, string>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!row.name || row.name.trim() === '') {
      errors.push('name is required');
    }

    if (!row.email?.includes('@')) {
      errors.push('email is invalid');
    }

    return { valid: errors.length === 0, errors };
  }

  private async flushBatch(
    importId: string,
    batch: Prisma.ImportedRowCreateManyInput[],
    errorBatch: Prisma.ImportErrorCreateManyInput[],
    processedRows: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      ...(batch.length > 0
        ? [this.prisma.importedRow.createMany({ data: batch })]
        : []),
      ...(errorBatch.length > 0
        ? [this.prisma.importError.createMany({ data: errorBatch })]
        : []),
      this.prisma.import.update({
        where: { id: importId },
        data: {
          processedRows,
          importedCount: { increment: batch.length },
          errorCount: { increment: errorBatch.length },
        },
      }),
    ]);
  }
}

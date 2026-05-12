import { Injectable } from "@nestjs/common";
import { PrismaClient, ImportStatus } from "@prisma/client";
import { MinioService } from "@csv-import/minio";
import { MetricsService } from "../metrics/metrics.service";
import * as readline from "node:readline";
import { Readable } from "node:stream";

@Injectable()
export class ImportProcessorService {
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly minioService: MinioService,
    private readonly metricsService: MetricsService,
  ) {}

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

    const endTimer = this.metricsService.importProcessingDuration.startTimer();

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
        data: { status: ImportStatus.COMPLETED, finishedAt: new Date() },
      });
      endTimer();
      this.metricsService.importsProcessed.inc({ status: "completed" });
    } catch (error) {
      console.error(`Import ${importId} failed:`, error);
      await this.prisma.import.update({
        where: { id: importId },
        data: { status: ImportStatus.FAILED, finishedAt: new Date() },
      });
      endTimer();
      this.metricsService.importsProcessed.inc({ status: "failed" });
    }
  }

  private async parseAndSave(
    stream: Readable,
    importId: string,
    tenantId: string,
    startFromRow: number,
  ): Promise<void> {
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let rowNumber = 0;
    let headers: string[] = [];
    let validBatch: {
      importId: string;
      tenantId: string;
      data: Record<string, string>;
    }[] = [];
    let errorBatch: {
      importId: string;
      tenantId: string;
      line: number;
      data: string;
      errorMessage: string;
    }[] = [];
    let processedRows = startFromRow;

    for await (const line of rl) {
      if (rowNumber === 0) {
        headers = this.parseCsvLine(line);
        rowNumber++;
        continue;
      }

      rowNumber++;

      if (rowNumber - 1 <= startFromRow) continue;

      const { values, error } = this.safeParseLine(line);

      if (error) {
        errorBatch.push({
          importId,
          tenantId,
          line: rowNumber,
          data: line,
          errorMessage: error,
        });
      } else if (values.length !== headers.length) {
        errorBatch.push({
          importId,
          tenantId,
          line: rowNumber,
          data: line,
          errorMessage: `Expected ${headers.length} columns but got ${values.length}`,
        });
      } else {
        const row = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
        validBatch.push({ importId, tenantId, data: row });
      }

      if (validBatch.length + errorBatch.length >= 500) {
        processedRows += validBatch.length + errorBatch.length;
        await this.flushBatch(importId, validBatch, errorBatch, processedRows);
        validBatch = [];
        errorBatch = [];
      }
    }

    if (validBatch.length > 0 || errorBatch.length > 0) {
      processedRows += validBatch.length + errorBatch.length;
      await this.flushBatch(importId, validBatch, errorBatch, processedRows);
    }
  }

  private safeParseLine(line: string): {
    values: string[];
    error: string | null;
  } {
    try {
      const values = this.parseCsvLine(line);
      return { values, error: null };
    } catch (e) {
      return { values: [], error: (e as Error).message };
    }
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    if (inQuotes) {
      throw new Error("Unclosed quote in CSV line");
    }

    values.push(current.trim());
    return values;
  }

  private async flushBatch(
    importId: string,
    batch: {
      importId: string;
      tenantId: string;
      data: Record<string, string>;
    }[],
    errorBatch: {
      importId: string;
      tenantId: string;
      line: number;
      data: string;
      errorMessage: string;
    }[],
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

    if (batch.length > 0) {
      this.metricsService.csvRowsProcessed.inc(batch.length);
    }
    if (errorBatch.length > 0) {
      this.metricsService.csvRowsErrored.inc(errorBatch.length);
    }
  }
}

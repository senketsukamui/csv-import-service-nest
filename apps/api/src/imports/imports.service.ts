import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { MetricsService } from "../metrics/metrics.service";

@Injectable()
export class ImportsService {
  private readonly prisma = new PrismaClient();

  constructor(private readonly metricsService: MetricsService) {}

  async createImport(tenantId: string, fileName: string, filePath: string) {
    const record = await this.prisma.import.create({
      data: { tenantId, fileName, filePath },
    });
    this.metricsService.importsCreated.inc({ tenant_id: tenantId });
    return record;
  }

  async findOne(id: string, tenantId: string) {
    const record = await this.prisma.import.findFirst({
      where: { id, tenantId },
    });

    if (!record) throw new NotFoundException("Import not found");
    return record;
  }

  async findErrors(
    importId: string,
    tenantId: string,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.prisma.importError.findMany({
        where: { importId, tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { line: "asc" },
      }),
      this.prisma.importError.count({
        where: { importId, tenantId },
      }),
    ]);

    return { data, total, page, limit };
  }
}

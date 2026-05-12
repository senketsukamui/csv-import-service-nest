import { Module } from "@nestjs/common";
import { ImportProcessorService } from "./import-processor.service";
import { MinioModule } from "@csv-import/minio";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [MinioModule, MetricsModule],
  providers: [ImportProcessorService],
  exports: [ImportProcessorService],
})
export class ImportProcessorModule {}

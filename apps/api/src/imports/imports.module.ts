import { Module } from "@nestjs/common";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";
import { MinioModule } from "@csv-import/minio";
import { KafkaModule } from "../kafka/kafka.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [MinioModule, KafkaModule, MetricsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}

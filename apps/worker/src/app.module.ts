import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ImportProcessorModule } from "./processor/import-processor.module";
import { MetricsModule } from "./metrics/metrics.module";

@Module({
  imports: [ImportProcessorModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

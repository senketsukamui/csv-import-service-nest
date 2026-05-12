import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConsumerGuard } from "./auth/consumer.guard";
import { MinioModule } from "@csv-import/minio";
import { KafkaModule } from "./kafka/kafka.module";
import { ImportsModule } from "./imports/imports.module";
import { MetricsModule } from "./metrics/metrics.module";
import { HttpMetricsInterceptor } from "./metrics/http-metrics.interceptor";

@Module({
  imports: [MinioModule, KafkaModule, ImportsModule, MetricsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ConsumerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}

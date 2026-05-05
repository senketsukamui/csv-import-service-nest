import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_GUARD } from '@nestjs/core';
import { ConsumerGuard } from './auth/consumer.guard';
import { MinioModule } from '@csv-import/minio';
import { KafkaModule } from './kafka/kafka.module';
import { ImportsModule } from './imports/imports.module';

@Module({
  imports: [MinioModule, KafkaModule, ImportsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ConsumerGuard,
    },
  ],
})
export class AppModule {}

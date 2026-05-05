import { Module } from '@nestjs/common';
import { MinioModule } from '@csv-import/minio';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImportProcessorService } from './processor/import-processor.service';

@Module({
  imports: [MinioModule],
  controllers: [AppController],
  providers: [AppService, ImportProcessorService],
})
export class AppModule {}

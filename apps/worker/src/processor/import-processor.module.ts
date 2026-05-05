import { Module } from '@nestjs/common';
import { ImportProcessorService } from './import-processor.service';
import { MinioModule } from '@csv-import/minio';

@Module({
  imports: [MinioModule],
  providers: [ImportProcessorService],
  exports: [ImportProcessorService],
})
export class ImportProcessorModule {}

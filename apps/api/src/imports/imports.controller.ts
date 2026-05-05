import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ImportsService } from './imports.service';
import { MinioService } from '@csv-import/minio';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

type ConsumerRequest = Request & { consumerId: string };

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly minioService: MinioService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ConsumerRequest,
  ) {
    const consumerId = req.consumerId;
    const key = `imports/${consumerId}/${Date.now()}.csv`;
    await this.minioService.upload(key, file.buffer, file.mimetype);

    const record = await this.importsService.createImport(
      consumerId,
      file.originalname,
      key,
    );

    await this.kafkaProducerService.sendImportMessage(record.id);

    return { importId: record.id };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: ConsumerRequest) {
    const consumerId = req.consumerId;
    return this.importsService.findOne(id, consumerId);
  }

  @Get(':id/errors')
  async findErrors(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Req() req: ConsumerRequest,
  ) {
    const consumerId = req.consumerId;
    return this.importsService.findErrors(
      id,
      consumerId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}

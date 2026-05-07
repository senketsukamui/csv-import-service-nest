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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
} from "@nestjs/swagger";
import type { Request } from "express";
import { ImportsService } from "./imports.service";
import { MinioService } from "@csv-import/minio";
import { KafkaProducerService } from "../kafka/kafka-producer.service";
import { CreateImportResponseDto } from "./dto/create-import.dto";
import { ImportStatusDto } from "./dto/import-status.dto";
import { ImportErrorsResponseDto } from "./dto/import-errors.dto";

type ConsumerRequest = Request & { consumerId: string };

@ApiTags("imports")
@ApiSecurity("x-consumer-id")
@Controller("imports")
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly minioService: MinioService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  @Post()
  @HttpCode(202)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a CSV file for async import" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "CSV file to import",
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: "Import queued",
    type: CreateImportResponseDto,
  })
  @ApiResponse({ status: 400, description: "No file provided" })
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

  @Get(":id")
  @ApiOperation({ summary: "Get import status and counters" })
  @ApiParam({ name: "id", description: "Import UUID" })
  @ApiResponse({ status: 200, type: ImportStatusDto })
  @ApiResponse({ status: 404, description: "Import not found" })
  async findOne(@Param("id") id: string, @Req() req: ConsumerRequest) {
    const consumerId = req.consumerId;
    return this.importsService.findOne(id, consumerId);
  }

  @Get(":id/errors")
  @ApiOperation({ summary: "Get paginated validation errors for an import" })
  @ApiParam({ name: "id", description: "Import UUID" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, type: ImportErrorsResponseDto })
  @ApiResponse({ status: 404, description: "Import not found" })
  async findErrors(
    @Param("id") id: string,
    @Query("page") page = "1",
    @Query("limit") limit = "50",
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

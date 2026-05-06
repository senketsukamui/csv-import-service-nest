import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ImportProcessorService } from "./processor/import-processor.service";
import type { ImportMessage } from "@csv-import/contracts";

@Controller()
export class AppController {
  constructor(private readonly processorService: ImportProcessorService) {}

  @MessagePattern("csv-imports")
  async handleImport(@Payload() message: ImportMessage) {
    const { importId } = message;
    await this.processorService.process(importId);
  }
}

import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ImportProcessorModule } from "./processor/import-processor.module";

@Module({
  imports: [ImportProcessorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

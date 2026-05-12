import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { MetricsService } from "./metrics.service";
import { SkipAuth } from "../auth/skip-auth.decorator";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @SkipAuth()
  async metrics(@Res() res: Response) {
    res.set("Content-Type", this.metricsService.registry.contentType);
    res.end(await this.metricsService.registry.metrics());
  }
}

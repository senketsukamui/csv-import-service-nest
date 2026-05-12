import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly csvRowsProcessed = new Counter({
    name: "csv_rows_processed_total",
    help: "Total CSV rows successfully processed",
    registers: [this.registry],
  });

  readonly csvRowsErrored = new Counter({
    name: "csv_rows_errored_total",
    help: "Total CSV rows that failed validation",
    registers: [this.registry],
  });

  readonly importProcessingDuration = new Histogram({
    name: "import_processing_duration_seconds",
    help: "Time taken to fully process a CSV import",
    buckets: [1, 5, 10, 30, 60, 120, 300],
    registers: [this.registry],
  });

  readonly importsProcessed = new Counter({
    name: "imports_processed_total",
    help: "Total imports processed by the worker",
    labelNames: ["status"],
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}

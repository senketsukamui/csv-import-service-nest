import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path === "/metrics") return next.handle();

    const start = Date.now();
    const method = req.method;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        const route = (req.route as { path?: string } | undefined)?.path ?? req.path;
        const duration = (Date.now() - start) / 1000;
        this.metricsService.httpRequestDuration.observe(
          { method, route, status_code: res.statusCode },
          duration,
        );
      }),
    );
  }
}

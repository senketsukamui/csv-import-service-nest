import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SKIP_AUTH_KEY } from "./skip-auth.decorator";

@Injectable()
export class ConsumerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAuth) return true;

    const request = context.switchToHttp().getRequest();
    const consumerId = request.headers["x-consumer-id"];
    if (!consumerId || consumerId.trim() === "") {
      throw new UnauthorizedException("x-consumer-id header is required");
    }

    request.consumerId = consumerId;
    return true;
  }
}

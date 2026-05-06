import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class ConsumerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const consumerId = request.headers["x-consumer-id"];
    if (!consumerId || consumerId.trim() === "") {
      throw new UnauthorizedException("x-consumer-id header is required");
    }

    request.consumerId = consumerId;
    return true;
  }
}

import { NestFactory } from "@nestjs/core";
import { type MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn"] });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER ?? "kafka:9092"],
      },
      consumer: {
        groupId: "csv-import-worker",
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.METRICS_PORT ?? 3001);
}

bootstrap();

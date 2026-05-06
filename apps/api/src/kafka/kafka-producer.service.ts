import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Kafka, Producer } from "kafkajs";
import { ImportMessage } from "@csv-import/contracts";

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka = new Kafka({
    clientId: "csv-import-api",
    brokers: [process.env.KAFKA_BROKER ?? "kafka:9092"],
  });

  private readonly producer: Producer = this.kafka.producer();

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async sendImportMessage(importId: string): Promise<void> {
    const message: ImportMessage = { importId };
    await this.producer.send({
      topic: "csv-imports",
      messages: [{ value: JSON.stringify(message) }],
    });
  }
}

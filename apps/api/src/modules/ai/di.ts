import { PrismaClient } from "@prisma/client";
/**
 * AI Module Dependency Injection
 */
import { container } from "tsyringe";
import { QueueService } from "../queue/service.js";
import { AIService } from "./service.js";

// Register AI service
container.register<AIService>(AIService, {
	useClass: AIService,
});

// Register Queue service
container.register<QueueService>(QueueService, {
	useClass: QueueService,
});

// Ensure PrismaClient is registered (should be done in main DI setup)
if (!container.isRegistered(PrismaClient)) {
	container.register<PrismaClient>(PrismaClient, {
		useValue: new PrismaClient(),
	});
}

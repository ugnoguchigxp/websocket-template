import { PrismaClient } from "@prisma/client";
import { container } from "tsyringe";
import { MindMapService } from "./service.js";

// Register MindMap service
container.register<MindMapService>(MindMapService, {
	useClass: MindMapService,
});

// Ensure PrismaClient is registered (should be done in main DI setup)
if (!container.isRegistered(PrismaClient)) {
	container.register<PrismaClient>(PrismaClient, {
		useFactory: () => new PrismaClient(),
	});
}

export { container };

/**
 * Test Setup
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { afterEach, beforeEach } from "vitest";

// Mock dependencies for testing
beforeEach(() => {
	// Clear container before each test
	container.clearInstances();
});

// Global test setup
afterEach(() => {
	// Cleanup after each test
	container.clearInstances();
});

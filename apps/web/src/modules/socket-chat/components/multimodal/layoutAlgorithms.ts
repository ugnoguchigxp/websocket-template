/**
 * Layout algorithms stub
 */

export interface LayoutConfig {
	direction?: "TB" | "LR" | "BT" | "RL"
	spacing?: [number, number]
}

export const applyLayout = (nodes: any[], edges: any[], config?: LayoutConfig) => {
	// Stub implementation - returns nodes and edges as-is
	return { nodes, edges }
}

export const layoutAlgorithms = {
	hierarchical: () => ({ nodes: [], edges: [] }),
	force: () => ({ nodes: [], edges: [] }),
}

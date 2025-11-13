// TypeScript type definitions for MindMap enums (SQLite compatibility)

export const NodeDirection = {
	LEFT: "LEFT",
	RIGHT: "RIGHT",
} as const;

export type NodeDirection = (typeof NodeDirection)[keyof typeof NodeDirection];

export const ConnectionType = {
	CHILD: "CHILD",
	REFERENCE: "REFERENCE",
	ASSOCIATION: "ASSOCIATION",
} as const;

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];

export const AuthType = {
	LOCAL: "LOCAL",
	OIDC: "OIDC",
	MSAL: "MSAL",
} as const;

export type AuthType = (typeof AuthType)[keyof typeof AuthType];

// MindMap related types
export interface MindMapCreate {
	title: string;
	englishName: string;
	description?: string;
	isPublic?: boolean;
}

export interface MindMapUpdate {
	title?: string;
	description?: string;
	isPublic?: boolean;
}

export interface MindMapResponse {
	id: string;
	userId: number;
	title: string;
	englishName: string;
	description?: string;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
	nodeCount: number;
}

export interface KnowledgeNodeCreate {
	mindmapId: string;
	parentNodeId?: string;
	title: string;
	fileName?: string;
	positionX?: number;
	positionY?: number;
	direction?: NodeDirection;
	level?: number;
	aiGenerated?: boolean;
	markdownContent?: string;
}

export interface KnowledgeNodeUpdate {
	title?: string;
	fileName?: string;
	positionX?: number;
	positionY?: number;
	direction?: NodeDirection;
	level?: number;
	aiGenerated?: boolean;
	markdownContent?: string;
}

export interface KnowledgeNodeResponse {
	id: string;
	mindmapId: string;
	parentNodeId?: string;
	title: string;
	fileName: string;
	positionX: number;
	positionY: number;
	direction: NodeDirection;
	level: number;
	aiGenerated: boolean;
	markdownContent?: string;
	createdAt: string;
	updatedAt: string;
	hasMarkdownContent: boolean;
	childNodes?: KnowledgeNodeResponse[];
}

export interface NodeConnectionCreate {
	sourceNodeId: string;
	targetNodeId: string;
	connectionType?: ConnectionType;
}

export interface NodeConnectionResponse {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
	connectionType: ConnectionType;
	createdAt: string;
}

export interface MindMapStructure {
	mindmap: MindMapResponse;
	nodes: KnowledgeNodeResponse[];
	connections: NodeConnectionResponse[];
	reactFlowData: {
		nodes: any[];
		edges: any[];
	};
}

export interface AISearchRequest {
	nodeId: string;
	query: string;
}

export interface AISearchResponse {
	success: boolean;
	generatedContent: string;
	suggestedChildNodes: {
		title: string;
		content: string;
		direction: NodeDirection;
	}[];
	sources: {
		title: string;
		url: string;
		snippet: string;
	}[];
}

export interface ReactFlowNodeData {
	id: string;
	topic: string;
	level: number;
	direction: NodeDirection;
	aiGenerated: boolean;
	hasMarkdown: boolean;
	fileName: string;
}

export interface ReactFlowEdgeData {
	id: string;
	source: string;
	target: string;
	type: ConnectionType;
}

export interface DocumentMindmapLinkCreate {
	documentId: string;
	mindmapId: string;
	linkType?: string;
	metadata?: Record<string, any>;
}

export interface DocumentMindmapLinkResponse {
	documentId: string;
	mindmapId: string;
	linkType: string;
	metadata: Record<string, any>;
	createdAt: string;
}

/**
 * AI MindMap Service
 * SQLite + Prismaでのビジネスロジック実装
 * Adapted from local_knowledge for websocketFramework
 */
import type { PrismaClient } from "@prisma/client";
import { inject, injectable } from "tsyringe";
import {
	type AISearchRequest,
	type AISearchResponse,
	ConnectionType,
	type DocumentMindmapLinkCreate,
	type DocumentMindmapLinkResponse,
	type KnowledgeNodeCreate,
	type KnowledgeNodeResponse,
	type KnowledgeNodeUpdate,
	type MindMapCreate,
	type MindMapResponse,
	type MindMapStructure,
	type MindMapUpdate,
	type NodeConnectionCreate,
	type NodeConnectionResponse,
	NodeDirection,
	type ReactFlowEdgeData,
	type ReactFlowNodeData,
} from "../../types/mindmap.js";

/**
 * 安全なファイル名生成
 */
export function generateSafeFileName(_title: string, nodeSequence: number): string {
	return `node${nodeSequence}`;
}

/**
 * MindMap CRUD操作
 */
@injectable()
export class MindMapService {
	constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

	/**
	 * マインドマップ一覧取得（ユーザー別）
	 */
	async getMindMapsByUser(userId: number): Promise<MindMapResponse[]> {
		console.log(`[MindMapService] 🔍 Fetching mindmaps for user: ${userId}`, { userId });

		const mindmaps = await this.prisma.mindMap.findMany({
			where: {
				userId,
			},
			include: {
				_count: {
					select: { nodes: true },
				},
			},
			orderBy: { updatedAt: "desc" },
		});

		console.log(`[MindMapService] 📊 Found ${mindmaps.length} mindmaps for user ${userId}`, {
			mindmapCount: mindmaps.length,
			userId,
		});

		return mindmaps.map((mindmap: any) => ({
			id: mindmap.id,
			userId: mindmap.userId,
			title: mindmap.title,
			englishName: mindmap.englishName,
			description: mindmap.description || undefined,
			isPublic: mindmap.isPublic,
			createdAt: mindmap.createdAt.toISOString(),
			updatedAt: mindmap.updatedAt.toISOString(),
			nodeCount: mindmap._count.nodes,
		}));
	}

	/**
	 * マインドマップ詳細取得
	 */
	async getMindMapById(mindmapId: string, userId?: number): Promise<MindMapResponse | null> {
		console.log(`[MindMapService] 🔍 Fetching mindmap: ${mindmapId}`, { mindmapId, userId });

		const mindmap = await this.prisma.mindMap.findFirst({
			where: {
				id: mindmapId,
				...(userId && { userId }), // userIdが指定された場合は所有者チェック
			},
			include: {
				_count: {
					select: { nodes: true },
				},
			},
		});

		if (!mindmap) {
			console.warn(`[MindMapService] ❌ MindMap not found: ${mindmapId}`, { mindmapId, userId });
			return null;
		}

		return {
			id: mindmap.id,
			userId: mindmap.userId,
			title: mindmap.title,
			englishName: mindmap.englishName,
			description: mindmap.description || undefined,
			isPublic: mindmap.isPublic,
			createdAt: mindmap.createdAt.toISOString(),
			updatedAt: mindmap.updatedAt.toISOString(),
			nodeCount: mindmap._count.nodes,
		};
	}

	/**
	 * マインドマップ作成
	 */
	async createMindMap(userId: number, data: MindMapCreate): Promise<MindMapResponse> {
		console.log(`[MindMapService] ✨ Creating new mindmap for user: ${userId}`, {
			userId,
			title: data.title,
			englishName: data.englishName,
		});

		try {
			const mindmap = await this.prisma.mindMap.create({
				data: {
					userId,
					title: data.title,
					englishName: data.englishName,
					description: data.description,
					isPublic: data.isPublic ?? false,
				},
				include: {
					_count: {
						select: { nodes: true },
					},
				},
			});

			console.log(`[MindMapService] ✅ Successfully created mindmap: ${mindmap.id}`, {
				mindmapId: mindmap.id,
				title: mindmap.title,
			});

			return {
				id: mindmap.id,
				userId: mindmap.userId,
				title: mindmap.title,
				englishName: mindmap.englishName,
				description: mindmap.description || undefined,
				isPublic: mindmap.isPublic,
				createdAt: mindmap.createdAt.toISOString(),
				updatedAt: mindmap.updatedAt.toISOString(),
				nodeCount: mindmap._count.nodes,
			};
		} catch (error) {
			console.error("[MindMapService] ❌ Failed to create mindmap", {
				userId,
				title: data.title,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * マインドマップ更新
	 */
	async updateMindMap(
		mindmapId: string,
		userId: number,
		data: MindMapUpdate
	): Promise<MindMapResponse> {
		console.log(`[MindMapService] ✏️ Updating mindmap: ${mindmapId}`, { mindmapId, userId });

		const mindmap = await this.prisma.mindMap.updateMany({
			where: {
				id: mindmapId,
				userId,
			},
			data,
		});

		if (mindmap.count === 0) {
			throw new Error("MindMap not found or access denied");
		}

		const updatedMindMap = await this.getMindMapById(mindmapId, userId);
		if (!updatedMindMap) {
			throw new Error("Failed to retrieve updated mindmap");
		}

		console.log(`[MindMapService] ✅ Successfully updated mindmap: ${mindmapId}`, { mindmapId });
		return updatedMindMap;
	}

	/**
	 * マインドマップ削除
	 */
	async deleteMindMap(mindmapId: string, userId: number): Promise<boolean> {
		console.log(`[MindMapService] 🗑️ Deleting mindmap: ${mindmapId}`, { mindmapId, userId });

		const result = await this.prisma.mindMap.deleteMany({
			where: {
				id: mindmapId,
				userId,
			},
		});

		const success = result.count > 0;
		if (success) {
			console.log(`[MindMapService] ✅ Successfully deleted mindmap: ${mindmapId}`, { mindmapId });
		} else {
			console.warn(`[MindMapService] ❌ Failed to delete mindmap: ${mindmapId}`, { mindmapId });
		}

		return success;
	}

	/**
	 * ナレッジノード一覧取得
	 */
	async getNodesByMindMap(
		mindmapId: string,
		includeChildren = false
	): Promise<KnowledgeNodeResponse[]> {
		console.log(`[MindMapService] 📋 Fetching nodes for mindmap: ${mindmapId}`, { mindmapId });

		const nodes = await this.prisma.knowledgeNode.findMany({
			where: { mindmapId },
			orderBy: { createdAt: "asc" },
			include: includeChildren
				? {
						children: {
							orderBy: { createdAt: "asc" },
						},
					}
				: undefined,
		});

		console.log(`[MindMapService] 📊 Found ${nodes.length} nodes for mindmap ${mindmapId}`, {
			mindmapId,
			nodeCount: nodes.length,
		});

		return nodes.map((node: any) => ({
			id: node.id,
			mindmapId: node.mindmapId,
			parentNodeId: node.parentNodeId,
			title: node.title,
			fileName: node.fileName,
			positionX: node.positionX,
			positionY: node.positionY,
			direction: node.direction as NodeDirection,
			level: node.level,
			aiGenerated: node.aiGenerated,
			markdownContent: node.markdownContent,
			createdAt: node.createdAt.toISOString(),
			updatedAt: node.updatedAt.toISOString(),
			hasMarkdownContent: !!node.markdownContent,
			childNodes:
				includeChildren && node.children
					? node.children.map((child: any) => ({
							id: child.id,
							mindmapId: child.mindmapId,
							parentNodeId: child.parentNodeId,
							title: child.title,
							fileName: child.fileName,
							positionX: child.positionX,
							positionY: child.positionY,
							direction: child.direction as NodeDirection,
							level: child.level,
							aiGenerated: child.aiGenerated,
							markdownContent: child.markdownContent,
							createdAt: child.createdAt.toISOString(),
							updatedAt: child.updatedAt.toISOString(),
							hasMarkdownContent: !!child.markdownContent,
						}))
					: undefined,
		}));
	}

	/**
	 * ナレッジノード作成
	 */
	async createKnowledgeNode(data: KnowledgeNodeCreate): Promise<KnowledgeNodeResponse> {
		console.log(`[MindMapService] ✨ Creating new node for mindmap: ${data.mindmapId}`, {
			mindmapId: data.mindmapId,
			title: data.title,
		});

		try {
			const node = await this.prisma.knowledgeNode.create({
				data: {
					mindmapId: data.mindmapId,
					parentNodeId: data.parentNodeId,
					title: data.title,
					fileName: data.fileName || generateSafeFileName(data.title, Date.now()),
					positionX: data.positionX ?? 0,
					positionY: data.positionY ?? 0,
					direction: data.direction ?? NodeDirection.RIGHT,
					level: data.level ?? 0,
					aiGenerated: data.aiGenerated ?? false,
					markdownContent: data.markdownContent,
				},
			});

			console.log(`[MindMapService] ✅ Successfully created node: ${node.id}`, {
				nodeId: node.id,
				title: node.title,
			});

			return {
				id: node.id,
				mindmapId: node.mindmapId,
				parentNodeId: node.parentNodeId || undefined,
				title: node.title,
				fileName: node.fileName,
				positionX: node.positionX,
				positionY: node.positionY,
				direction: node.direction as NodeDirection,
				level: node.level,
				aiGenerated: node.aiGenerated,
				markdownContent: node.markdownContent || undefined,
				createdAt: node.createdAt.toISOString(),
				updatedAt: node.updatedAt.toISOString(),
				hasMarkdownContent: !!node.markdownContent,
			};
		} catch (error) {
			console.error("[MindMapService] Failed to create node", {
				mindmapId: data.mindmapId,
				title: data.title,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	/**
	 * ナレッジノード更新
	 */
	async updateKnowledgeNode(
		nodeId: string,
		data: KnowledgeNodeUpdate
	): Promise<KnowledgeNodeResponse> {
		console.log(`[MindMapService] Updating node: ${nodeId}`, { nodeId });

		const node = await this.prisma.knowledgeNode.update({
			where: { id: nodeId },
			data,
		});

		console.log(`[MindMapService] Successfully updated node: ${nodeId}`, { nodeId });

		return {
			id: node.id,
			mindmapId: node.mindmapId,
			parentNodeId: node.parentNodeId || undefined,
			title: node.title,
			fileName: node.fileName,
			positionX: node.positionX,
			positionY: node.positionY,
			direction: node.direction as NodeDirection,
			level: node.level,
			aiGenerated: node.aiGenerated,
			markdownContent: node.markdownContent || undefined,
			createdAt: node.createdAt.toISOString(),
			updatedAt: node.updatedAt.toISOString(),
			hasMarkdownContent: !!node.markdownContent,
		};
	}

	/**
	 * ナレッジノード削除
	 */
	async deleteKnowledgeNode(nodeId: string): Promise<boolean> {
		console.log(`[MindMapService] Deleting node: ${nodeId}`, { nodeId });

		try {
			await this.prisma.knowledgeNode.delete({
				where: { id: nodeId },
			});

			console.log(`[MindMapService] Successfully deleted node: ${nodeId}`, { nodeId });
			return true;
		} catch (error) {
			console.error(`[MindMapService] Failed to delete node: ${nodeId}`, {
				nodeId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	}

	/**
	 * ノード接続作成
	 */
	async createNodeConnection(data: NodeConnectionCreate): Promise<NodeConnectionResponse> {
		console.log("[MindMapService] Creating connection", {
			sourceNodeId: data.sourceNodeId,
			targetNodeId: data.targetNodeId,
		});

		// マインドマップIDを取得（ソースノードから）
		const sourceNode = await this.prisma.knowledgeNode.findUnique({
			where: { id: data.sourceNodeId },
			select: { mindmapId: true },
		});

		if (!sourceNode) {
			throw new Error("Source node not found");
		}

		const connection = await this.prisma.nodeConnection.create({
			data: {
				mindmapId: sourceNode.mindmapId,
				sourceNodeId: data.sourceNodeId,
				targetNodeId: data.targetNodeId,
				connectionType: data.connectionType ?? ConnectionType.CHILD,
			},
		});

		console.log(`[MindMapService] Successfully created connection: ${connection.id}`, {
			connectionId: connection.id,
		});

		return {
			id: connection.id,
			sourceNodeId: connection.sourceNodeId,
			targetNodeId: connection.targetNodeId,
			connectionType: connection.connectionType as ConnectionType,
			createdAt: connection.createdAt.toISOString(),
		};
	}

	/**
	 * マインドマップ全体構造取得
	 */
	async getMindMapStructure(mindmapId: string, userId?: number): Promise<MindMapStructure | null> {
		console.log(`[MindMapService] Fetching mindmap structure: ${mindmapId}`, { mindmapId, userId });

		const mindmap = await this.getMindMapById(mindmapId, userId);
		if (!mindmap) {
			return null;
		}

		const [nodes, connections] = await Promise.all([
			this.getNodesByMindMap(mindmapId, true),
			this.getNodeConnectionsByMindMap(mindmapId),
		]);

		const reactFlowData = this.generateReactFlowData(nodes, connections);

		return {
			mindmap,
			nodes,
			connections,
			reactFlowData,
		};
	}

	/**
	 * ノード接続一覧取得
	 */
	private async getNodeConnectionsByMindMap(mindmapId: string): Promise<NodeConnectionResponse[]> {
		const connections = await this.prisma.nodeConnection.findMany({
			where: { mindmapId },
			orderBy: { createdAt: "asc" },
		});

		return connections.map((conn: any) => ({
			id: conn.id,
			sourceNodeId: conn.sourceNodeId,
			targetNodeId: conn.targetNodeId,
			connectionType: conn.connectionType as ConnectionType,
			createdAt: conn.createdAt.toISOString(),
		}));
	}

	/**
	 * ReactFlowデータ生成
	 */
	private generateReactFlowData(
		nodes: KnowledgeNodeResponse[],
		connections: NodeConnectionResponse[]
	): { nodes: any[]; edges: any[] } {
		const reactFlowNodes = nodes.map((node) => ({
			id: node.id,
			type: "mindmapNode",
			position: { x: node.positionX, y: node.positionY },
			data: {
				id: node.id,
				topic: node.title,
				level: node.level,
				direction: node.direction,
				aiGenerated: node.aiGenerated,
				hasMarkdown: node.hasMarkdownContent ?? false,
				fileName: node.fileName,
			} as ReactFlowNodeData,
		}));

		const reactFlowEdges = connections.map((conn) => ({
			id: conn.id,
			source: conn.sourceNodeId,
			target: conn.targetNodeId,
			type: conn.connectionType.toLowerCase(),
			data: {
				id: conn.id,
				source: conn.sourceNodeId,
				target: conn.targetNodeId,
				type: conn.connectionType,
			} as ReactFlowEdgeData,
		}));

		return { nodes: reactFlowNodes, edges: reactFlowEdges };
	}

	/**
	 * AI検索（モック実装）
	 */
	async aiSearch(request: AISearchRequest): Promise<AISearchResponse> {
		console.log(`[MindMapService] AI search for node: ${request.nodeId}`, {
			nodeId: request.nodeId,
			query: request.query,
		});

		// TODO: 実際のAI検索API連携
		// 現在はモック実装
		return {
			success: true,
			generatedContent: `検索結果: ${request.query}`,
			suggestedChildNodes: [
				{
					title: "提案ノード1",
					content: "提案コンテンツ1",
					direction: NodeDirection.RIGHT,
				},
			],
			sources: [
				{
					title: "情報源1",
					url: "https://example.com",
					snippet: "情報源のスニペット",
				},
			],
		};
	}

	/**
	 * ドキュメント-マインドマップリンク作成
	 */
	async createDocumentMindmapLink(
		data: DocumentMindmapLinkCreate
	): Promise<DocumentMindmapLinkResponse> {
		console.log("[MindMapService] Creating document-mindmap link", {
			documentId: data.documentId,
			mindmapId: data.mindmapId,
		});

		const link = await this.prisma.documentMindmapLink.create({
			data: {
				documentId: data.documentId,
				mindmapId: data.mindmapId,
				linkType: data.linkType ?? "GENERATED_FROM",
				metadata: JSON.stringify(data.metadata ?? {}),
			},
		});

		console.log("[MindMapService] Successfully created document-mindmap link", {
			documentId: data.documentId,
			mindmapId: data.mindmapId,
		});

		return {
			documentId: link.documentId,
			mindmapId: link.mindmapId,
			linkType: link.linkType,
			metadata: JSON.parse(link.metadata) || {},
			createdAt: link.createdAt.toISOString(),
		};
	}
}

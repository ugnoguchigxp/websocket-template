import { container } from "tsyringe";
import { z } from "zod";
import type {
	AISearchRequest,
	DocumentMindmapLinkCreate,
	KnowledgeNodeCreate,
	KnowledgeNodeUpdate,
	MindMapCreate,
	MindMapUpdate,
	NodeConnectionCreate,
} from "../../types/mindmap.js";
// @ts-nocheck
import { MindMapService } from "./service.js";

// Zod schemas for validation
const CreateMindmapSchema = z.object({
	title: z.string().min(1),
	englishName: z.string().min(1),
	description: z.string().optional(),
	isPublic: z.boolean().optional(),
});

const UpdateMindmapSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	description: z.string().optional(),
	isPublic: z.boolean().optional(),
});

const GetMindmapSchema = z.object({
	id: z.string(),
});

const CreateNodeSchema = z.object({
	mindmapId: z.string(),
	parentNodeId: z.string().optional(),
	title: z.string().min(1),
	fileName: z.string().optional(),
	positionX: z.number().optional(),
	positionY: z.number().optional(),
	direction: z.enum(["LEFT", "RIGHT"]).optional(),
	level: z.number().optional(),
	aiGenerated: z.boolean().optional(),
	markdownContent: z.string().optional(),
});

const UpdateNodeSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	fileName: z.string().optional(),
	positionX: z.number().optional(),
	positionY: z.number().optional(),
	direction: z.enum(["LEFT", "RIGHT"]).optional(),
	level: z.number().optional(),
	aiGenerated: z.boolean().optional(),
	markdownContent: z.string().optional(),
});

const GetNodeSchema = z.object({
	id: z.string(),
});

const CreateConnectionSchema = z.object({
	sourceNodeId: z.string(),
	targetNodeId: z.string(),
	connectionType: z.enum(["CHILD", "REFERENCE", "ASSOCIATION"]).optional(),
});

const AISearchSchema = z.object({
	nodeId: z.string(),
	query: z.string().min(1),
});

const CreateDocumentLinkSchema = z.object({
	documentId: z.string(),
	mindmapId: z.string(),
	linkType: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

// Factory to avoid circular dependency with routers/index
export function createMindmapRouter(t: any, authed: any) {
	return t.router({
		// === MindMap CRUD Operations ===

		// 一覧取得
		getMindmaps: authed.query(async ({ ctx }: { ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.getMindMapsByUser(ctx.user?.localUserId);
		}),

		// 作成
		createMindmap: authed.input(CreateMindmapSchema).mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.createMindMap(ctx.user?.localUserId, input as MindMapCreate);
		}),

		// 詳細取得
		getMindmap: authed.input(GetMindmapSchema).query(async ({ input, ctx }: { input: any; ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.getMindMapById(input.id, ctx.user?.localUserId);
		}),

		// 更新
		updateMindmap: authed.input(UpdateMindmapSchema).mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.updateMindMap(input.id, ctx.user?.localUserId, {
				title: input.title,
				description: input.description,
				isPublic: input.isPublic,
			} as MindMapUpdate);
		}),

		// 削除
		deleteMindmap: authed.input(GetMindmapSchema).mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.deleteMindMap(input.id, ctx.user?.localUserId);
		}),

		// === MindMap Structure ===

		// マインドマップ全体構造取得 (ReactFlow data included)
		getMindmapStructure: authed.input(GetMindmapSchema).query(async ({ input, ctx }: { input: any; ctx: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.getMindMapStructure(input.id, ctx.user?.localUserId);
		}),

		// === Knowledge Node CRUD Operations ===

		// ノード一覧取得
		getNodes: authed
			.input(
				z.object({
					mindmapId: z.string(),
					includeChildren: z.boolean().optional(),
				})
			)
			.query(async ({ input }: { input: any }) => {
				const service = container.resolve<MindMapService>(MindMapService);
				return await service.getNodesByMindMap(input.mindmapId, input.includeChildren);
			}),

		// ノード作成
		createNode: authed.input(CreateNodeSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.createKnowledgeNode(input as KnowledgeNodeCreate);
		}),

		// ノード更新
		updateNode: authed.input(UpdateNodeSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			const { id, ...updateData } = input;
			return await service.updateKnowledgeNode(id, updateData as KnowledgeNodeUpdate);
		}),

		// ノード削除
		deleteNode: authed.input(GetNodeSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.deleteKnowledgeNode(input.id);
		}),

		// === Node Connections ===

		// 接続作成
		createConnection: authed.input(CreateConnectionSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.createNodeConnection(input as NodeConnectionCreate);
		}),

		// === AI Operations ===

		// AI検索
		aiSearch: authed.input(AISearchSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.aiSearch(input as AISearchRequest);
		}),

		// === Document Links ===

		// ドキュメント-マインドマップリンク作成
		createDocumentLink: authed.input(CreateDocumentLinkSchema).mutation(async ({ input }: { input: any }) => {
			const service = container.resolve<MindMapService>(MindMapService);
			return await service.createDocumentMindmapLink(input as DocumentMindmapLinkCreate);
		}),
	});
}

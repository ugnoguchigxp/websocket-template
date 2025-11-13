import { createContextLogger } from "@/modules/logger"
import { useMessage } from "@/contexts/MessageContext"
import { api } from "@/trpc"
import type { inferRouterOutputs } from "@trpc/server"
import React, { useCallback } from "react"
import { FaPlus, FaProjectDiagram, FaInfo, FaTrash, FaTimes } from "react-icons/fa"
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	type Edge,
	type Node,
	type NodeProps,
	useEdgesState,
	useNodesState,
} from "reactflow"
import type { AppRouter } from "../../../api/src/routers"
import "reactflow/dist/style.css"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	LoadingSpinner,
} from "@/components/legacy-ui"

const log = createContextLogger("MindMapPage")

type RouterOutputs = inferRouterOutputs<AppRouter>
type MindmapListItem = RouterOutputs["mindmap"]["getMindmaps"][number]
type MindmapStructure = RouterOutputs["mindmap"]["getMindmapStructure"]
type MindMapNodeData = NonNullable<MindmapStructure>["reactFlowData"]["nodes"][number]["data"]

const MindMapNodeCard: React.FC<NodeProps<MindMapNodeData>> = ({ data }) => (
	<div className="rounded border bg-white/90 shadow-sm px-3 py-2 min-w-[160px]">
		<div className="text-sm font-semibold text-gray-800">{data.topic}</div>
		<div className="text-xs text-gray-500 flex items-center justify-between mt-1">
			<span>{data.aiGenerated ? "AI" : "Manual"}</span>
			<span>Lv.{data.level ?? 0}</span>
		</div>
	</div>
)

const nodeTypes = { mindmapNode: MindMapNodeCard }

export function MindMapPage() {
	const { showToast } = useMessage()
	const { data: mindmaps, isLoading: loadingMindmaps, refetch } = api.mindmap.getMindmaps.useQuery()
	const [selectedMindmapId, setSelectedMindmapId] = React.useState<string | null>(null)
	const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
	const [showCreateForm, setShowCreateForm] = React.useState(false)
	const [deleteConfirm, setDeleteConfirm] = React.useState<{
		mindmap: MindmapListItem
		isOpen: boolean
	} | null>(null)

	const createNodeMutation = api.mindmap.createNode.useMutation({
		onSuccess: () => {
			refetch()
			showToast({
				id: crypto.randomUUID(),
				message: "ノードを作成しました",
				type: "success",
			})
		},
		onError(error) {
			showToast({
				id: crypto.randomUUID(),
				message: `ノード作成に失敗しました: ${error.message}`,
				type: "error",
			})
		},
	})

	const updateNodeMutation = api.mindmap.updateNode.useMutation({
		onSuccess: () =>
			showToast({ id: crypto.randomUUID(), message: "位置を保存しました", duration: 1200 }),
		onError(error) {
			showToast({ id: crypto.randomUUID(), message: `保存失敗: ${error.message}`, type: "error" })
		},
	})

	const aiGenerateMutation = api.ai.generateContent.useMutation({
		onSuccess: () => {
			showToast({
				id: crypto.randomUUID(),
				message: "AI 生成リクエストを送信しました",
				type: "success",
			})
			refetch()
		},
		onError(error) {
			showToast({ id: crypto.randomUUID(), message: `AI生成失敗: ${error.message}`, type: "error" })
		},
	})

	const deleteMindmapMutation = api.mindmap.deleteMindmap.useMutation({
		onSuccess: () => {
			log.info("Successfully deleted mindmap")
			refetch()
			showToast({
				id: crypto.randomUUID(),
				message: "マインドマップを削除しました",
				type: "success",
			})
		},
		onError(error) {
			log.error("Failed to delete mindmap", error)
			showToast({
				id: crypto.randomUUID(),
				message: `削除に失敗しました: ${error.message}`,
				type: "error",
			})
		},
	})

	React.useEffect(() => {
		if (!selectedMindmapId && mindmaps?.length) {
			setSelectedMindmapId(mindmaps[0]!.id)
		}
	}, [mindmaps, selectedMindmapId])

	const {
		data: structure,
		isFetching: loadingStructure,
	} = api.mindmap.getMindmapStructure.useQuery(
		{ id: selectedMindmapId ?? "" },
		{ enabled: Boolean(selectedMindmapId) }
	)

	const initialNodes = React.useMemo<Node<MindMapNodeData>[]>(() => {
		if (!structure?.reactFlowData?.nodes) return []
		return structure.reactFlowData.nodes.map(node => ({
			id: node.id,
			type: "mindmapNode",
			position: node.position ?? { x: 0, y: 0 },
			data: node.data,
		}))
	}, [structure])

	const initialEdges = React.useMemo<Edge[]>(() => {
		if (!structure?.reactFlowData?.edges) return []
		return structure.reactFlowData.edges.map(edge => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: edge.type ?? "smoothstep",
		}))
	}, [structure])

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

	React.useEffect(() => setNodes(initialNodes), [initialNodes, setNodes])
	React.useEffect(() => setEdges(initialEdges), [initialEdges, setEdges])

	const currentMindmap = React.useMemo(
		() => mindmaps?.find(m => m.id === selectedMindmapId),
		[mindmaps, selectedMindmapId]
	)

	const handleNodeClick = React.useCallback((event: any) => {
		const nodeId = event.node?.id
		if (nodeId) {
			setSelectedNodeId(nodeId)
		}
	}, [])

	const handleDragStop = React.useCallback(
		(_event: unknown, node: Node) => {
			updateNodeMutation.mutate({
				id: node.id,
				positionX: node.position.x,
				positionY: node.position.y,
			})
		},
		[updateNodeMutation]
	)

	const handleAddNode = useCallback(() => {
		if (!currentMindmap) return
		const parentId = selectedNodeId ?? structure?.nodes[0]?.id
		createNodeMutation.mutate({
			mindmapId: currentMindmap.id,
			parentNodeId: parentId ?? undefined,
			title: "New Node",
		})
	}, [currentMindmap, createNodeMutation, selectedNodeId, structure])

	const handleAiGenerate = useCallback(() => {
		if (!currentMindmap || !selectedNodeId) {
			showToast({ id: crypto.randomUUID(), message: "ノードを選択してください", type: "error" })
			return
		}
		const query = window.prompt("AI 生成クエリを入力してください", "Summarize the node")
		if (!query) return
		aiGenerateMutation.mutate({
			mindmapId: currentMindmap.id,
			nodeId: selectedNodeId,
			customQuery: query,
		})
	}, [aiGenerateMutation, currentMindmap, selectedNodeId, showToast])

	const handleCreateMindmap = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			const formData = new FormData(event.currentTarget)
			const title = formData.get("title") as string
			const englishName = formData.get("englishName") as string
			const description = (formData.get("description") as string) || undefined

			log.debug("Creating new mindmap", { title, englishName })

			try {
				await api.mindmap.createMindmap.mutate({
					title,
					englishName,
					description,
				})
				setShowCreateForm(false)
				refetch()
				showToast({
					id: crypto.randomUUID(),
					message: "マインドマップを作成しました",
					type: "success",
				})
			} catch (error) {
				log.error("Failed to create mindmap", error)
				showToast({
					id: crypto.randomUUID(),
					message: `作成に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`,
					type: "error",
				})
			}
		},
		[refetch, showToast]
	)

	const handleDeleteMindmap = useCallback((mindmap: MindmapListItem) => {
		log.debug("Delete mindmap requested", { title: mindmap.title })
		setDeleteConfirm({ mindmap, isOpen: true })
	}, [])

	const confirmDeleteMindmap = useCallback(async () => {
		if (!deleteConfirm?.mindmap) return

		try {
			log.debug("Confirming deletion", { title: deleteConfirm.mindmap.title })
			await deleteMindmapMutation.mutateAsync({ id: deleteConfirm.mindmap.id })
			setDeleteConfirm(null)
			if (selectedMindmapId === deleteConfirm.mindmap.id) {
				setSelectedMindmapId(null)
			}
		} catch (error) {
			log.error("Failed to delete mindmap", error)
		}
	}, [deleteConfirm, deleteMindmapMutation, selectedMindmapId])

	const cancelDeleteMindmap = useCallback(() => {
		setDeleteConfirm(null)
	}, [])

	// List view
	if (!selectedMindmapId) {
		if (loadingMindmaps) {
			return (
				<div className="min-h-screen bg-gray-50 flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto" />
						<p className="mt-4 text-gray-600">マインドマップを読み込み中...</p>
					</div>
				</div>
			)
		}

		return (
			<div className="min-h-screen bg-gray-50">
				<div className="max-w-7xl mx-auto p-4">
					{/* Header */}
					<header className="bg-white rounded-lg shadow-sm p-6 mb-6">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-gray-900 flex items-center">
									<FaProjectDiagram className="mr-3" />
									マインドマップ
								</h1>
								<p className="text-gray-600 mt-2">知識を構造化し、視覚的に整理</p>
							</div>
							<button
								onClick={() => setShowCreateForm(true)}
								className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
							>
								<FaPlus className="mr-2" />
								作成
							</button>
						</div>
					</header>

					{/* Create Form */}
					{showCreateForm && (
						<div className="bg-white rounded-lg shadow-sm p-6 mb-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">新規作成</h2>
							<form onSubmit={handleCreateMindmap}>
								<div className="grid md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											タイトル *
										</label>
										<input
											name="title"
											type="text"
											required
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
											placeholder="My MindMap"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-2">
											英語名 * (URL用)
										</label>
										<input
											name="englishName"
											type="text"
											required
											pattern="^[a-zA-Z0-9_\-]+$"
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
											placeholder="my-mindmap"
										/>
									</div>
								</div>
								<div className="mt-4">
									<label className="block text-sm font-medium text-gray-700 mb-2">
										説明
									</label>
									<textarea
										name="description"
										rows={3}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										placeholder="マインドマップの説明"
									/>
								</div>
								<div className="mt-6 flex justify-end space-x-3">
									<button
										type="button"
										onClick={() => setShowCreateForm(false)}
										className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
									>
										キャンセル
									</button>
									<button
										type="submit"
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										作成
									</button>
								</div>
							</form>
						</div>
					)}

					{/* Mindmap List */}
					<div className="bg-white rounded-lg shadow-sm overflow-hidden">
						<div className="p-6 border-b border-gray-200">
							<h2 className="text-lg font-semibold text-gray-900">
								マインドマップ一覧 ({mindmaps?.length ?? 0})
							</h2>
						</div>

						{!mindmaps || mindmaps.length === 0 ? (
							<div className="p-12 text-center">
								<FaProjectDiagram className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">
									マインドマップがありません
								</h3>
								<p className="mt-1 text-sm text-gray-500">
									新しいマインドマップを作成して始めましょう
								</p>
								<div className="mt-6">
									<button
										onClick={() => setShowCreateForm(true)}
										className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										<FaPlus className="mr-2" />
										最初のマインドマップを作成
									</button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
								{mindmaps.map(mindmap => (
									<div
										key={mindmap.id}
										className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-500 transition-all duration-200 group relative cursor-pointer"
										onClick={() => setSelectedMindmapId(mindmap.id)}
									>
										{/* Delete button */}
										<button
											onClick={(e) => {
												e.stopPropagation()
												handleDeleteMindmap(mindmap)
											}}
											className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
											title="削除"
										>
											<FaTrash className="w-3 h-3" />
										</button>

										<div className="p-4">
											{/* Card header */}
											<div className="flex items-start justify-between mb-3 pr-6">
												<div className="flex-1 min-w-0">
													<h3 className="text-base font-semibold text-gray-900 truncate">
														{mindmap.title}
													</h3>
													{mindmap.description && (
														<p className="text-sm text-gray-500 mt-1 line-clamp-1">
															{mindmap.description}
														</p>
													)}
												</div>
												<div className="ml-3 flex-shrink-0">
													<span
														className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
															mindmap.isPublic
																? "bg-green-100 text-green-800"
																: "bg-gray-100 text-gray-800"
														}`}
													>
														{mindmap.isPublic ? "公開" : "非公開"}
													</span>
												</div>
											</div>

											{/* Card content */}
											<div className="flex items-center justify-between text-sm text-gray-500">
												<div className="flex items-center space-x-1">
													<FaProjectDiagram className="w-3 h-3" />
													<span className="text-xs">{mindmap.nodeCount ?? 0} ノード</span>
												</div>
												<div className="text-xs">
													{new Date(mindmap.updatedAt).toLocaleDateString()}
												</div>
											</div>
											<div className="mt-1 text-xs text-gray-400 font-mono truncate">
												{mindmap.englishName}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Feature info */}
					<div className="mt-6 bg-blue-50 rounded-lg p-6">
						<div className="flex">
							<FaInfo className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
							<div>
								<h3 className="text-sm font-medium text-blue-900">マインドマップの機能</h3>
								<div className="mt-2 text-sm text-blue-700">
									<p>• ReactFlow + ElkJS による自動レイアウト</p>
									<p>• インタラクティブなノード作成・編集</p>
									<p>• Markdown コンテンツをサポート</p>
									<p>• AI による自動コンテンツ生成</p>
									<p>• 複数フォーマットへのエクスポート (近日対応)</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// Canvas view
	return (
		<div className="h-screen flex flex-col">
			{/* Toolbar */}
			<div className="bg-white border-b border-gray-200 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<button
							onClick={() => setSelectedMindmapId(null)}
							className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
						>
							← 一覧に戻る
						</button>
						<div>
							<h1 className="text-lg font-semibold text-gray-900">{currentMindmap?.title}</h1>
							<p className="text-sm text-gray-500">{structure?.nodes.length ?? 0} ノード</p>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
								currentMindmap?.isPublic ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
							}`}
						>
							{currentMindmap?.isPublic ? "公開" : "非公開"}
						</span>
						<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							操作モード
						</span>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="bg-gray-50 border-b border-gray-200 p-3 flex gap-2">
				<button
					onClick={handleAddNode}
					disabled={!currentMindmap}
					className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
				>
					<FaPlus className="mr-1" />
					ノード追加
				</button>
				<button
					onClick={handleAiGenerate}
					disabled={!selectedNodeId}
					className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
				>
					✨ AI生成
				</button>
			</div>

			{/* Canvas */}
			<div className="flex-1 overflow-hidden">
				{loadingStructure ? (
					<div className="flex h-full items-center justify-center">
						<LoadingSpinner />
					</div>
				) : structure ? (
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodeClick={handleNodeClick}
						onNodeDragStop={handleDragStop}
						fitView
						nodeTypes={nodeTypes}
						minZoom={0.2}
						maxZoom={1.5}
					>
						<Background gap={24} size={1} />
						<Controls />
						<MiniMap pannable zoomable />
					</ReactFlow>
				) : (
					<div className="flex h-full items-center justify-center text-sm text-gray-500">
						構造を読み込めませんでした
					</div>
				)}
			</div>

			{/* Delete confirmation dialog */}
			{deleteConfirm?.isOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
						<div className="p-6">
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold text-gray-900">マインドマップを削除</h3>
								<button
									onClick={cancelDeleteMindmap}
									className="text-gray-400 hover:text-gray-600 transition-colors"
								>
									<FaTimes className="w-5 h-5" />
								</button>
							</div>

							<div className="mb-6">
								<p className="text-gray-600 mb-3">
									マインドマップ「<strong>{deleteConfirm.mindmap.title}</strong>
									」を削除してもよろしいですか？
								</p>
								<div className="bg-red-50 border border-red-200 rounded-lg p-3">
									<div className="flex">
										<FaTrash className="h-4 w-4 text-red-400 mt-0.5 mr-2" />
										<div className="text-sm text-red-700">
											<p className="font-medium">この操作は取り消せません。</p>
											<p className="mt-1">
												すべてのノード、接続、関連ファイルが永続的に削除されます。
											</p>
										</div>
									</div>
								</div>
							</div>

							<div className="flex justify-end space-x-3">
								<button
									onClick={cancelDeleteMindmap}
									className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
								>
									キャンセル
								</button>
								<button
									onClick={confirmDeleteMindmap}
									disabled={deleteMindmapMutation.isPending}
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									{deleteMindmapMutation.isPending ? "削除中..." : "削除"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

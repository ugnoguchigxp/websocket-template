/**
 * Flow Renderer Component
 * Renders interactive flow diagrams using ReactFlow
 */

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
	Background,
	type BackgroundVariant,
	type Connection,
	Controls,
	type Edge,
	type EdgeChange,
	type EdgeTypes,
	MiniMap,
	type Node,
	type NodeChange,
	type NodeTypes,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	useReactFlow,
} from "@xyflow/react"
import html2canvas from "html2canvas"
import { FiDownload, FiImage, FiMaximize2, FiZoomIn, FiZoomOut } from "react-icons/fi"

import { createContextLogger } from "@/modules/logger"

import type { FlowData } from "../../../../types/multimodal"
import { Result } from "../../../../types/result"

import { defaultFlowEdgeFactory } from "./FlowEdgeFactory"
import { defaultFlowNodeFactory } from "./FlowNodeFactory"
import {
	BACKGROUND_CONFIG,
	EXPORT_LIMITS,
	FLOW_DIMENSIONS,
	NODE_COLORS,
	TEXT_LIMITS,
} from "./constants"
import { type LayoutConfig, applyLayout } from "./layoutAlgorithms"

const log = createContextLogger("FlowRenderer")

// React Flow styles (required)
import "@xyflow/react/dist/style.css"

interface FlowRendererProps {
	/** Flow data and configuration */
	flowData: FlowData
	/** Whether to show in preview mode (smaller, read-only) */
	preview?: boolean
	/** Whether the flow is interactive */
	interactive?: boolean
	/** Additional CSS classes */
	className?: string
	/** Callback when nodes/edges change */
	onChange?: (nodes: Node[], edges: Edge[]) => void
	/** Callback when flow is exported */
	onExport?: (format: "json" | "png" | "svg") => void
	/** Callback when flow is closed */
	onClose?: () => void
	/** Callback when fullscreen toggle is requested */
	onFullscreenToggle?: () => void
}

// Get node and edge types from factories
const customNodeTypes: NodeTypes = defaultFlowNodeFactory.getNodeTypes()
const customEdgeTypes: EdgeTypes = defaultFlowEdgeFactory.getEdgeTypes()

/**
 * Flow Renderer Internal Component (needs ReactFlowProvider)
 */
const FlowRendererInternal: React.FC<FlowRendererProps> = ({
	flowData,
	preview = false,
	interactive = true,
	className = "",
	onChange,
	onExport,
	onFullscreenToggle,
}) => {
	const { title, description, nodes: initialNodes, edges: initialEdges, config } = flowData

	// Apply layout algorithm to nodes and edges only when explicitly specified by LLM
	const layoutedData = useMemo(() => {
		// Only apply layout if explicitly specified (not auto, not free, not undefined)
		if (
			!config.layout ||
			config.layout === "free" ||
			config.layout === "auto" ||
			config.layout === "horizontal" ||
			config.layout === "vertical"
		) {
			return { nodes: initialNodes, edges: initialEdges }
		}

		// Create layout configuration
		const layoutConfig: LayoutConfig = {
			nodeSpacing: config.spacing?.nodeSpacing,
			rankSpacing: config.spacing?.rankSpacing,
			direction: config.layoutDirection,
		}

		// Apply the layout algorithm only for explicit layout types
		return applyLayout(initialNodes, initialEdges, config.layout, layoutConfig)
	}, [initialNodes, initialEdges, config.layout, config.layoutDirection, config.spacing])

	const [nodes, setNodes] = useState<Node[]>(layoutedData.nodes)
	const [edges, setEdges] = useState<Edge[]>(layoutedData.edges as Edge[])

	// Debug: Log edge data to console
	useEffect(() => {
		log.debug("FlowRenderer - Initial Edges:", initialEdges)
		log.debug("FlowRenderer - Layouted Edges:", layoutedData.edges)
		log.debug("FlowRenderer - State Edges:", edges)
		edges.forEach((edge, index) => {
			log.debug(`Edge ${index + 1}:`, {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				sourceHandle: edge.sourceHandle,
				targetHandle: edge.targetHandle,
				type: edge.type,
				markerEnd: edge.markerEnd,
			})
		})

		// Validate edge source/target references
		const nodeIds = new Set(nodes.map(node => node.id))
		const invalidEdges = edges.filter(
			edge => !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
		)

		if (invalidEdges.length > 0) {
			log.warn("FlowRenderer - Invalid edges (source/target not found):", invalidEdges)
		}

		log.debug("FlowRenderer - Node IDs:", Array.from(nodeIds))
		log.debug("FlowRenderer - Edge count:", edges.length)
		log.debug("FlowRenderer - Node count:", nodes.length)
	}, [initialEdges, layoutedData.edges, edges, nodes])

	const [isMobile, setIsMobile] = useState(false)

	const { fitView, zoomIn, zoomOut, getViewport } = useReactFlow()
	const [flowContainerRef, setFlowContainerRef] = useState<HTMLDivElement | null>(null)

	// Responsive breakpoint detection
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768)
		}

		checkMobile()

		window.addEventListener("resize", checkMobile)

		return () => {
			window.removeEventListener("resize", checkMobile)
		}
	}, [])

	// Properly sanitized title and description using React's built-in escaping
	const sanitizedTitle = useMemo(() => {
		if (!title) return ""
		// React automatically escapes content when rendered as text content
		// Additional sanitization for extra safety
		return title
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove control characters
			.replace(/[\uFDD0-\uFDEF]/g, "") // Remove Unicode non-characters
			.substring(0, TEXT_LIMITS.TITLE_MAX_LENGTH) // Limit length
	}, [title])

	const sanitizedDescription = useMemo(() => {
		if (!description) return ""
		// React automatically escapes content when rendered as text content
		// Additional sanitization for extra safety
		return description
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove control characters
			.replace(/[\uFDD0-\uFDEF]/g, "") // Remove Unicode non-characters
			.substring(0, TEXT_LIMITS.DESCRIPTION_MAX_LENGTH) // Limit length
	}, [description])

	// Responsive flow dimensions
	const flowHeight = useMemo(() => {
		if (preview) {
			return isMobile ? FLOW_DIMENSIONS.PREVIEW_HEIGHT * 0.8 : FLOW_DIMENSIONS.PREVIEW_HEIGHT
		}

		// For full mode, use '100%' to fill the parent container
		// Similar to ChartRenderer's ResponsiveContainer approach
		return "100%"
	}, [preview, isMobile])

	const flowWidth = useMemo(() => {
		if (preview && isMobile) {
			return "100%"
		}

		const baseWidth = config.width || FLOW_DIMENSIONS.DEFAULT_WIDTH
		return baseWidth
	}, [preview, isMobile, config.width])

	// Handle node changes
	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			if (!interactive) return
			const newNodes = applyNodeChanges(changes, nodes)
			setNodes(newNodes)
			onChange?.(newNodes, edges)
		},
		[nodes, edges, onChange, interactive]
	)

	// Handle edge changes
	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			if (!interactive) return
			const newEdges = applyEdgeChanges(changes, edges)
			setEdges(newEdges)
			onChange?.(nodes, newEdges)
		},
		[nodes, edges, onChange, interactive]
	)

	// Handle new connections
	const onConnect = useCallback(
		(connection: Connection) => {
			if (!interactive) return
			const newEdges = addEdge(connection, edges)
			setEdges(newEdges)
			onChange?.(nodes, newEdges)
		},
		[edges, nodes, onChange, interactive]
	)

	// Export functionality with proper error handling and cleanup using Result pattern
	const handleExport = useCallback(
		(format: "json" | "png" | "svg") => {
			if (format === "json") {
				const exportResult = Result.fromThrowable(() => {
					const exportData = {
						...flowData,
						nodes,
						edges,
						viewport: getViewport(),
						exportedAt: new Date().toISOString(),
					}

					// Validate export data size to prevent memory issues
					const exportString = JSON.stringify(exportData, null, 2)
					if (exportString.length > EXPORT_LIMITS.MAX_SIZE_BYTES) {
						throw new Error(`Export data too large (>${EXPORT_LIMITS.MAX_SIZE_MB}MB)`)
					}

					return { exportString, exportData }
				})

				if (!exportResult.success) {
					log.error("Export validation failed:", exportResult.error)
					// You could show a user-friendly error toast here
					return
				}

				const { exportString } = exportResult.data
				let url: string | null = null

				try {
					const blob = new Blob([exportString], { type: "application/json" })
					url = URL.createObjectURL(blob)

					const link = document.createElement("a")
					link.href = url
					link.download = `flow-${sanitizedTitle.replace(/[^a-z0-9]/gi, "-") || "untitled"}.json`

					// Use document.body for better compatibility
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)

					onExport?.(format)
				} catch (error) {
					log.error("Export download failed:", error)
					// You could show a user-friendly error message here
				} finally {
					// Always clean up the blob URL
					if (url) {
						URL.revokeObjectURL(url)
					}
				}
			} else {
				// For PNG/SVG export, you would need additional libraries like html2canvas
				if (format === "png" && flowContainerRef) {
					// PNG export using html2canvas
					html2canvas(flowContainerRef, {
						backgroundColor: "#ffffff",
						scale: 2,
						useCORS: true,
						allowTaint: true,
						logging: false,
					})
						.then(canvas => {
							canvas.toBlob(blob => {
								if (!blob) return
								const url = URL.createObjectURL(blob)
								const link = document.createElement("a")
								link.href = url
								link.download = `flow-${sanitizedTitle.replace(/[^a-z0-9]/gi, "-") || "untitled"}.png`
								document.body.appendChild(link)
								link.click()
								document.body.removeChild(link)
								URL.revokeObjectURL(url)
							}, "image/png")
						})
						.catch(log.error)
				} else {
					log.warn(`${format} export not fully implemented yet`)
				}
				onExport?.(format)
			}
		},
		[
			flowData,
			nodes,
			edges,
			getViewport,
			onExport,
			sanitizedTitle,
			flowContainerRef,
			flowWidth,
			flowHeight,
		]
	)

	// Keyboard navigation handler for accessibility
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (!interactive) return

			switch (event.key) {
				case "Enter":
				case " ":
					if (event.target === event.currentTarget) {
						event.preventDefault()
						fitView()
					}
					break
				case "Escape":
					// Escape key handling (removed info/settings toggle)
					break
				default:
					break
			}
		},
		[interactive, fitView]
	)

	return (
		<div
			className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}
			role="application"
			aria-label={sanitizedTitle || "フロー図"}
			aria-describedby={sanitizedDescription ? "flow-description" : undefined}
		>
			{/* Flow Container */}
			<div
				ref={setFlowContainerRef}
				className={`relative flex-1 flow-container ${isMobile ? "touch-pan-x touch-pan-y" : ""}`}
				style={{
					height: flowHeight,
					width: flowWidth,
					minHeight: preview ? undefined : FLOW_DIMENSIONS.DEFAULT_HEIGHT,
				}}
				onKeyDown={handleKeyDown}
				tabIndex={interactive ? 0 : -1}
				aria-label="フロー図の操作エリア"
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={customNodeTypes}
					edgeTypes={customEdgeTypes}
					fitView={config.fitView !== false}
					minZoom={config.zoom?.min || FLOW_DIMENSIONS.MIN_ZOOM}
					maxZoom={config.zoom?.max || FLOW_DIMENSIONS.MAX_ZOOM}
					defaultViewport={{
						zoom: config.zoom?.default || FLOW_DIMENSIONS.DEFAULT_ZOOM,
						x: 0,
						y: 0,
					}}
					nodesDraggable={interactive}
					nodesConnectable={interactive}
					elementsSelectable={interactive}
					selectNodesOnDrag={interactive}
					panOnDrag={!preview}
					zoomOnScroll={!preview && !isMobile}
					zoomOnPinch={!preview}
					panOnScroll={false}
					preventScrolling={preview || isMobile}
					// Mobile-specific settings
					zoomActivationKeyCode={null} // Disable zoom shortcuts on mobile
					deleteKeyCode={isMobile ? null : "Delete"}
					// Accessibility props
					role="img"
					aria-labelledby="flow-title"
					aria-describedby={sanitizedDescription ? "flow-description" : undefined}
					onlyRenderVisibleElements={nodes.length > 100 || isMobile} // Performance optimization
				>
					{/* Background */}
					{config.showBackground !== false && (
						<Background
							variant={(config.backgroundVariant || "dots") as BackgroundVariant}
							gap={BACKGROUND_CONFIG.GAP}
							size={BACKGROUND_CONFIG.SIZE}
							color={BACKGROUND_CONFIG.COLOR}
						/>
					)}

					{/* Controls - Disable default zoom controls to avoid duplication */}
					{!preview && config.showControls !== false && (
						<Controls
							showZoom={false}
							showFitView={false}
							showInteractive={interactive}
							aria-label="フロー操作コントロール"
						/>
					)}

					{/* MiniMap */}
					{!preview && config.showMinimap && (
						<MiniMap
							nodeColor={node => {
								const nodeType = node.type as keyof typeof NODE_COLORS
								return NODE_COLORS[nodeType] || NODE_COLORS.default
							}}
							nodeStrokeWidth={2}
							pannable
							zoomable
							aria-label="フロー全体のミニマップ"
						/>
					)}

					{/* Flow Controls Panel - Top Left */}
					{!preview && (
						<Panel
							position="top-left"
							className="flex space-x-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 m-2"
						>
							<button
								onClick={() => zoomOut()}
								className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
								aria-label="ズームアウト"
								title="ズームアウト"
							>
								<FiZoomOut className="w-4 h-4" />
							</button>
							<button
								onClick={() => (onFullscreenToggle ? onFullscreenToggle() : fitView())}
								className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
								aria-label="全画面表示"
								title="全画面表示"
							>
								<FiMaximize2 className="w-4 h-4" />
							</button>
							<button
								onClick={() => zoomIn()}
								className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
								aria-label="ズームイン"
								title="ズームイン"
							>
								<FiZoomIn className="w-4 h-4" />
							</button>
							<button
								onClick={() => handleExport("json")}
								className="p-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors"
								aria-label="JSONダウンロード"
								title="JSONダウンロード"
							>
								<FiDownload className="w-4 h-4" />
							</button>
							<button
								onClick={() => handleExport("png")}
								className="p-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-colors"
								aria-label="画像ダウンロード"
								title="画像ダウンロード"
							>
								<FiImage className="w-4 h-4" />
							</button>
						</Panel>
					)}
				</ReactFlow>
			</div>

			{/* Flow Info Footer */}
			{!preview && (
				<footer className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
					<div className="flex justify-between items-center">
						<span>フロータイプ: {config.layout || "free"}</span>
						<span>
							ノード: {nodes.length} | エッジ: {edges.length}
						</span>
					</div>
				</footer>
			)}
		</div>
	)
}

/**
 * Flow Renderer Component with Provider
 */
export const FlowRenderer: React.FC<FlowRendererProps> = props => {
	return (
		<ReactFlowProvider>
			<FlowRendererInternal {...props} />
		</ReactFlowProvider>
	)
}

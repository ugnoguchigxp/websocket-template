/**
 * Flow Node Factory
 * Provides extensible node type creation using factory pattern
 */

import type React from "react"

import { Handle, Position } from "@xyflow/react"
import type { NodeTypes } from "@xyflow/react"

// Base interface for all node data
export interface BaseNodeData {
	label: string
	description?: string
	icon?: string
	color?: string
	size?: "small" | "medium" | "large"
	variant?: "default" | "outlined" | "filled"
}

// Node configuration for factory
export interface NodeTypeConfig {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.ComponentType<any>
	defaultProps?: Partial<BaseNodeData>
	accessibility?: {
		role?: string
		ariaLabel?: (data: BaseNodeData) => string
	}
}

/**
 * Factory for creating flow node types
 */
export class FlowNodeFactory {
	private nodeTypes: Map<string, NodeTypeConfig> = new Map()

	/**
	 * Register a new node type
	 */
	registerNodeType(type: string, config: NodeTypeConfig): void {
		this.nodeTypes.set(type, config)
	}

	/**
	 * Get all registered node types for ReactFlow
	 */
	getNodeTypes(): NodeTypes {
		const nodeTypes: NodeTypes = {}

		for (const [type, config] of this.nodeTypes) {
			nodeTypes[type] = this.createNodeComponent(config)
		}

		return nodeTypes
	}

	/**
	 * Create a node component with accessibility features
	 */
	private createNodeComponent(config: NodeTypeConfig) {
		return ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id: string }) => {
			const Component = config.component
			const mergedData = { ...config.defaultProps, ...data }
			const accessibility = config.accessibility || {}

			return (
				<div
					role={accessibility.role || "button"}
					tabIndex={0}
					aria-label={
						accessibility.ariaLabel
							? accessibility.ariaLabel(mergedData)
							: `ノード: ${mergedData.label}${mergedData.description ? ` - ${mergedData.description}` : ""}`
					}
					aria-selected={selected}
				>
					<Component data={mergedData} selected={selected} id={id} />
				</div>
			)
		}
	}

	/**
	 * Create a default node type with customizable styling
	 */
	static createDefaultNode(
		baseClassName = "px-4 py-2 shadow-md rounded-md",
		selectedClassName = "border-blue-500",
		unselectedClassName = "border-gray-300"
	) {
		return ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => {
			const sizeClasses = {
				small: "px-2 py-1 text-xs",
				medium: "px-4 py-2 text-sm",
				large: "px-6 py-3 text-base",
			}

			const variantClasses = {
				default: "bg-white border-2",
				outlined: "bg-transparent border-2",
				filled: "border-2",
			}

			const size = data.size || "medium"
			const variant = data.variant || "default"

			return (
				<div
					className={`
            ${baseClassName} 
            ${sizeClasses[size]} 
            ${variantClasses[variant]}
            ${selected ? selectedClassName : unselectedClassName}
          `}
					style={{
						backgroundColor: variant === "filled" ? data.color : undefined,
						borderColor: data.color || undefined,
					}}
				>
					<Handle
						type="target"
						position={Position.Left}
						id={`${id || "default"}-input`}
						style={{ background: "#555" }}
					/>
					<Handle
						type="source"
						position={Position.Right}
						id={`${id || "default"}-output`}
						style={{ background: "#555" }}
					/>
					<div className="flex items-center">
						{data.icon && (
							<span className="mr-2" aria-hidden="true">
								{data.icon}
							</span>
						)}
						<div className="font-medium">{data.label}</div>
					</div>
					{data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
				</div>
			)
		}
	}

	/**
	 * Create a specialized node type (input, output, etc.)
	 */
	static createSpecializedNode(
		type: "input" | "output" | "process" | "decision",
		customConfig?: {
			backgroundColor?: string
			borderColor?: string
			textColor?: string
			icon?: string
		}
	) {
		const configs = {
			input: {
				backgroundColor: "bg-green-50",
				borderColor: "border-green-300",
				selectedBorderColor: "border-green-500",
				textColor: "text-green-800",
				icon: "📥",
				ariaLabel: (data: BaseNodeData) => `入力ノード: ${data.label}`,
			},
			output: {
				backgroundColor: "bg-blue-50",
				borderColor: "border-blue-300",
				selectedBorderColor: "border-blue-500",
				textColor: "text-blue-800",
				icon: "📤",
				ariaLabel: (data: BaseNodeData) => `出力ノード: ${data.label}`,
			},
			process: {
				backgroundColor: "bg-purple-50",
				borderColor: "border-purple-300",
				selectedBorderColor: "border-purple-500",
				textColor: "text-purple-800",
				icon: "⚙️",
				ariaLabel: (data: BaseNodeData) => `処理ノード: ${data.label}`,
			},
			decision: {
				backgroundColor: "bg-yellow-50",
				borderColor: "border-yellow-300",
				selectedBorderColor: "border-yellow-500",
				textColor: "text-yellow-800",
				icon: "❓",
				ariaLabel: (data: BaseNodeData) => `判断ノード: ${data.label}`,
			},
		}

		const config = { ...configs[type], ...customConfig }

		return ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
			<div
				className={`
          px-4 py-2 shadow-md rounded-md border-2
          ${config.backgroundColor}
          ${selected ? config.selectedBorderColor : config.borderColor}
        `}
			>
				<Handle
					type="target"
					position={Position.Left}
					id={`${id || type}-input`}
					style={{ background: "#555" }}
				/>
				<Handle
					type="source"
					position={Position.Right}
					id={`${id || type}-output`}
					style={{ background: "#555" }}
				/>
				<div className="flex items-center">
					<span className="mr-2" aria-hidden="true">
						{config.icon}
					</span>
					<div className={`text-sm font-medium ${config.textColor}`}>{data.label}</div>
				</div>
				{data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
			</div>
		)
	}
}

/**
 * Default factory instance with built-in node types
 */
export const defaultFlowNodeFactory = new FlowNodeFactory()

// Register default node types
defaultFlowNodeFactory.registerNodeType("default", {
	component: FlowNodeFactory.createDefaultNode(),
	accessibility: {
		role: "button",
		ariaLabel: data => `ノード: ${data.label}${data.description ? ` - ${data.description}` : ""}`,
	},
})

defaultFlowNodeFactory.registerNodeType("input", {
	component: FlowNodeFactory.createSpecializedNode("input"),
	accessibility: {
		role: "button",
		ariaLabel: data => `入力ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("output", {
	component: FlowNodeFactory.createSpecializedNode("output"),
	accessibility: {
		role: "button",
		ariaLabel: data => `出力ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("process", {
	component: FlowNodeFactory.createSpecializedNode("process"),
	accessibility: {
		role: "button",
		ariaLabel: data => `処理ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("decision", {
	component: FlowNodeFactory.createSpecializedNode("decision"),
	accessibility: {
		role: "button",
		ariaLabel: data => `判断ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("group", {
	component: ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
		<div
			className={`px-6 py-4 shadow-lg rounded-lg bg-gray-50 border-2 border-dashed ${
				selected ? "border-gray-500" : "border-gray-300"
			}`}
		>
			<Handle
				type="target"
				position={Position.Top}
				id={`${id || "group"}-input`}
				style={{ background: "#666" }}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id={`${id || "group"}-output`}
				style={{ background: "#666" }}
			/>
			<div className="text-sm font-semibold text-gray-700">{data.label}</div>
			{data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
		</div>
	),
	accessibility: {
		role: "group",
		ariaLabel: data => `グループ: ${data.label}${data.description ? ` - ${data.description}` : ""}`,
	},
})

defaultFlowNodeFactory.registerNodeType("annotation", {
	component: ({ data, id }: { data: BaseNodeData; id?: string }) => (
		<div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs text-yellow-800 max-w-xs">
			<Handle
				type="target"
				position={Position.Left}
				id={`${id || "annotation"}-input`}
				style={{ background: "#f59e0b" }}
			/>
			{data.label}
		</div>
	),
	accessibility: {
		role: "note",
		ariaLabel: data => `注釈: ${data.label}`,
	},
})

// Register mindmap-specific node types
defaultFlowNodeFactory.registerNodeType("mindmap-center", {
	component: ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
		<div
			className={`px-4 py-3 shadow-lg rounded-[20px] border-none font-bold text-sm text-white ${
				selected ? "ring-4 ring-purple-300" : ""
			}`}
			style={{
				backgroundColor: "#8b5cf6",
				boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
			}}
		>
			<Handle
				type="target"
				position={Position.Top}
				id={`${id || "mindmap-center"}-input`}
				style={{ background: "#8b5cf6" }}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id={`${id || "mindmap-center"}-output`}
				style={{ background: "#8b5cf6" }}
			/>
			<Handle
				type="source"
				position={Position.Left}
				id={`${id || "mindmap-center"}-output-left`}
				style={{ background: "#8b5cf6" }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				id={`${id || "mindmap-center"}-output-right`}
				style={{ background: "#8b5cf6" }}
			/>
			<div className="text-center">{data.label}</div>
			{data.description && (
				<div className="text-xs opacity-90 mt-1 text-center">{data.description}</div>
			)}
		</div>
	),
	accessibility: {
		role: "button",
		ariaLabel: data => `マインドマップ中心ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("mindmap-branch", {
	component: ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
		<div
			className={`px-3 py-2 shadow-md rounded-[16px] border-2 border-purple-400 text-sm ${
				selected ? "ring-2 ring-purple-500" : ""
			}`}
			style={{
				backgroundColor: "#ddd6fe",
				color: "#5b21b6",
				boxShadow: "0 2px 8px rgba(168, 85, 247, 0.2)",
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				id={`${id || "mindmap-branch"}-input`}
				style={{ background: "#a855f7" }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				id={`${id || "mindmap-branch"}-output`}
				style={{ background: "#a855f7" }}
			/>
			<div className="text-center">{data.label}</div>
			{data.description && (
				<div className="text-xs opacity-75 mt-1 text-center">{data.description}</div>
			)}
		</div>
	),
	accessibility: {
		role: "button",
		ariaLabel: data => `マインドマップブランチノード: ${data.label}`,
	},
})

// Register radial-specific node types
defaultFlowNodeFactory.registerNodeType("radial-center", {
	component: ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
		<div
			className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg font-bold text-sm text-white ${
				selected ? "ring-4 ring-amber-300" : ""
			}`}
			style={{
				backgroundColor: "#f59e0b",
				boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
			}}
		>
			<Handle
				type="target"
				position={Position.Top}
				id={`${id || "radial-center"}-input`}
				style={{ background: "#f59e0b" }}
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id={`${id || "radial-center"}-output`}
				style={{ background: "#f59e0b" }}
			/>
			<Handle
				type="source"
				position={Position.Left}
				id={`${id || "radial-center"}-output-left`}
				style={{ background: "#f59e0b" }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				id={`${id || "radial-center"}-output-right`}
				style={{ background: "#f59e0b" }}
			/>
			<div className="text-center text-xs leading-tight">{data.label}</div>
		</div>
	),
	accessibility: {
		role: "button",
		ariaLabel: data => `放射状中心ノード: ${data.label}`,
	},
})

defaultFlowNodeFactory.registerNodeType("radial-node", {
	component: ({ data, selected, id }: { data: BaseNodeData; selected: boolean; id?: string }) => (
		<div
			className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md border-2 border-amber-500 text-xs ${
				selected ? "ring-2 ring-amber-600" : ""
			}`}
			style={{
				backgroundColor: "#fbbf24",
				color: "#92400e",
				boxShadow: "0 2px 8px rgba(245, 158, 11, 0.2)",
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				id={`${id || "radial-node"}-input`}
				style={{ background: "#f59e0b" }}
			/>
			<Handle
				type="source"
				position={Position.Right}
				id={`${id || "radial-node"}-output`}
				style={{ background: "#f59e0b" }}
			/>
			<div className="text-center text-xs leading-tight p-1">{data.label}</div>
		</div>
	),
	accessibility: {
		role: "button",
		ariaLabel: data => `放射状ノード: ${data.label}`,
	},
})

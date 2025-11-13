/**
 * Flow Edge Factory
 * Provides extensible edge type creation using factory pattern
 */

import type React from "react"

import { BezierEdge, SmoothStepEdge, StepEdge, StraightEdge } from "@xyflow/react"
import type { EdgeTypes } from "@xyflow/react"

// Base interface for all edge data
export interface BaseEdgeData {
	label?: string
	description?: string
	color?: string
	style?: "solid" | "dashed" | "dotted"
	thickness?: "thin" | "medium" | "thick"
	animated?: boolean
}

// Edge configuration for factory
export interface EdgeTypeConfig {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: React.ComponentType<any>
	defaultProps?: Partial<BaseEdgeData>
	accessibility?: {
		ariaLabel?: (data: BaseEdgeData) => string
	}
}

/**
 * Factory for creating flow edge types
 */
export class FlowEdgeFactory {
	private edgeTypes: Map<string, EdgeTypeConfig> = new Map()

	/**
	 * Register a new edge type
	 */
	registerEdgeType(type: string, config: EdgeTypeConfig): void {
		this.edgeTypes.set(type, config)
	}

	/**
	 * Get all registered edge types for ReactFlow
	 */
	getEdgeTypes(): EdgeTypes {
		const edgeTypes: EdgeTypes = {}

		for (const [type, config] of this.edgeTypes) {
			edgeTypes[type] = this.createEdgeComponent(config)
		}

		return edgeTypes
	}

	/**
	 * Create an edge component with accessibility features
	 */
	private createEdgeComponent(config: EdgeTypeConfig) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (props: any) => {
			const Component = config.component
			const mergedData = { ...config.defaultProps, ...props.data }
			const accessibility = config.accessibility || {}

			return (
				<g
					aria-label={
						accessibility.ariaLabel
							? accessibility.ariaLabel(mergedData)
							: mergedData.label || "接続線"
					}
				>
					<Component {...props} data={mergedData} />
				</g>
			)
		}
	}

	/**
	 * Create a default edge type with customizable styling
	 */
	static createDefaultEdge(baseColor = "#b1b1b7", selectedColor = "#ff0072") {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (props: any) => {
			const { data = {}, selected } = props
			const color = selected ? selectedColor : data.color || baseColor

			const strokeWidthMap: Record<string, number> = {
				thin: 1,
				medium: 2,
				thick: 3,
			}

			const strokeDasharrayMap: Record<string, string> = {
				solid: "none",
				dashed: "5,5",
				dotted: "2,2",
			}

			const thickness = data.thickness || "medium"
			const style = data.style || "solid"

			return (
				<g>
					<path
						{...props}
						stroke={color}
						strokeWidth={strokeWidthMap[thickness]}
						strokeDasharray={strokeDasharrayMap[style]}
						fill="none"
						className={data.animated ? "animate-pulse" : ""}
					/>
					{data.label && (
						<foreignObject
							x={props.centerX - 50}
							y={props.centerY - 10}
							width={100}
							height={20}
							className="overflow-visible"
						>
							<div className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-center shadow-sm">
								{data.label}
							</div>
						</foreignObject>
					)}
				</g>
			)
		}
	}

	/**
	 * Create a specialized edge type
	 */
	static createSpecializedEdge(
		type: "success" | "error" | "warning" | "info" | "conditional",
		customConfig?: {
			color?: string
			style?: "solid" | "dashed" | "dotted"
			thickness?: "thin" | "medium" | "thick"
			animated?: boolean
		}
	) {
		const configs = {
			success: {
				color: "#10b981",
				style: "solid" as const,
				thickness: "medium" as const,
				animated: false,
				ariaLabel: (data: BaseEdgeData) => `成功時の接続: ${data.label || ""}`,
			},
			error: {
				color: "#ef4444",
				style: "solid" as const,
				thickness: "thick" as const,
				animated: true,
				ariaLabel: (data: BaseEdgeData) => `エラー時の接続: ${data.label || ""}`,
			},
			warning: {
				color: "#f59e0b",
				style: "dashed" as const,
				thickness: "medium" as const,
				animated: false,
				ariaLabel: (data: BaseEdgeData) => `警告時の接続: ${data.label || ""}`,
			},
			info: {
				color: "#3b82f6",
				style: "dotted" as const,
				thickness: "thin" as const,
				animated: false,
				ariaLabel: (data: BaseEdgeData) => `情報の接続: ${data.label || ""}`,
			},
			conditional: {
				color: "#8b5cf6",
				style: "dashed" as const,
				thickness: "medium" as const,
				animated: false,
				ariaLabel: (data: BaseEdgeData) => `条件付き接続: ${data.label || ""}`,
			},
		}

		const config = { ...configs[type], ...customConfig }

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (props: any) => {
			const { data = {}, selected } = props
			const mergedData = { ...config, ...data }

			const strokeWidthMap: Record<string, number> = {
				thin: 1,
				medium: 2,
				thick: 3,
			}

			const strokeDasharrayMap: Record<string, string> = {
				solid: "none",
				dashed: "5,5",
				dotted: "2,2",
			}

			return (
				<g>
					<path
						{...props}
						stroke={selected ? "#ff0072" : mergedData.color}
						strokeWidth={strokeWidthMap[mergedData.thickness]}
						strokeDasharray={strokeDasharrayMap[mergedData.style]}
						fill="none"
						className={mergedData.animated ? "animate-pulse" : ""}
					/>
					{mergedData.label && (
						<foreignObject
							x={props.centerX - 50}
							y={props.centerY - 10}
							width={100}
							height={20}
							className="overflow-visible"
						>
							<div
								className="border rounded px-2 py-1 text-xs text-center shadow-sm"
								style={{
									backgroundColor: "white",
									borderColor: mergedData.color,
									color: mergedData.color,
								}}
							>
								{mergedData.label}
							</div>
						</foreignObject>
					)}
				</g>
			)
		}
	}
}

/**
 * Default factory instance with built-in edge types
 */
export const defaultFlowEdgeFactory = new FlowEdgeFactory()

// Register default edge types
defaultFlowEdgeFactory.registerEdgeType("default", {
	component: FlowEdgeFactory.createDefaultEdge(),
	accessibility: {
		ariaLabel: data => data.label || "接続線",
	},
})

defaultFlowEdgeFactory.registerEdgeType("success", {
	component: FlowEdgeFactory.createSpecializedEdge("success"),
	accessibility: {
		ariaLabel: data => `成功時の接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("error", {
	component: FlowEdgeFactory.createSpecializedEdge("error"),
	accessibility: {
		ariaLabel: data => `エラー時の接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("warning", {
	component: FlowEdgeFactory.createSpecializedEdge("warning"),
	accessibility: {
		ariaLabel: data => `警告時の接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("info", {
	component: FlowEdgeFactory.createSpecializedEdge("info"),
	accessibility: {
		ariaLabel: data => `情報の接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("conditional", {
	component: FlowEdgeFactory.createSpecializedEdge("conditional"),
	accessibility: {
		ariaLabel: data => `条件付き接続: ${data.label || ""}`,
	},
})

// Register standard ReactFlow edge types
defaultFlowEdgeFactory.registerEdgeType("bezier", {
	component: BezierEdge,
	accessibility: {
		ariaLabel: data => `ベジエ曲線接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("smoothstep", {
	component: SmoothStepEdge,
	accessibility: {
		ariaLabel: data => `スムーズステップ接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("step", {
	component: StepEdge,
	accessibility: {
		ariaLabel: data => `ステップ接続: ${data.label || ""}`,
	},
})

defaultFlowEdgeFactory.registerEdgeType("straight", {
	component: StraightEdge,
	accessibility: {
		ariaLabel: data => `直線接続: ${data.label || ""}`,
	},
})

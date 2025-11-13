/**
 * Flow System Factory
 * Provides extensible flow system creation using factory pattern
 * Combines node, edge, and layout factories for complete customization
 */

// Factory for creating complete flow systems
import type { FlowData } from "../../../../types/multimodal"

import { type EdgeTypeConfig, FlowEdgeFactory } from "./FlowEdgeFactory"
import { type BaseNodeData, FlowNodeFactory, type NodeTypeConfig } from "./FlowNodeFactory"
import { FlowRenderer } from "./FlowRenderer"

// Layout configuration for the factory
export interface LayoutConfig {
	algorithm: "hierarchical" | "force-directed" | "grid" | "circular" | "custom"
	spacing: {
		horizontal: number
		vertical: number
	}
	nodeArrangement?: {
		groupSimilarTypes?: boolean
		prioritizeInputOutput?: boolean
		maintainAspectRatio?: boolean
	}
}

// Theme configuration
export interface ThemeConfig {
	name: string
	colors: {
		primary: string
		secondary: string
		success: string
		warning: string
		error: string
		info: string
		background: string
		surface: string
		text: string
		textSecondary: string
	}
	typography: {
		fontFamily: string
		fontSize: {
			small: string
			medium: string
			large: string
		}
	}
	borders: {
		radius: string
		width: string
	}
	shadows: {
		small: string
		medium: string
		large: string
	}
}

// Flow system configuration
export interface FlowSystemConfig {
	theme?: ThemeConfig
	layout?: LayoutConfig
	accessibility?: {
		enableScreenReader?: boolean
		enableKeyboardNavigation?: boolean
		enableHighContrast?: boolean
		announceChanges?: boolean
	}
	performance?: {
		enableVirtualization?: boolean
		enableMemoization?: boolean
		lazyLoadNodes?: boolean
		optimizeRendering?: boolean
	}
	plugins?: Array<{
		name: string
		initialize: (factory: FlowSystemFactory) => void
	}>
}

/**
 * Factory for creating complete flow systems
 */
export class FlowSystemFactory {
	private nodeFactory: FlowNodeFactory
	private edgeFactory: FlowEdgeFactory
	private themes: Map<string, ThemeConfig> = new Map()
	private layouts: Map<string, LayoutConfig> = new Map()

	constructor(config: FlowSystemConfig = {}) {
		this.nodeFactory = new FlowNodeFactory()
		this.edgeFactory = new FlowEdgeFactory()

		// Initialize default themes and layouts
		this.initializeDefaults()

		// Initialize plugins
		if (config.plugins) {
			config.plugins.forEach(plugin => plugin.initialize(this))
		}
	}

	/**
	 * Register a new node type
	 */
	registerNodeType(type: string, config: NodeTypeConfig): this {
		this.nodeFactory.registerNodeType(type, config)
		return this
	}

	/**
	 * Register a new edge type
	 */
	registerEdgeType(type: string, config: EdgeTypeConfig): this {
		this.edgeFactory.registerEdgeType(type, config)
		return this
	}

	/**
	 * Register a new theme
	 */
	registerTheme(name: string, theme: ThemeConfig): this {
		this.themes.set(name, theme)
		return this
	}

	/**
	 * Register a new layout
	 */
	registerLayout(name: string, layout: LayoutConfig): this {
		this.layouts.set(name, layout)
		return this
	}

	/**
	 * Create a custom flow renderer with the factory configuration
	 */
	createFlowRenderer(props: {
		flowData: FlowData
		preview?: boolean
		interactive?: boolean
		className?: string
		theme?: string
		layout?: string
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onChange?: (nodes: any[], edges: any[]) => void
		onExport?: (format: "json" | "png" | "svg") => void
	}) {
		const theme = props.theme ? this.themes.get(props.theme) : undefined
		const layout = props.layout ? this.layouts.get(props.layout) : undefined

		// Apply theme to flow data if specified
		let enhancedFlowData = props.flowData
		if (theme) {
			enhancedFlowData = this.applyTheme(props.flowData, theme)
		}

		// Apply layout if specified
		if (layout) {
			enhancedFlowData = this.applyLayout(enhancedFlowData, layout)
		}

		return (
			<div className={theme ? this.getThemeClasses(theme) : ""}>
				<FlowRenderer {...props} flowData={enhancedFlowData} />
			</div>
		)
	}

	/**
	 * Create a node type using a template
	 */
	createNodeFromTemplate(
		type: string,
		template: "process" | "decision" | "terminal" | "data" | "custom",
		customization?: Partial<NodeTypeConfig>
	): this {
		const templates = {
			process: {
				shape: "rectangle",
				color: "#3b82f6",
				icon: "⚙️",
				accessibility: { role: "button" },
			},
			decision: {
				shape: "diamond",
				color: "#f59e0b",
				icon: "❓",
				accessibility: { role: "button" },
			},
			terminal: {
				shape: "rounded",
				color: "#10b981",
				icon: "🏁",
				accessibility: { role: "button" },
			},
			data: {
				shape: "parallelogram",
				color: "#8b5cf6",
				icon: "📄",
				accessibility: { role: "button" },
			},
			custom: {
				shape: "rectangle",
				color: "#6b7280",
				icon: "🔧",
				accessibility: { role: "button" },
			},
		}

		const templateConfig = templates[template]
		const nodeConfig: NodeTypeConfig = {
			component: this.createNodeComponent(templateConfig),
			...customization,
		}

		return this.registerNodeType(type, nodeConfig)
	}

	/**
	 * Create an edge type using a template
	 */
	createEdgeFromTemplate(
		type: string,
		template: "flow" | "data" | "control" | "error" | "custom",
		customization?: Partial<EdgeTypeConfig>
	): this {
		const templates = {
			flow: {
				style: "solid",
				color: "#3b82f6",
				thickness: "medium",
				animated: false,
			},
			data: {
				style: "dashed",
				color: "#8b5cf6",
				thickness: "thin",
				animated: false,
			},
			control: {
				style: "dotted",
				color: "#f59e0b",
				thickness: "medium",
				animated: true,
			},
			error: {
				style: "solid",
				color: "#ef4444",
				thickness: "thick",
				animated: true,
			},
			custom: {
				style: "solid",
				color: "#6b7280",
				thickness: "medium",
				animated: false,
			},
		}

		const templateConfig = templates[template]
		const edgeConfig: EdgeTypeConfig = {
			component: this.createEdgeComponent(templateConfig),
			...customization,
		}

		return this.registerEdgeType(type, edgeConfig)
	}

	/**
	 * Get all registered node types
	 */
	getNodeTypes() {
		return this.nodeFactory.getNodeTypes()
	}

	/**
	 * Get all registered edge types
	 */
	getEdgeTypes() {
		return this.edgeFactory.getEdgeTypes()
	}

	/**
	 * Get available themes
	 */
	getThemes(): string[] {
		return Array.from(this.themes.keys())
	}

	/**
	 * Get available layouts
	 */
	getLayouts(): string[] {
		return Array.from(this.layouts.keys())
	}

	/**
	 * Initialize default themes and layouts
	 */
	private initializeDefaults(): void {
		// Default theme
		this.registerTheme("default", {
			name: "Default",
			colors: {
				primary: "#3b82f6",
				secondary: "#64748b",
				success: "#10b981",
				warning: "#f59e0b",
				error: "#ef4444",
				info: "#06b6d4",
				background: "#ffffff",
				surface: "#f8fafc",
				text: "#1e293b",
				textSecondary: "#64748b",
			},
			typography: {
				fontFamily: "Inter, system-ui, sans-serif",
				fontSize: {
					small: "0.75rem",
					medium: "0.875rem",
					large: "1rem",
				},
			},
			borders: {
				radius: "0.375rem",
				width: "1px",
			},
			shadows: {
				small: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
				medium: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
				large: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
			},
		})

		// Dark theme
		this.registerTheme("dark", {
			name: "Dark",
			colors: {
				primary: "#60a5fa",
				secondary: "#94a3b8",
				success: "#34d399",
				warning: "#fbbf24",
				error: "#f87171",
				info: "#67e8f9",
				background: "#0f172a",
				surface: "#1e293b",
				text: "#f1f5f9",
				textSecondary: "#94a3b8",
			},
			typography: {
				fontFamily: "Inter, system-ui, sans-serif",
				fontSize: {
					small: "0.75rem",
					medium: "0.875rem",
					large: "1rem",
				},
			},
			borders: {
				radius: "0.375rem",
				width: "1px",
			},
			shadows: {
				small: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
				medium: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
				large: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
			},
		})

		// Default layout
		this.registerLayout("default", {
			algorithm: "force-directed",
			spacing: {
				horizontal: 200,
				vertical: 150,
			},
			nodeArrangement: {
				groupSimilarTypes: false,
				prioritizeInputOutput: true,
				maintainAspectRatio: true,
			},
		})
	}

	/**
	 * Create a node component from template configuration
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private createNodeComponent(config: any) {
		return ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
			<div
				className={`px-4 py-2 rounded-md border-2 ${selected ? "border-blue-500" : "border-gray-300"}`}
				style={{ backgroundColor: `${config.color}20`, borderColor: config.color }}
			>
				<div className="flex items-center">
					{config.icon && <span className="mr-2">{config.icon}</span>}
					<div className="text-sm font-medium">{data.label}</div>
				</div>
				{data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
			</div>
		)
	}

	/**
	 * Create an edge component from template configuration
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private createEdgeComponent(config: any) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (props: any) => {
			const strokeDasharray =
				config.style === "dashed" ? "5,5" : config.style === "dotted" ? "2,2" : "none"
			const strokeWidth = config.thickness === "thin" ? 1 : config.thickness === "thick" ? 3 : 2

			return (
				<path
					{...props}
					stroke={config.color}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
					fill="none"
					className={config.animated ? "animate-pulse" : ""}
				/>
			)
		}
	}

	/**
	 * Apply theme to flow data
	 */
	private applyTheme(flowData: FlowData, _theme: ThemeConfig): FlowData {
		// This would apply theme colors and styles to nodes and edges
		// Implementation depends on specific theming requirements
		return flowData
	}

	/**
	 * Apply layout to flow data
	 */
	private applyLayout(flowData: FlowData, _layout: LayoutConfig): FlowData {
		// This would apply layout algorithm to arrange nodes
		// Implementation depends on specific layout requirements
		return flowData
	}

	/**
	 * Get CSS classes for theme
	 */
	private getThemeClasses(theme: ThemeConfig): string {
		return `theme-${theme.name.toLowerCase()}`
	}
}

/**
 * Default flow system factory instance
 */
export const defaultFlowSystemFactory = new FlowSystemFactory({
	accessibility: {
		enableScreenReader: true,
		enableKeyboardNavigation: true,
		enableHighContrast: false,
		announceChanges: true,
	},
	performance: {
		enableVirtualization: true,
		enableMemoization: true,
		lazyLoadNodes: false,
		optimizeRendering: true,
	},
})

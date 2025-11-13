/**
 * Chart Renderer Component
 * Renders charts using Recharts with preview and full display modes
 */

import type React from "react"
import { useCallback, useMemo, useRef } from "react"

import html2canvas from "html2canvas"
import { FiDownload, FiImage } from "react-icons/fi"
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"

import { createContextLogger } from "@/modules/logger"

import type { ChartData } from "../../../../types/multimodal"

interface ChartRendererProps {
	/** Chart data and configuration */
	chartData: ChartData
	/** Whether to show in preview mode (smaller, simplified) */
	preview?: boolean
	/** Additional CSS classes */
	className?: string
	/** Callback when chart is exported */
	onExport?: (format: "json" | "png") => void
}

/**
 * Default color palette for charts
 */
const DEFAULT_COLORS = [
	"#8884d8",
	"#82ca9d",
	"#ffc658",
	"#ff7c7c",
	"#8dd1e1",
	"#d084d0",
	"#ffb347",
	"#87ceeb",
	"#dda0dd",
	"#98fb98",
]

const log = createContextLogger("ChartRenderer")

/**
 * ChartRenderer component
 * Dynamically renders different chart types using Recharts
 */
export const ChartRenderer: React.FC<ChartRendererProps> = ({
	chartData,
	preview = false,
	className = "",
	onExport,
}) => {
	const chartContainerRef = useRef<HTMLDivElement>(null)
	const { type, title, description, data, config } = chartData

	// Use configured colors or default palette
	const colors = config.colors || DEFAULT_COLORS

	// Responsive dimensions
	const height = preview ? 200 : config.height || 400

	/**
	 * Render chart based on type
	 */
	const renderChart = () => {
		const commonProps = {
			data,
			margin: preview
				? { top: 5, right: 5, left: 5, bottom: 5 }
				: { top: 20, right: 30, left: 20, bottom: 5 },
		}

		switch (type) {
			case "bar":
				return (
					<BarChart {...commonProps}>
						{!preview && <CartesianGrid strokeDasharray="3 3" />}
						<XAxis dataKey={config.xAxis || "name"} fontSize={preview ? 10 : 12} hide={preview} />
						<YAxis fontSize={preview ? 10 : 12} hide={preview} />
						{!preview && <Tooltip />}
						{!preview && <Legend />}
						<Bar
							dataKey={config.dataKey || "value"}
							fill={colors[0]}
							radius={preview ? [2, 2, 0, 0] : [4, 4, 0, 0]}
						/>
					</BarChart>
				)

			case "line":
				return (
					<LineChart {...commonProps}>
						{!preview && <CartesianGrid strokeDasharray="3 3" />}
						<XAxis dataKey={config.xAxis || "name"} fontSize={preview ? 10 : 12} hide={preview} />
						<YAxis fontSize={preview ? 10 : 12} hide={preview} />
						{!preview && <Tooltip />}
						{!preview && <Legend />}
						<Line
							type="monotone"
							dataKey={config.dataKey || "value"}
							stroke={colors[0]}
							strokeWidth={preview ? 1 : 2}
							dot={preview ? false : { r: 4 }}
						/>
					</LineChart>
				)

			case "pie":
				return (
					<PieChart {...commonProps}>
						<Pie
							data={data}
							cx="50%"
							cy="50%"
							outerRadius={preview ? 60 : 120}
							fill={colors[0]}
							dataKey={config.dataKey || "value"}
							nameKey={config.nameKey || "name"}
							label={!preview}
						>
							{data.map((_, index) => (
								<Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
							))}
						</Pie>
						{!preview && <Tooltip />}
						{!preview && <Legend />}
					</PieChart>
				)

			case "area":
				return (
					<AreaChart {...commonProps}>
						{!preview && <CartesianGrid strokeDasharray="3 3" />}
						<XAxis dataKey={config.xAxis || "name"} fontSize={preview ? 10 : 12} hide={preview} />
						<YAxis fontSize={preview ? 10 : 12} hide={preview} />
						{!preview && <Tooltip />}
						{!preview && <Legend />}
						<Area
							type="monotone"
							dataKey={config.dataKey || "value"}
							stroke={colors[0]}
							fill={colors[0]}
							fillOpacity={0.6}
						/>
					</AreaChart>
				)

			case "scatter":
				return (
					<ScatterChart {...commonProps}>
						{!preview && <CartesianGrid strokeDasharray="3 3" />}
						<XAxis dataKey={config.xAxis || "x"} fontSize={preview ? 10 : 12} hide={preview} />
						<YAxis fontSize={preview ? 10 : 12} hide={preview} />
						{!preview && <Tooltip />}
						{!preview && <Legend />}
						<Scatter dataKey={config.dataKey || "value"} fill={colors[0]} />
					</ScatterChart>
				)

			case "composed":
				return (
					<ComposedChart {...commonProps}>
						{!preview && <CartesianGrid strokeDasharray="3 3" />}
						<XAxis dataKey={config.xAxis || "name"} fontSize={preview ? 10 : 12} hide={preview} />
						<YAxis fontSize={preview ? 10 : 12} hide={preview} />
						{!preview && <Tooltip />}
						{!preview && <Legend />}
						<Bar dataKey={config.dataKey || "value"} fill={colors[0]} />
						<Line type="monotone" dataKey={config.dataKey || "value"} stroke={colors[1]} />
					</ComposedChart>
				)

			default:
				return (
					<div className="flex items-center justify-center h-full text-gray-500">
						<p>Unsupported chart type: {type}</p>
					</div>
				)
		}
	}

	// サニタイズされたタイトルと説明
	const sanitizedTitle = useMemo(() => {
		if (!title) return ""
		// 基本的なHTMLエスケープ
		return title.replace(/[<>\"'&]/g, match => {
			const escapeMap: Record<string, string> = {
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#x27;",
				"&": "&amp;",
			}
			return escapeMap[match] || match
		})
	}, [title])

	const sanitizedDescription = useMemo(() => {
		if (!description) return ""
		return description.replace(/[<>\"'&]/g, match => {
			const escapeMap: Record<string, string> = {
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#x27;",
				"&": "&amp;",
			}
			return escapeMap[match] || match
		})
	}, [description])

	// Export functionality
	const handleExport = useCallback(
		(format: "json" | "png") => {
			if (format === "json") {
				const exportData = {
					chartData,
					type,
					title: sanitizedTitle,
					description: sanitizedDescription,
					data,
					config,
					exportedAt: new Date().toISOString(),
				}

				const jsonString = JSON.stringify(exportData, null, 2)
				const blob = new Blob([jsonString], { type: "application/json" })
				const url = URL.createObjectURL(blob)

				const link = document.createElement("a")
				link.href = url
				link.download = `chart-${sanitizedTitle.replace(/[^a-z0-9]/gi, "-") || "untitled"}.json`

				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)

				URL.revokeObjectURL(url)
				onExport?.(format)
			} else if (format === "png" && chartContainerRef.current) {
				html2canvas(chartContainerRef.current, {
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
							link.download = `chart-${sanitizedTitle.replace(/[^a-z0-9]/gi, "-") || "untitled"}.png`
							document.body.appendChild(link)
							link.click()
							document.body.removeChild(link)
							URL.revokeObjectURL(url)
							onExport?.(format)
						}, "image/png")
					})
					.catch(log.error)
			}
		},
		[chartData, type, sanitizedTitle, sanitizedDescription, data, config, onExport]
	)

	// メモ化されたチャートレンダリング関数
	const memoizedChart = useMemo(() => renderChart(), [type, data, config, preview, colors])

	return (
		<div className={`${className}`}>
			{/* Chart Title and Controls */}
			{!preview && (
				<div className="mb-4">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							{sanitizedTitle && (
								<h3 className="text-lg font-semibold text-gray-800">{sanitizedTitle}</h3>
							)}
							{sanitizedDescription && (
								<p className="text-sm text-gray-600 mt-1">{sanitizedDescription}</p>
							)}
						</div>

						{/* Export Buttons */}
						<div className="flex items-center space-x-2 ml-4">
							<button
								onClick={() => handleExport("json")}
								className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
								title="JSONとしてエクスポート"
								aria-label="チャートをJSONファイルとしてエクスポート"
							>
								<FiDownload className="w-4 h-4" />
							</button>

							<button
								onClick={() => handleExport("png")}
								className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
								title="PNGとしてエクスポート"
								aria-label="チャートをPNG画像としてエクスポート"
							>
								<FiImage className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Chart Container */}
			<div ref={chartContainerRef} className="w-full">
				<ResponsiveContainer width="100%" height={height} minHeight={preview ? 150 : 300}>
					{memoizedChart}
				</ResponsiveContainer>
			</div>

			{/* Chart Info */}
			{!preview && (
				<div className="mt-4 text-xs text-gray-500 space-y-1">
					<p>Chart Type: {type}</p>
					<p>Data Points: {data.length}</p>
					{config.xAxis && <p>X-Axis: {config.xAxis}</p>}
					{config.yAxis && (
						<p>Y-Axis: {Array.isArray(config.yAxis) ? config.yAxis.join(", ") : config.yAxis}</p>
					)}
				</div>
			)}
		</div>
	)
}

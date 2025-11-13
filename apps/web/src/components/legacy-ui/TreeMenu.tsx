import type React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
	FaChevronDown,
	FaChevronLeft,
	FaChevronRight,
	FaMinus,
	FaPlus,
	FaQuestionCircle,
} from "react-icons/fa"
import { Link, useLocation } from "react-router-dom"

type TreeNode = {
	id: string
	label: string
	path?: string
	icon?: React.ComponentType<{ className?: string }>
	children?: TreeNode[]
}

interface TreeMenuProps {
	menuData?: TreeNode[]
	onSelect?: () => void
	showCloseButton?: boolean
	onCloseMenu?: () => void
	className?: string
	title?: string
}

const TreeMenu: React.FC<TreeMenuProps> = ({
	menuData = [],
	onSelect,
	showCloseButton = false,
	onCloseMenu,
	className = "",
	title,
}) => {
	const { t } = useTranslation()
	const location = useLocation()
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

	const toggleNode = (id: string) => {
		setExpandedNodes(prev => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}

	const expandAll = () => {
		const ids = new Set<string>()
		const collect = (nodes: TreeNode[]) => {
			nodes.forEach(node => {
				ids.add(node.id)
				if (node.children) collect(node.children)
			})
		}
		collect(menuData)
		setExpandedNodes(ids)
	}

	const collapseAll = () => setExpandedNodes(new Set())

	const findParentNodes = (
		nodes: TreeNode[],
		targetPath: string,
		parents: string[] = []
	): string[] => {
		for (const node of nodes) {
			if (node.path === targetPath) {
				return parents
			}
			if (node.children) {
				const nextParents = [...parents, node.id]
				const result = findParentNodes(node.children, targetPath, nextParents)
				if (result.length) {
					return result
				}
			}
		}
		return []
	}

	useEffect(() => {
		const parentNodes = findParentNodes(menuData, location.pathname)
		if (parentNodes.length) {
			setExpandedNodes(prev => {
				const next = new Set(prev)
				parentNodes.forEach(id => next.add(id))
				return next
			})
		}
	}, [location.pathname, menuData])

	const renderMenuText = (label: string) => (
		<span className="text-sm truncate" title={label}>
			{label}
		</span>
	)

	const renderTree = (nodes: TreeNode[], level = 0) => (
		<ul className={level > 0 ? "pl-3" : ""}>
			{nodes.map(node => {
				const Icon = node.icon ?? FaQuestionCircle
				const isExpanded = expandedNodes.has(node.id)
				const isSelected = node.path && location.pathname.startsWith(node.path)
				const isFolder = Array.isArray(node.children) && node.children.length > 0

				return (
					<li key={node.id} className={`tree-menu-level-${level}`}>
						<div
							className={`flex items-center justify-between rounded px-2 py-1 transition-colors ${
								isSelected ? "bg-blue-100 font-medium" : "hover:bg-blue-50"
							}`}
						>
							{isFolder ? (
								<button
									type="button"
									onClick={() => toggleNode(node.id)}
									className="flex items-center gap-2 flex-1 text-left"
								>
									{isExpanded ? (
										<FaChevronDown className="w-3" />
									) : (
										<FaChevronRight className="w-3" />
									)}
									<Icon className="w-4 h-4" />
									{renderMenuText(t(node.id, node.label))}
								</button>
							) : (
								<Link
									to={node.path ?? "#"}
									onClick={onSelect}
									className="flex items-center gap-2 flex-1"
								>
									<Icon className="w-4 h-4" />
									{renderMenuText(t(node.id, node.label))}
								</Link>
							)}
						</div>
						{isFolder && isExpanded && node.children && renderTree(node.children, level + 1)}
					</li>
				)
			})}
		</ul>
	)

	return (
		<div className={`rounded-lg border bg-white shadow-sm ${className}`}>
			<div className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-2">
					{showCloseButton && (
						<button
							type="button"
							onClick={onCloseMenu}
							className="p-1 text-gray-500 hover:text-gray-700"
						>
							<FaChevronLeft />
						</button>
					)}
					<div>
						<div className="text-sm font-semibold">{title ?? t("menu", "Menu")}</div>
						<div className="text-xs text-gray-500">{menuData.length} items</div>
					</div>
				</div>
				<div className="flex gap-2 text-gray-500">
					<button type="button" onClick={expandAll} aria-label="Expand all">
						<FaPlus />
					</button>
					<button type="button" onClick={collapseAll} aria-label="Collapse all">
						<FaMinus />
					</button>
				</div>
			</div>
			<div className="p-2 max-h-[480px] overflow-auto">
				{menuData.length > 0 ? (
					renderTree(menuData)
				) : (
					<div className="text-xs text-gray-500">{t("noMenuItems", "No menu items")}</div>
				)}
			</div>
		</div>
	)
}

export default TreeMenu

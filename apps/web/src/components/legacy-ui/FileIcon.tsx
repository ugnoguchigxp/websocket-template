import type { ReactNode } from "react"

import { useTranslation } from "react-i18next"
import { FiFile, FiFileText, FiImage } from "react-icons/fi"

import { createContextLogger } from "@logger"

const extractUrlFilename = (target?: string | null) => {
	if (!target) return ""
	try {
		const url = new URL(target, window.location.origin)
		return url.pathname.split("/").filter(Boolean).pop() ?? target
	} catch {
		return target.split("/").filter(Boolean).pop() ?? target
	}
}

const openAuthenticatedAsset = (
	url: string,
	behavior: "download" | "new_tab",
	filename?: string
) => {
	if (behavior === "download") {
		const anchor = document.createElement("a")
		anchor.href = url
		anchor.download = filename ?? ""
		anchor.rel = "noopener noreferrer"
		anchor.click()
		return
	}
	window.open(url, "_blank", "noopener,noreferrer")
}

interface FileIconProps {
	url: string | null
	type: string
	name?: string
	title?: string
	showFilename?: boolean
	className?: string
	iconSize?: number
}

export function FileIcon({
	url,
	type,
	name,
	title,
	showFilename = false,
	className = "",
	iconSize = 20,
}: FileIconProps) {
	const { t } = useTranslation()
	const log = createContextLogger("FileIcon")

	let icon: ReactNode = <FiFile size={iconSize} />

	if (type.indexOf("image") > -1) {
		icon = <FiImage size={iconSize} />
	}

	if (type.indexOf("pdf") > -1) {
		icon = <FiFileText size={iconSize} />
	}

	const filename = name || extractUrlFilename(url)

	// インラインstyleをclassNameに置き換え
	const spanClass = `file-icon ${className} inline-flex items-center cursor-pointer`
	const filenameClass = "text-blue-500 hover:text-blue-700 hover:underline ml-1"

	return (
		<span
			className={spanClass}
			onClick={event => {
				event.stopPropagation()
				if (url) {
					log.debug("FileIcon click", { url, type, filename: name || filename })
					const behavior = type.startsWith("image") || type.includes("pdf") ? "new_tab" : "download"
					openAuthenticatedAsset(url, behavior, name || filename || undefined)
				}
			}}
			title={title || filename}
		>
			{icon}
			{showFilename && (
				<span className="ml-2">
					{url ? (
						<span className={filenameClass}>{filename}</span>
					) : (
						<span className="text-gray-500">{t("fileNotFound", "File not found")}</span>
					)}
				</span>
			)}
		</span>
	)
}

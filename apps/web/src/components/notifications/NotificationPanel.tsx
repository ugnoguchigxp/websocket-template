import { useNotificationContext } from "@/contexts/NotificationContext"
import React from "react"
import { useTranslation } from "react-i18next"
import {
	FaBell,
	FaCheckCircle,
	FaExclamationCircle,
	FaExclamationTriangle,
	FaInfoCircle,
	FaTimes,
	FaTrash,
} from "react-icons/fa"
import Tooltip from "../ui/Tooltip"
const typeIcons = {
	info: FaInfoCircle,
	success: FaCheckCircle,
	warning: FaExclamationTriangle,
	error: FaExclamationCircle,
}
const typeColors = {
	info: "text-blue-600 bg-blue-50 border-blue-200",
	success: "text-green-600 bg-green-50 border-green-200",
	warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
	error: "text-red-600 bg-red-50 border-red-200",
}
export const NotificationPanel = ({ isVisible = true }) => {
	const { t, i18n } = useTranslation()
	const { toasts, removeNotification, clearAllToasts } = useNotificationContext()
	if (!isVisible) return null
	const formatTime = dateString => {
		const date = new Date(dateString)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffMins = Math.floor(diffMs / (1000 * 60))
		if (diffMins < 1) return t("just_now")
		if (diffMins < 60) return t("minutes_ago", { count: diffMins })
		if (diffMins < 1440) return t("hours_ago", { count: Math.floor(diffMins / 60) })
		const locale = i18n.language === "ja" ? "ja-JP" : "en-US"
		return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
	}
	return (
		<div className="w-full h-full bg-gray-100 overflow-hidden flex flex-col">
			{/* ヘッダー - 一括削除ボタン */}
			{toasts.length > 0 && (
				<div className="w-full bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
					<h3 className="text-sm font-medium text-gray-700">{t("notifications", "通知")}</h3>
					<Tooltip text={t("clear_all", "全て削除")}>
						<button
							onClick={clearAllToasts}
							className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
							aria-label="Clear all notifications"
						>
							<FaTrash className="w-3 h-3" />
							<span>{t("clear_all", "全て削除")}</span>
						</button>
					</Tooltip>
				</div>
			)}
			{/* 通知一覧 */}
			<div className="w-full flex-1 overflow-y-auto">
				{toasts.length === 0 ? (
					<div className="w-full h-full flex items-center justify-center">
						<div className="text-center">
							<FaBell className="w-12 h-12 mx-auto text-gray-300" />
							<p className="text-sm text-gray-500 mt-2">{t("no_notifications")}</p>
						</div>
					</div>
				) : (
					<div className="w-full space-y-2 p-2">
						{toasts.map(notification => {
							const Icon = typeIcons[notification.type]
							const colors = typeColors[notification.type]
							return (
								<div
									key={notification.id}
									className={`w-full p-3 rounded-lg border ${colors} shadow-sm relative group`}
								>
									<div className="flex items-start space-x-3">
										<Icon className={`w-4 h-4 mt-0.5 ${colors.split(" ")[0]}`} />
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<h4 className="text-sm font-medium truncate">{notification.title}</h4>
												<div className="flex items-center space-x-2 flex-shrink-0 ml-2">
													<span className="text-xs text-gray-500">
														{formatTime(notification.createdAt || new Date().toISOString())}
													</span>
													<Tooltip text={t("delete", "削除")}>
														<button
															onClick={() => removeNotification(notification.id)}
															className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/50 rounded"
															aria-label="Delete notification"
														>
															<FaTimes className="w-3 h-3 text-gray-500 hover:text-red-600" />
														</button>
													</Tooltip>
												</div>
											</div>
											<p className="text-sm text-gray-700 mt-1">{notification.message}</p>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* フッター */}
			{toasts.length > 0 && (
				<div className="w-full bg-gray-50 border-t border-gray-200 text-center py-2">
					<p className="text-xs text-gray-500">
						{t("notification_count", { count: toasts.length })}
					</p>
				</div>
			)}
		</div>
	)
}
export default NotificationPanel

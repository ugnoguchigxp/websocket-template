import { menuData } from "@/constants/menu"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/useIsMobile"
import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { FaBars, FaChevronRight } from "react-icons/fa"
import { FiUser } from "react-icons/fi"
import { Link, Outlet } from "react-router-dom"
import { TreeMenu } from "../TreeMenu"
import { NotificationPanel } from "../notifications/NotificationPanel"
import { Button } from "../ui/Button"
import Drawer from "../ui/Drawer"
import LanguageSelector from "../ui/LanguageSelector"
import Tooltip from "../ui/Tooltip"
const Layout = () => {
	const { t } = useTranslation()
	const { logout } = useAuth()
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
	const isMobile = useIsMobile()
	const [isTreeMenuOpen, setIsTreeMenuOpen] = useState(() => {
		const saved = localStorage.getItem("treeMenuOpen")
		return saved !== null ? JSON.parse(saved) : true
	})
	useEffect(() => {
		localStorage.setItem("treeMenuOpen", JSON.stringify(isTreeMenuOpen))
	}, [isTreeMenuOpen])
	return (
		<div className="overflow-hidden">
			{!isMobile && !isTreeMenuOpen && (
				<div className="fixed left-0 z-40 flex items-center top-[124px] h-10 w-[30px]">
					<button
						id="bookmark-toggle-open"
						aria-label="Open menu"
						className="bg-blue-600 text-white rounded-r-lg shadow p-3 flex flex-col items-center hover:bg-blue-700 focus:outline-none w-[30px] h-10 justify-center"
						onClick={() => setIsTreeMenuOpen(true)}
					>
						<FaChevronRight className="w-3 h-3" />
					</button>
				</div>
			)}
			<nav className="bg-white">
				<div>
					<div className="flex justify-between items-center px-4 py-3">
						<div className="flex items-center">
							<Link to="/" className="text-xl font-bold text-gray-900 flex items-center">
								{t("websocketFramework", "WebSocket Framework")}
							</Link>
						</div>
						<div className="flex items-center space-x-4">
							<LanguageSelector className="mr-4" id="language-selector" />
							<div className="relative">
								<Tooltip text={t("click_for_details", "クリックで詳細表示")}>
									<button
										onClick={() => setDropdownOpen(open => !open)}
										className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none relative"
										aria-label="User menu"
										type="button"
									>
										<FiUser className="text-xl text-gray-700" />
									</button>
								</Tooltip>
								<Drawer isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} width="w-96">
									<div className="flex flex-col h-full">
										<div className="flex flex-col items-center mb-4 pb-4 border-b border-gray-200">
											<div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-200">
												<FiUser className="text-3xl text-gray-700" />
											</div>
											<span className="mt-2 text-gray-700 text-sm font-medium">
												{t("user", "ユーザー")}
											</span>
										</div>

										<div className="flex-1 min-h-0 flex flex-col">
											<NotificationPanel isVisible={dropdownOpen} />
										</div>

										<div className="pt-4 border-t border-gray-200">
											<Button variant="destructive" className="w-full" onClick={logout}>
												{t("logout", "ログアウト")}
											</Button>
										</div>
									</div>
								</Drawer>
							</div>
						</div>
					</div>
				</div>
				<div className="md:hidden flex justify-between items-center px-4 py-2 border-t bg-white">
					<Tooltip text={t("menu", "メニュー")}>
						<button
							onClick={() => setIsMobileMenuOpen(true)}
							className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
							aria-label="Menu"
						>
							<FaBars className="text-xl text-gray-700" />
						</button>
					</Tooltip>
				</div>
				<Drawer
					isOpen={isMobileMenuOpen}
					onClose={() => setIsMobileMenuOpen(false)}
					position="left"
				>
					<TreeMenu menuData={menuData} onSelect={() => setIsMobileMenuOpen(false)} />
				</Drawer>
			</nav>
			<div className="flex w-full">
				{!isMobile && isTreeMenuOpen && (
					<div
						className="relative h-full bg-white transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden"
						style={{
							width: "16.6667%",
							minWidth: "12rem",
							maxWidth: "400px",
							transition:
								"width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1), max-width 0.3s cubic-bezier(0.4,0,0.2,1)",
							pointerEvents: isTreeMenuOpen ? "auto" : "none",
						}}
						aria-hidden={!isTreeMenuOpen}
					>
						<div
							className="w-full h-full transition-transform duration-300 ease-in-out"
							style={{
								transform: isTreeMenuOpen ? "translateX(0)" : "translateX(-100%)",
								transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
							}}
						>
							<TreeMenu
								menuData={menuData}
								onSelect={() => {}}
								showCloseButton={true}
								onCloseMenu={() => setIsTreeMenuOpen(false)}
							/>
						</div>
					</div>
				)}
				<main className={`p-2 transition-all duration-300 flex-1 ${isMobile ? "w-full" : ""}`}>
					<Outlet />
				</main>
			</div>
		</div>
	)
}
export default Layout

export const getMenuData = (isAdmin: boolean) => {
	const baseMenuData = [
		{
			id: "top",
			label: "Top",
			labelKey: "top",
			path: "/",
		},
		{
			id: "bbs",
			label: "BBS",
			labelKey: "bbs",
			path: "/bbs",
		},
		{
			id: "components-demo",
			label: "Components Demo",
			labelKey: "components_demo",
			path: "/components-demo",
		},
		{
			id: "notification-demo",
			label: "Notification Demo",
			labelKey: "notification_demo",
			path: "/notification-demo",
		},
		{
			id: "tetris",
			label: "Tetris",
			labelKey: "tetris",
			path: "/tetris",
		},
	]

	// Add user management only for admin users
	if (isAdmin) {
		return [
			...baseMenuData.slice(0, 2), // top, bbs
			{
				id: "user-management",
				label: "User Management",
				labelKey: "user_management",
				path: "/user-management",
			},
			...baseMenuData.slice(2), // remaining items
		]
	}

	return baseMenuData
}

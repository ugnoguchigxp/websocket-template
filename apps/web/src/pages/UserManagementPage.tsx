import { createContextLogger } from "@logger"
import React, { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../components/ui/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/Dialog"
import { Input } from "../components/ui/Input"
import { useNotificationContext } from "../contexts/NotificationContext"
import i18n from "../i18n"
import { api } from "../trpc"

const log = createContextLogger("UserManagementPage")

export function UserManagementPage() {
	const { t } = useTranslation()
	const { showSuccess, showError } = useNotificationContext()
	
	// Users list
	const users = api.users.list.useQuery(
		{},
		{ staleTime: 60_000, refetchOnWindowFocus: false }
	)
	
	// Dialog states
	const [createOpen, setCreateOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [selectedUser, setSelectedUser] = useState<any>(null)
	
	// Form states
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	
	// Mutations
	const createUser = api.users.create.useMutation({
		onSuccess: () => {
			setUsername("")
			setPassword("")
			setCreateOpen(false)
			users.refetch()
			showSuccess(t("user_created"), t("user_created_desc"))
			log.info("User created successfully")
		},
		onError: e => {
			showError(t("user_failed"), e.message ?? String(e))
			log.error("Failed to create user", e)
		},
	})
	
	const updateUser = api.users.update.useMutation({
		onSuccess: () => {
			setUsername("")
			setPassword("")
			setEditOpen(false)
			setSelectedUser(null)
			users.refetch()
			showSuccess(t("user_updated"), t("user_updated_desc"))
			log.info("User updated successfully")
		},
		onError: e => {
			showError(t("user_failed"), e.message ?? String(e))
			log.error("Failed to update user", e)
		},
	})
	
	const deleteUser = api.users.delete.useMutation({
		onSuccess: () => {
			setDeleteOpen(false)
			setSelectedUser(null)
			users.refetch()
			showSuccess(t("user_deleted"), t("user_deleted_desc"))
			log.info("User deleted successfully")
		},
		onError: e => {
			showError(t("user_failed"), e.message ?? String(e))
			log.error("Failed to delete user", e)
		},
	})
	
	const formatDate = (date: string) => {
		return new Date(date).toLocaleString(i18n.language === "ja" ? "ja-JP" : "en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		})
	}
	
	const handleEdit = (user: any) => {
		setSelectedUser(user)
		setUsername(user.username)
		setPassword("")
		setEditOpen(true)
	}
	
	const handleDelete = (user: any) => {
		setSelectedUser(user)
		setDeleteOpen(true)
	}
	
	const handleCreateUser = () => {
		createUser.mutate({ username, password })
	}
	
	const handleUpdateUser = () => {
		if (selectedUser) {
			updateUser.mutate({ 
				id: selectedUser.id, 
				username, 
				password: password || undefined 
			})
		}
	}
	
	const handleDeleteUser = () => {
		if (selectedUser) {
			deleteUser.mutate({ id: selectedUser.id })
		}
	}
	
	return (
		<div className="bg-gray-100 min-h-full">
			<main className="max-w-6xl mx-auto px-4 py-6">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-2xl font-bold font-mono">{t("user_management")}</h1>
					<Button onClick={() => setCreateOpen(true)} className="font-mono">
						{t("create_user")}
					</Button>
				</div>

				{/* Users List */}
				<div className="bg-white border border-gray-400" data-testid="user-list">
					<div className="bg-gray-200 border-b border-gray-400 px-4 py-2">
						<h2 className="font-bold font-mono">{t("users")}</h2>
					</div>
					<div className="divide-y divide-gray-300">
						{users.isLoading ? (
							<div className="px-4 py-8 text-center font-mono text-gray-500">{t("loading")}</div>
						) : users.data?.length ? (
							<table className="w-full font-mono text-sm">
								<thead className="bg-gray-100">
									<tr className="border-b border-gray-300">
										<th className="px-4 py-2 text-left">{t("id")}</th>
										<th className="px-4 py-2 text-left">{t("username")}</th>
										<th className="px-4 py-2 text-left">{t("created_at")}</th>
										<th className="px-4 py-2 text-left">{t("actions")}</th>
									</tr>
								</thead>
								<tbody>
									{users.data.map((user) => (
										<tr key={user.id} className="hover:bg-gray-50">
											<td className="px-4 py-2 text-gray-600">{user.id}</td>
											<td className="px-4 py-2 font-bold" data-testid="user-username">{user.username}</td>
											<td className="px-4 py-2 text-gray-600">{formatDate(user.createdAt)}</td>
											<td className="px-4 py-2">
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleEdit(user)}
														className="font-mono"
														data-testid="edit-user-button"
													>
														{t("edit")}
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleDelete(user)}
														className="font-mono text-red-600 hover:text-red-700 hover:bg-red-50"
														data-testid="delete-user-button"
													>
														{t("delete")}
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="px-4 py-8 text-center font-mono text-gray-500">{t("no_users")}</div>
						)}
					</div>
				</div>
			</main>

			{/* Create User Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-mono">{t("create_user")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<label htmlFor="create-username" className="font-mono text-sm font-bold">
								{t("username")}
							</label>
							<Input
								id="create-username"
								placeholder={t("username_placeholder")}
								value={username}
								onChange={e => setUsername(e.target.value)}
								className="font-mono"
								name="username"
								data-testid="create-username-input"
							/>
						</div>
						<div>
							<label htmlFor="create-password" className="font-mono text-sm font-bold">
								{t("password")}
							</label>
							<Input
								id="create-password"
								type="password"
								placeholder={t("password_placeholder")}
								value={password}
								onChange={e => setPassword(e.target.value)}
								className="font-mono"
								name="password"
								data-testid="create-password-input"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setCreateOpen(false)} className="font-mono">
								{t("cancel")}
							</Button>
							<Button
								onClick={handleCreateUser}
								disabled={!username || !password || createUser.isPending}
								className="font-mono"
								data-testid="create-user-button"
							>
								{t("create")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-mono">{t("edit_user")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<label htmlFor="edit-username" className="font-mono text-sm font-bold">
								{t("username")}
							</label>
							<Input
								id="edit-username"
								placeholder={t("username_placeholder")}
								value={username}
								onChange={e => setUsername(e.target.value)}
								className="font-mono"
								name="username"
								data-testid="edit-username-input"
							/>
						</div>
						<div>
							<label htmlFor="edit-password" className="font-mono text-sm font-bold">
								{t("password")} ({t("optional")})
							</label>
							<Input
								id="edit-password"
								type="password"
								placeholder={t("leave_empty_to_keep_current")}
								value={password}
								onChange={e => setPassword(e.target.value)}
								className="font-mono"
								name="password"
								data-testid="edit-password-input"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setEditOpen(false)} className="font-mono">
								{t("cancel")}
							</Button>
							<Button
								onClick={handleUpdateUser}
								disabled={!username || updateUser.isPending}
								className="font-mono"
								data-testid="update-user-button"
							>
								{t("update")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete User Dialog */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-mono">{t("delete_user")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="font-mono">
							{t("confirm_delete_user", { username: selectedUser?.username })}
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteOpen(false)} className="font-mono">
								{t("cancel")}
							</Button>
							<Button
								onClick={handleDeleteUser}
								disabled={deleteUser.isPending}
								variant="destructive"
								className="font-mono"
								data-testid="confirm-delete-user-button"
							>
								{t("delete")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}

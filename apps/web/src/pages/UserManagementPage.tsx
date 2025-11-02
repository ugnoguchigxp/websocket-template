import { createContextLogger } from "@logger"
import type { ColumnDef } from "@tanstack/react-table"
import React, { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { FiEdit, FiTrash2 } from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import { Button } from "../components/ui/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/Dialog"
import { Input } from "../components/ui/Input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/Select"
import { Table } from "../components/ui/Table"
import { useAuth } from "../contexts/AuthContext"
import { useNotificationContext } from "../contexts/NotificationContext"
import i18n from "../i18n"
import { api } from "../trpc"

const log = createContextLogger("UserManagementPage")

export function UserManagementPage() {
	const { t } = useTranslation()
	const { isAdmin } = useAuth()
	const navigate = useNavigate()
	const { showSuccess, showError } = useNotificationContext()

	// Check admin access
	useEffect(() => {
		if (!isAdmin) {
			navigate("/")
		}
	}, [isAdmin, navigate])

	// Return null if not admin (redirect will happen)
	if (!isAdmin) {
		return null
	}

	// Users list
	const users = api.users.list.useQuery({}, { 
		staleTime: 60_000, 
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		refetchOnReconnect: true,
	})

	// Current user info
	const currentUser = api.auth.me.useQuery({}, { 
		staleTime: 60_000, 
		refetchOnWindowFocus: false,
		refetchOnMount: true,
		refetchOnReconnect: true,
	})

	// Dialog states
	const [createOpen, setCreateOpen] = useState(false)
	const [editOpen, setEditOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const [selectedUser, setSelectedUser] = useState<any>(null)

	// Form states
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")
	const [role, setRole] = useState("USER")

	// Mutations
	const createUser = api.users.create.useMutation({
		onSuccess: () => {
			setUsername("")
			setPassword("")
			setRole("USER")
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
			setRole("USER")
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

	// Helper function to check if user role is admin
	const isUserRoleAdmin = (userRole: string) => userRole === "ADMIN"

	// Helper function to get localized role name
	const getRoleDisplayName = (role: string) => {
		switch (role) {
			case "USER":
				return t("user_role")
			case "ADMIN":
				return t("admin_role")
			default:
				return role
		}
	}

	// Helper function to format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString()
	}

	// Event handlers
	const handleEdit = (user: any) => {
		setSelectedUser(user)
		setUsername(user.username)
		setPassword("")
		setRole(user.role)
		setEditOpen(true)
	}

	const handleDelete = (user: any) => {
		if (isUserRoleAdmin(user.role)) {
			showError(t("user_failed"), t("cannot_delete_admin"))
			return
		}
		setSelectedUser(user)
		setDeleteOpen(true)
	}

	const handleCreateUser = () => {
		createUser.mutate({ username, password, role })
	}

	const handleUpdateUser = () => {
		if (selectedUser) {
			updateUser.mutate({
				id: selectedUser.id,
				username,
				password: password || undefined,
				role,
			})
		}
	}

	const handleDeleteUser = () => {
		if (selectedUser) {
			deleteUser.mutate({ id: selectedUser.id })
		}
	}

	// Table columns
	const columns = useMemo<ColumnDef<any>[]>(
		() => [
			{
				accessorKey: "id",
				header: () => <span className="font-mono">{t("id")}</span>,
				cell: info => <span className="font-mono text-gray-600">{info.getValue()}</span>,
			},
			{
				accessorKey: "username",
				header: () => <span className="font-mono">{t("username")}</span>,
				cell: info => (
					<span className="font-mono font-bold" data-testid="user-username">
						{info.getValue()}
					</span>
				),
			},
			{
				accessorKey: "role",
				header: () => <span className="font-mono">{t("role")}</span>,
				cell: info => (
					<span
						className={`font-mono font-bold ${info.getValue() === "ADMIN" ? "text-red-600" : "text-gray-600"}`}
					>
						{getRoleDisplayName(info.getValue())}
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: () => <span className="font-mono">{t("created_at")}</span>,
				cell: info => (
					<span className="font-mono text-gray-600">{formatDate(info.getValue())}</span>
				),
			},
			{
				id: "actions",
				header: () => <span className="font-mono">{t("actions")}</span>,
				cell: info => {
					const user = info.row.original
					return (
						<div className="flex gap-2">
							<Button
								variant="default"
								size="sm"
								onClick={() => handleEdit(user)}
								className="font-mono bg-gray-700 hover:bg-gray-800 text-white"
								data-testid="edit-user-button"
							>
								<FiEdit className="w-4 h-4" />
							</Button>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => handleDelete(user)}
								className="font-mono"
								disabled={isUserRoleAdmin(user.role)}
								data-testid="delete-user-button"
							>
								<FiTrash2 className="w-4 h-4" />
							</Button>
						</div>
					)
				},
			},
		],
		[t, handleEdit, handleDelete, isUserRoleAdmin, getRoleDisplayName]
	)

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
				{users.isLoading ? (
					<div className="flex justify-center items-center h-32">
						<p className="font-mono text-gray-600">{t("loading")}</p>
					</div>
				) : (
					<Table
						data={users.data ?? []}
						columns={columns}
						pageSize={10}
						data-testid="user-list"
					/>
				)}
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
						<div>
							<label htmlFor="create-role" className="font-mono text-sm font-bold">
								{t("role")}
							</label>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger className="font-mono">
									<SelectValue placeholder={t("select_role")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="USER" className="font-mono">
										{t("user_role")}
									</SelectItem>
									<SelectItem value="ADMIN" className="font-mono">
										{t("admin_role")}
									</SelectItem>
								</SelectContent>
							</Select>
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
								{t("password")}
							</label>
							<Input
								id="edit-password"
								type="password"
								placeholder={t("password_placeholder")}
								value={password}
								onChange={e => setPassword(e.target.value)}
								className="font-mono"
								name="password"
								data-testid="edit-password-input"
							/>
						</div>
						<div>
							<label htmlFor="edit-role" className="font-mono text-sm font-bold">
								{t("role")}
							</label>
							<Select value={role} onValueChange={setRole}>
								<SelectTrigger className="font-mono">
									<SelectValue placeholder={t("select_role")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="USER" className="font-mono">
										{t("user_role")}
									</SelectItem>
									<SelectItem value="ADMIN" className="font-mono">
										{t("admin_role")}
									</SelectItem>
								</SelectContent>
							</Select>
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
							{t("delete_user_confirm", { username: selectedUser?.username })}
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteOpen(false)} className="font-mono">
								{t("cancel")}
							</Button>
							<Button
								variant="destructive"
								onClick={handleDeleteUser}
								disabled={deleteUser.isPending}
								className="font-mono"
								data-testid="delete-user-confirm-button"
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

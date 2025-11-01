import { createContextLogger } from "@logger"
import type { ColumnDef, SortingState, ColumnFiltersState } from "@tanstack/react-table"
import React, { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../components/ui/Button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/Dialog"
import { Input } from "../components/ui/Input"
import { Table } from "../components/ui/Table"
import { Textarea } from "../components/ui/Textarea"
import { useNotificationContext } from "../contexts/NotificationContext"
import i18n from "../i18n"
import { api } from "../trpc"

const log = createContextLogger("BBSPage")

export function BBSPage() {
	const { t } = useTranslation()
	const { showSuccess, showError } = useNotificationContext()
	
	// Table state
	const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	
	// Posts data
	const posts = api.posts.list.useQuery(
		{ limit: 50 },
		{ staleTime: 60_000, refetchOnWindowFocus: false }
	)
	
	// UI state
	const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [body, setBody] = useState("")
	
	// Comments
	const comments = api.posts.comments.list.useQuery(
		selectedPostId ? { postId: selectedPostId } : undefined,
		{ enabled: !!selectedPostId }
	)
	
	// Comment form
	const [commentBody, setCommentBody] = useState("")
	
	// Mutations
	const createPost = api.posts.create.useMutation({
		onSuccess: () => {
			setTitle("")
			setBody("")
			setOpen(false)
			posts.refetch()
			showSuccess(t("post_created"), t("post_created_desc"))
			log.info("Post created successfully")
		},
		onError: e => {
			showError(t("post_failed"), e.message ?? String(e))
			log.error("Failed to create post", e)
		},
	})
	
	const addComment = api.posts.comments.add.useMutation({
		onSuccess: () => {
			setCommentBody("")
			comments.refetch()
			showSuccess(t("comment_posted"), t("comment_posted_desc"))
			log.info("Comment added successfully")
		},
		onError: e => {
			showError(t("comment_failed"), e.message ?? String(e))
			log.error("Failed to add comment", e)
		},
	})
	
	// Helper function to format date
	const formatDate = (date: string) => {
		return new Date(date).toLocaleString(i18n.language === "ja" ? "ja-JP" : "en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		})
	}

	// Event handlers
	const handleCreatePost = () => {
		createPost.mutate({ title, body })
	}

	const handleAddComment = () => {
		if (selectedPostId) {
			addComment.mutate({ postId: selectedPostId, body: commentBody })
		}
	}

	// Table columns with enhanced features
	const columns = useMemo<ColumnDef<any>[]>(
		() => [
			{
				accessorKey: "id",
				header: ({ column }) => (
					<button
						className="font-mono font-semibold hover:bg-gray-100 px-2 py-1 rounded"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						{t("number")}
						{column.getIsSorted() === "asc" && " ↑"}
						{column.getIsSorted() === "desc" && " ↓"}
					</button>
				),
				cell: info => <span className="font-mono text-gray-600">{info.getValue()}</span>,
				enableSorting: true,
				enableColumnFilter: false,
			},
			{
				accessorKey: "title",
				header: ({ column }) => (
					<button
						className="font-mono font-semibold hover:bg-gray-100 px-2 py-1 rounded"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						{t("title")}
						{column.getIsSorted() === "asc" && " ↑"}
						{column.getIsSorted() === "desc" && " ↓"}
					</button>
				),
				cell: info => {
					const post = info.row.original
					return (
						<button
							className="font-mono text-left text-blue-600 underline hover:text-blue-800 w-full hover:bg-blue-50 px-2 py-1 rounded transition-colors"
							onClick={() => setSelectedPostId(post.id)}
							data-testid="post-title"
						>
							{info.getValue()}
						</button>
					)
				},
				enableSorting: true,
				filterFn: (row, columnId, filterValue) => {
					const title = row.getValue(columnId) as string
					return title.toLowerCase().includes(filterValue.toLowerCase())
				},
			},
			{
				accessorKey: "author",
				header: ({ column }) => (
					<button
						className="font-mono font-semibold hover:bg-gray-100 px-2 py-1 rounded"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						{t("author")}
						{column.getIsSorted() === "asc" && " ↑"}
						{column.getIsSorted() === "desc" && " ↓"}
					</button>
				),
				cell: info => (
					<span className="font-mono text-gray-700 font-medium">
						{info.getValue()?.username}
					</span>
				),
				enableSorting: true,
				filterFn: (row, columnId, filterValue) => {
					const author = row.getValue(columnId) as { username: string }
					return author.username.toLowerCase().includes(filterValue.toLowerCase())
				},
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<button
						className="font-mono font-semibold hover:bg-gray-100 px-2 py-1 rounded"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						{t("posted_at")}
						{column.getIsSorted() === "asc" && " ↑"}
						{column.getIsSorted() === "desc" && " ↓"}
					</button>
				),
				cell: info => (
					<span className="font-mono text-gray-600">
						{formatDate(info.getValue())}
					</span>
				),
				enableSorting: true,
				enableColumnFilter: false,
				sortingFn: (rowA, rowB, columnId) => {
					const dateA = new Date(rowA.getValue(columnId) as string)
					const dateB = new Date(rowB.getValue(columnId) as string)
					return dateA.getTime() - dateB.getTime()
				},
			},
		],
		[t, formatDate]
	)

	// Helper to get selected post
	const selectedPost = useMemo(
		() => posts.data?.items.find(p => p.id === selectedPostId),
		[posts.data, selectedPostId]
	)

	return (
		<div className="bg-gray-100 min-h-full">
			<main className="max-w-6xl mx-auto px-4 py-6">
				{/* Header with controls */}
				<div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<Button onClick={() => setOpen(true)} className="font-mono">
						{t("new_post")}
					</Button>
					
					{/* Global filter input */}
					<div className="flex items-center gap-2">
						<span className="font-mono text-sm text-gray-600">{t("search")}:</span>
						<Input
							placeholder={t("search_posts")}
							value={(columnFilters.find(f => f.id === "title")?.value ?? "")}
							onChange={e =>
								setColumnFilters(
									e.target.value
										? [{ id: "title", value: e.target.value }]
										: []
								)
							}
							className="font-mono max-w-xs"
							data-testid="search-input"
						/>
					</div>
				</div>

				{/* Enhanced Thread List */}
				<Table
					data={posts.data?.items ?? []}
					columns={columns}
					loading={posts.isLoading}
					emptyMessage={t("no_posts")}
					enableSelection={false}
					enableSorting={true}
					enablePagination={true}
					enableFiltering={true}
					pageSize={20}
					sorting={sorting}
					onSortingChange={setSorting}
					columnFilters={columnFilters}
					onColumnFiltersChange={setColumnFilters}
					className="mb-6 shadow-sm border border-gray-200"
					data-testid="post-list"
				/>

				{/* Selected Thread */}
				{selectedPost && (
					<div className="bg-white border border-gray-400">
						<div className="bg-gray-200 border-b border-gray-400 px-4 py-2">
							<h2 className="font-bold font-mono">
								{t("thread")}: {selectedPost.title}
							</h2>
						</div>

						{/* Original Post */}
						<div className="border-b border-gray-300 px-4 py-4 bg-gray-50">
							<div className="flex items-baseline gap-4 mb-2 font-mono text-sm text-gray-600">
								<span>
									1 {t("name")}: {selectedPost.author.username}
								</span>
								<span>{formatDate(selectedPost.createdAt)}</span>
							</div>
							<div className="font-mono whitespace-pre-wrap pl-4">{selectedPost.body}</div>
						</div>

						{/* Comments */}
						<div className="divide-y divide-gray-200">
							{comments.isLoading ? (
								<div className="px-4 py-8 text-center font-mono text-gray-500">{t("loading")}</div>
							) : comments.data?.length ? (
								comments.data.map((comment, index) => (
									<div key={comment.id} className="px-4 py-4">
										<div className="flex items-baseline gap-4 mb-2 font-mono text-sm text-gray-600">
											<span>
												{index + 2} {t("name")}: {comment.author.username}
											</span>
											<span>{formatDate(comment.createdAt)}</span>
										</div>
										<div className="font-mono whitespace-pre-wrap pl-4">{comment.body}</div>
									</div>
								))
							) : (
								<div className="px-4 py-4 font-mono text-gray-500">{t("no_comments")}</div>
							)}
						</div>

						{/* Add Comment Form */}
						<div className="border-t border-gray-400 bg-gray-50 px-4 py-4">
							<div className="font-mono font-bold mb-2">{t("reply")}</div>
							<div className="space-y-2">
								<Textarea
									placeholder={t("comment_placeholder")}
									value={commentBody}
									onChange={e => setCommentBody(e.target.value)}
									className="font-mono"
									rows={4}
									name="comment"
									data-testid="comment-input"
								/>
								<Button
									onClick={handleAddComment}
									disabled={!commentBody || addComment.isPending}
									className="font-mono"
									data-testid="add-comment-button"
								>
									{t("post")}
								</Button>
							</div>
						</div>
					</div>
				)}
			</main>

			{/* New Post Dialog */}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-mono">{t("new_thread")}</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<label htmlFor="thread-title" className="font-mono text-sm font-bold">
								{t("title")}
							</label>
							<Input
								id="thread-title"
								placeholder={t("title_placeholder")}
								value={title}
								onChange={e => setTitle(e.target.value)}
								className="font-mono"
								name="title"
								data-testid="post-title-input"
							/>
						</div>
						<div>
							<label htmlFor="thread-body" className="font-mono text-sm font-bold">
								{t("body")}
							</label>
							<Textarea
								id="thread-body"
								placeholder={t("body_placeholder")}
								value={body}
								onChange={e => setBody(e.target.value)}
								className="font-mono"
								rows={6}
								name="body"
								data-testid="post-body-input"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setOpen(false)} className="font-mono">
								{t("cancel")}
							</Button>
							<Button
								onClick={handleCreatePost}
								disabled={!title || !body || createPost.isPending}
								className="font-mono"
								data-testid="create-post-button"
							>
								{t("post")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}

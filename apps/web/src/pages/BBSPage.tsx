import { createContextLogger } from "@logger"
import type { ColumnDef } from "@tanstack/react-table"
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
	const posts = api.posts.list.useQuery(
		{ limit: 50 },
		{ staleTime: 60_000, refetchOnWindowFocus: false }
	)
	const [selectedPostId, setSelectedPostId] = useState(null)
	const comments = api.posts.comments.list.useQuery(
		selectedPostId ? { postId: selectedPostId } : undefined,
		{ enabled: !!selectedPostId }
	)
	// New Post modal
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [body, setBody] = useState("")
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
	// Add Comment
	const [commentBody, setCommentBody] = useState("")
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

	// Table columns
	const columns = useMemo<ColumnDef<any>[]>(
		() => [
			{
				accessorKey: "id",
				header: () => <span className="font-mono">{t("number")}</span>,
				cell: info => <span className="font-mono text-gray-600">{info.getValue()}</span>,
			},
			{
				accessorKey: "title",
				header: () => <span className="font-mono">{t("title")}</span>,
				cell: info => {
					const post = info.row.original
					return (
						<button
							className="font-mono text-left text-blue-600 underline hover:text-blue-800 w-full"
							onClick={() => setSelectedPostId(post.id)}
							data-testid="post-title"
						>
							{info.getValue()}
						</button>
					)
				},
			},
			{
				accessorKey: "author",
				header: () => <span className="font-mono">{t("author")}</span>,
				cell: info => <span className="font-mono text-gray-700">{info.getValue()?.username}</span>,
			},
			{
				accessorKey: "createdAt",
				header: () => <span className="font-mono">{t("posted_at")}</span>,
				cell: info => (
					<span className="font-mono text-gray-600">{formatDate(info.getValue())}</span>
				),
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
				{/* New Post Button */}
				<div className="mb-4">
					<Button onClick={() => setOpen(true)} className="font-mono">
						{t("new_post")}
					</Button>
				</div>

				{/* Thread List */}
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
					className="mb-6"
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

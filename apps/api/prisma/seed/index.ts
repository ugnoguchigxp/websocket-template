import { PrismaClient } from "@prisma/client"
import { hash } from "argon2"

const prisma = new PrismaClient()

async function main() {
	console.log("🌱 Starting database seeding...")

	// Clear existing data
	console.log("🗑️  Clearing existing data...")
	await prisma.comment.deleteMany()
	await prisma.post.deleteMany()
	await prisma.user.deleteMany()

	// Create admin user with ADMIN role
	const adminPassword = "websocket3001"
	const hashedAdminPassword = await hash(adminPassword)

	const admin = await prisma.user.create({
		data: {
			username: "admin",
			passwordHash: hashedAdminPassword,
			role: "ADMIN",
		},
	})

	console.log("✅ Admin user created:", {
		id: admin.id,
		username: admin.username,
		role: admin.role,
	})

	// Create a test regular user
	const testUserPassword = "password123"
	const hashedTestPassword = await hash(testUserPassword)

	const testUser = await prisma.user.create({
		data: {
			username: "testuser",
			passwordHash: hashedTestPassword,
			role: "USER",
		},
	})

	console.log("✅ Test user created:", {
		id: testUser.id,
		username: testUser.username,
		role: testUser.role,
	})

	// Create sample posts
	const posts = [
		{
			title: "WebSocketフレームワークへようこそ！",
			body: "これは最初の投稿です。TanStack Tableの機能が強化されました！\n\n- ソート機能\n- 検索機能\n- ページネーション\n\n管理者権限でユーザー管理も利用できます。",
			authorId: admin.id,
		},
		{
			title: "リアルタイム通信のデモ",
			body: "WebSocketを使用したリアルタイム通信のデモンストレーションです。",
			authorId: admin.id,
		},
		{
			title: "技術スタックについて",
			body: "このプロジェクトはTypeScript、tRPC、Prisma、WebSocketを使用して構築されています。",
			authorId: testUser.id,
		},
	]

	for (const postData of posts) {
		await prisma.post.create({
			data: postData,
		})
	}

	console.log("✅ Sample posts created")

	// Create some comments
	const comments = [
		{ body: "素晴らしい投稿ですね！", postId: 1, authorId: testUser.id },
		{ body: "WebSocketの動作が非常にスムーズです。", postId: 2, authorId: testUser.id },
		{ body: "技術選定について詳しく教えていただけますか？", postId: 3, authorId: admin.id },
		{ body: "リアルタイム更新の機能が特に気に入りました。", postId: 2, authorId: admin.id },
		{ body: "ありがとうございます。今後の機能追加も楽しみです！", postId: 1, authorId: admin.id },
	]

	for (const commentData of comments) {
		await prisma.comment.create({
			data: commentData,
		})
	}

	console.log("✅ Demo comments created")

	// Display summary
	const userCount = await prisma.user.count()
	const postCount = await prisma.post.count()
	const commentCount = await prisma.comment.count()

	console.log("🎉 Database seeding completed successfully!", {
		users: userCount,
		posts: postCount,
		comments: commentCount,
	})

	console.log("\n📋 Login credentials:")
	console.log("Admin: username=admin, password=websocket3001")
	console.log("Test User: username=testuser, password=password123")
}

main()
	.catch(e => {
		console.error("❌ Error during seeding:", e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

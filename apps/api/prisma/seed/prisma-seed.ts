import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { config } from "dotenv";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../../../.env");
config({ path: envPath });

// Change working directory to project root for correct relative path resolution
process.chdir(path.resolve(__dirname, "../../../.."));

const prisma = new PrismaClient();

async function seedDatabase() {
	try {
		console.log("🌱 Starting Prisma database seeding...");

		// Clear existing data (optional - comment out if you want to preserve data)
		console.log("🗑️  Clearing existing data...");
		await prisma.comment.deleteMany();
		await prisma.post.deleteMany();
		await prisma.user.deleteMany();

		// Seed admin user
		console.log("👤 Seeding admin user...");
		const adminPasswordHash = await argon2.hash("websocket3001");
		const adminUser = await prisma.user.create({
			data: {
				username: "admin",
				passwordHash: adminPasswordHash,
			},
		});
		console.log("✅ Admin user created", { id: adminUser.id, username: adminUser.username });

		// Seed demo posts
		console.log("📝 Seeding demo posts...");
		const posts = [
			{
				title: "WebSocketフレームワークへようこそ",
				body: "これは最初の投稿です。WebSocketフレームワークの機能を試してみましょう。",
			},
			{
				title: "リアルタイム通信のデモ",
				body: "WebSocketを使用したリアルタイム通信のデモンストレーションです。",
			},
			{
				title: "技術スタックについて",
				body: "このプロジェクトはTypeScript、tRPC、Prisma、WebSocketを使用して構築されています。",
			},
		];

		const createdPosts = [];
		for (const post of posts) {
			const createdPost = await prisma.post.create({
				data: {
					title: post.title,
					body: post.body,
					authorId: adminUser.id,
				},
			});
			createdPosts.push(createdPost);
		}
		console.log("✅ Demo posts created", { count: createdPosts.length });

		// Seed demo comments
		console.log("💬 Seeding demo comments...");
		const comments = [
			{ body: "素晴らしい投稿ですね！", postId: createdPosts[0].id },
			{ body: "WebSocketの動作が非常にスムーズです。", postId: createdPosts[1].id },
			{ body: "技術選定について詳しく教えていただけますか？", postId: createdPosts[2].id },
			{ body: "リアルタイム更新の機能が特に気に入りました。", postId: createdPosts[1].id },
			{ body: "ありがとうございます。今後の機能追加も楽しみです！", postId: createdPosts[0].id },
		];

		for (const comment of comments) {
			await prisma.comment.create({
				data: {
					body: comment.body,
					postId: comment.postId,
					authorId: adminUser.id,
				},
			});
		}
		console.log("✅ Demo comments created", { count: comments.length });

		// Display seeded data summary
		const userCount = await prisma.user.count();
		const postCount = await prisma.post.count();
		const commentCount = await prisma.comment.count();

		console.log("🎉 Prisma database seeding completed successfully", {
			users: userCount,
			posts: postCount,
			comments: commentCount,
		});

		console.log("\n✅ データベースのシードが完了しました！");
		console.log("📊 作成されたデータ:");
		console.log(`   👤 ユーザー: ${userCount}件`);
		console.log(`   📝 投稿: ${postCount}件`);
		console.log(`   💬 コメント: ${commentCount}件`);
		console.log("\n🔐 ログイン情報:");
		console.log("   ユーザー名: admin");
		console.log("   パスワード: websocket3001");
	} catch (error) {
		console.error("❌ Prisma database seeding failed:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedDatabase();
}

export { seedDatabase };

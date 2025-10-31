import * as fs from "fs";
import { DatabaseSync } from "node:sqlite";
import * as path from "path";
import argon2 from "argon2";

const DATA_DIR = path.join(process.cwd(), "prisma");
const DB_PATH = path.join(DATA_DIR, "dev.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	authorId INTEGER NOT NULL,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (authorId) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	body TEXT NOT NULL,
	postId INTEGER NOT NULL,
	authorId INTEGER NOT NULL,
	createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (postId) REFERENCES posts (id),
	FOREIGN KEY (authorId) REFERENCES users (id)
);
`);

async function seedDatabase() {
	try {
		console.log("🌱 Starting database seeding...");
		
		// Clear existing data (optional - comment out if you want to preserve data)
		console.log("🗑️  Clearing existing data...");
		db.exec("DELETE FROM comments");
		db.exec("DELETE FROM posts");
		db.exec("DELETE FROM users");
		
		// Seed admin user
		console.log("👤 Seeding admin user...");
		const adminPasswordHash = await argon2.hash("websocket3001");
		const adminResult = db
			.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
			.run("admin", adminPasswordHash);
		const adminId = adminResult.lastInsertRowid as number;
		console.log("✅ Admin user created", { id: adminId, username: "admin" });
		
		// Seed demo posts
		console.log("📝 Seeding demo posts...");
		const posts = [
			{ title: "WebSocketフレームワークへようこそ", body: "これは最初の投稿です。WebSocketフレームワークの機能を試してみましょう。" },
			{ title: "リアルタイム通信のデモ", body: "WebSocketを使用したリアルタイム通信のデモンストレーションです。" },
			{ title: "技術スタックについて", body: "このプロジェクトはTypeScript、tRPC、Prisma、WebSocketを使用して構築されています。" }
		];
		
		const postIds: number[] = [];
		for (const post of posts) {
			const result = db
				.prepare("INSERT INTO posts (title, body, authorId) VALUES (?, ?, ?)")
				.run(post.title, post.body, adminId);
			postIds.push(result.lastInsertRowid as number);
		}
		console.log("✅ Demo posts created", { count: postIds.length });
		
		// Seed demo comments
		console.log("💬 Seeding demo comments...");
		const comments = [
			{ body: "素晴らしい投稿ですね！", postId: postIds[0] },
			{ body: "WebSocketの動作が非常にスムーズです。", postId: postIds[1] },
			{ body: "技術選定について詳しく教えていただけますか？", postId: postIds[2] },
			{ body: "リアルタイム更新の機能が特に気に入りました。", postId: postIds[1] },
			{ body: "ありがとうございます。今後の機能追加も楽しみです！", postId: postIds[0] }
		];
		
		for (const comment of comments) {
			db
				.prepare("INSERT INTO comments (body, postId, authorId) VALUES (?, ?, ?)")
				.run(comment.body, comment.postId, adminId);
		}
		console.log("✅ Demo comments created", { count: comments.length });
		
		// Display seeded data summary
		const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
		const postCount = db.prepare("SELECT COUNT(*) as count FROM posts").get() as { count: number };
		const commentCount = db.prepare("SELECT COUNT(*) as count FROM comments").get() as { count: number };
		
		console.log("🎉 Database seeding completed successfully", {
			users: userCount.count,
			posts: postCount.count,
			comments: commentCount.count
		});
		
		console.log("\n✅ データベースのシードが完了しました！");
		console.log("📊 作成されたデータ:");
		console.log(`   👤 ユーザー: ${userCount.count}件`);
		console.log(`   📝 投稿: ${postCount.count}件`);
		console.log(`   💬 コメント: ${commentCount.count}件`);
		console.log("\n🔐 ログイン情報:");
		console.log("   ユーザー名: admin");
		console.log("   パスワード: websocket3001");
		
	} catch (error) {
		console.error("❌ Database seeding failed:", error);
		console.error("❌ データベースのシードに失敗しました:", error);
		process.exit(1);
	} finally {
		db.close();
	}
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedDatabase();
}

export { seedDatabase };

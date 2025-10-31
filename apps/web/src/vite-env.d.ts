/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_LOG_LEVEL?: string
	readonly DEV: boolean
	// 他の環境変数をここに追加
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

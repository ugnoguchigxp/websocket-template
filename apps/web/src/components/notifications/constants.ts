/**
 * 通知システムで使用する定数定義
 */
export const NOTIFICATION_LIMITS = {
	/** トースト通知の最大表示数 */
	MAX_TOASTS: 5,
	/** 通知履歴の取得件数上限 */
	MAX_HISTORY: 50,
	/** デモ用の制限値 */
	DEMO_HISTORY: 10,
}
export const NOTIFICATION_DURATION = {
	/** エラー通知の表示時間（ms） */
	ERROR: 8000,
	/** 警告通知の表示時間（ms） */
	WARNING: 6000,
	/** 成功通知の表示時間（ms） */
	SUCCESS: 4000,
	/** 情報通知の表示時間（ms） */
	INFO: 5000,
	/** デフォルトの表示時間（ms） */
	DEFAULT: 5000,
}
export const NOTIFICATION_ANIMATION = {
	/** トーストアニメーションの遅延（ms） */
	TOAST_DELAY: 50,
	/** ハイドアニメーションの時間（ms） */
	HIDE_DURATION: 300,
}
export const NOTIFICATION_LIMITS_TEXT = {
	/** カスタムタイトル最大文字数 */
	TITLE_MAX: 100,
	/** カスタムメッセージ最大文字数 */
	MESSAGE_MAX: 500,
}

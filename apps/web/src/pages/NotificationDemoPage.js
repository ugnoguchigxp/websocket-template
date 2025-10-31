import React, { useState } from 'react';
import { FaBell, FaPaperPlane, FaExclamationCircle, FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTrash, } from 'react-icons/fa';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { NOTIFICATION_DURATION, NOTIFICATION_LIMITS_TEXT } from '@/components/notifications/constants';
const sampleNotifications = [
    {
        type: 'info',
        title: 'システム情報',
        message: '定期メンテナンスが予定されています（明日 2:00-4:00）',
        duration: NOTIFICATION_DURATION.INFO,
    },
    {
        type: 'success',
        title: 'ファイルアップロード完了',
        message: 'document.pdf のアップロードが完了しました',
        duration: NOTIFICATION_DURATION.SUCCESS,
    },
    {
        type: 'warning',
        title: 'ストレージ容量警告',
        message: 'ストレージ使用量が90%を超過しています',
        duration: NOTIFICATION_DURATION.WARNING,
    },
    {
        type: 'error',
        title: 'API接続エラー',
        message: 'サーバーとの接続に失敗しました。しばらく待ってから再試行してください。',
        duration: NOTIFICATION_DURATION.ERROR,
    },
];
export function NotificationDemoPage() {
    const [selectedDemo, setSelectedDemo] = useState(sampleNotifications[0]);
    const [customTitle, setCustomTitle] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [customType, setCustomType] = useState('info');
    const { toasts, addNotification, clearAllToasts, showSuccess, showError, showWarning, showInfo, } = useNotificationContext();
    const handleDemoNotification = (demo) => {
        addNotification(demo);
    };
    const handleCustomNotification = () => {
        if (!customTitle.trim() || !customMessage.trim()) {
            showError('入力エラー', 'タイトルとメッセージを入力してください');
            return;
        }
        addNotification({
            type: customType,
            title: customTitle.trim(),
            message: customMessage.trim(),
            duration: NOTIFICATION_DURATION.DEFAULT,
        });
        setCustomTitle('');
        setCustomMessage('');
    };
    const handleConvenienceMethod = (method) => {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        switch (method) {
            case 'success':
                showSuccess('操作完了', `処理が正常に完了しました (${timestamp})`);
                break;
            case 'error':
                showError('エラー発生', `予期しないエラーが発生しました (${timestamp})`);
                break;
            case 'warning':
                showWarning('注意事項', `操作前に設定を確認してください (${timestamp})`);
                break;
            case 'info':
                showInfo('お知らせ', `新機能がリリースされました (${timestamp})`);
                break;
        }
    };
    const handleClearAllToasts = () => {
        clearAllToasts();
        showInfo('クリア完了', 'すべてのトースト通知をクリアしました');
    };
    const typeIcons = {
        info: FaInfoCircle,
        success: FaCheckCircle,
        warning: FaExclamationTriangle,
        error: FaExclamationCircle,
    };
    const typeColors = {
        info: 'text-blue-600 bg-blue-50 border-blue-200',
        success: 'text-green-600 bg-green-50 border-green-200',
        warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        error: 'text-red-600 bg-red-50 border-red-200',
    };
    return (<div className="p-6 space-y-6 max-w-4xl mx-auto">
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center space-x-2 mb-4">
					<FaBell className="w-6 h-6 text-blue-600"/>
					<h2 className="text-xl font-semibold text-gray-900">通知システム デモ</h2>
				</div>

				<div className="text-sm text-gray-600 mb-6">
					<p>通知システムの動作確認用デモです。各種通知をテストできます。</p>
					<div className="mt-2 flex items-center space-x-4">
						<span className="text-gray-500">アクティブトースト: {toasts.length}件</span>
					</div>
				</div>

				{/* サンプル通知セクション */}
				<div className="space-y-4">
					<h3 className="text-lg font-medium text-gray-800">1. サンプル通知テスト</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{sampleNotifications.map((demo, index) => {
            const Icon = typeIcons[demo.type];
            return (<div key={index} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedDemo === demo
                    ? typeColors[demo.type] + ' border-2'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`} onClick={() => setSelectedDemo(demo)}>
									<div className="flex items-start space-x-3">
										<Icon className={`w-5 h-5 mt-0.5 ${selectedDemo === demo ? '' : 'text-gray-500'}`}/>
										<div className="flex-1">
											<h4 className="font-medium text-sm">{demo.title}</h4>
											<p className="text-xs text-gray-600 mt-1">{demo.message}</p>
											<p className="text-xs text-gray-500 mt-2">
												タイプ: {demo.type} | 表示時間: {demo.duration}ms
											</p>
										</div>
									</div>
								</div>);
        })}
					</div>

					<button onClick={() => handleDemoNotification(selectedDemo)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						<FaPaperPlane className="w-4 h-4"/>
						<span>選択した通知を送信</span>
					</button>
				</div>

				{/* カスタム通知セクション */}
				<div className="border-t pt-6 mt-6">
					<h3 className="text-lg font-medium text-gray-800 mb-4">2. カスタム通知作成</h3>

					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									タイトル
								</label>
								<input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="通知のタイトルを入力" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" maxLength={NOTIFICATION_LIMITS_TEXT.TITLE_MAX}/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									通知タイプ
								</label>
								<select value={customType} onChange={(e) => setCustomType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
									<option value="info">Info (情報)</option>
									<option value="success">Success (成功)</option>
									<option value="warning">Warning (警告)</option>
									<option value="error">Error (エラー)</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								メッセージ
							</label>
							<textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="通知メッセージを入力" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" maxLength={NOTIFICATION_LIMITS_TEXT.MESSAGE_MAX}/>
							<p className="text-xs text-gray-500 mt-1">
								{customMessage.length}/{NOTIFICATION_LIMITS_TEXT.MESSAGE_MAX}文字
							</p>
						</div>

						<button onClick={handleCustomNotification} disabled={!customTitle.trim() || !customMessage.trim()} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
							<FaPaperPlane className="w-4 h-4"/>
							<span>カスタム通知を送信</span>
						</button>
					</div>
				</div>

				{/* 便利メソッドテスト */}
				<div className="border-t pt-6 mt-6">
					<h3 className="text-lg font-medium text-gray-800 mb-4">3. 便利メソッドテスト</h3>

					<div className="flex flex-wrap gap-2">
						<button onClick={() => handleConvenienceMethod('success')} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
							showSuccess()
						</button>
						<button onClick={() => handleConvenienceMethod('error')} className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
							showError()
						</button>
						<button onClick={() => handleConvenienceMethod('warning')} className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm">
							showWarning()
						</button>
						<button onClick={() => handleConvenienceMethod('info')} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
							showInfo()
						</button>
					</div>
				</div>

				{/* 制御機能 */}
				<div className="border-t pt-6 mt-6">
					<h3 className="text-lg font-medium text-gray-800 mb-4">4. 通知制御</h3>

					<div className="flex flex-wrap gap-2">
						<button onClick={handleClearAllToasts} disabled={toasts.length === 0} className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
							<FaTrash className="w-4 h-4"/>
							<span>トースト全削除</span>
						</button>
					</div>
				</div>
			</div>
		</div>);
}

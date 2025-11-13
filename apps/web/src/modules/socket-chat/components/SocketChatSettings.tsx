/**
 * Socket Chat Settings Panel
 * Configuration panel for chat behavior and display options
 */

import React, { useCallback, useMemo, useState } from 'react';

import { FiX, FiSettings, FiToggleLeft, FiToggleRight, FiDownload, FiUpload, FiRefreshCw, FiInfo } from 'react-icons/fi';

import { createContextLogger } from '@/modules/logger';

import type { MCPChatSettings, ChartDefaults, BrowserDefaults, PlaywrightDefaults } from '../types/mcpChat';

const log = createContextLogger('SocketChatSettings');

interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  enabled?: boolean;
}

interface SocketChatSettingsProps {
  /** Current settings configuration */
  settings: MCPChatSettings;
  /** Callback when settings change */
  onSettingsChange: (settings: MCPChatSettings) => void;
  /** Callback to close the settings panel */
  onClose: () => void;
  /** Available tools from the server */
  availableTools?: ToolDefinition[];
  /** Whether the settings are being saved */
  isSaving?: boolean;
  /** Callback to reset settings to defaults */
  onResetToDefaults?: () => void;
}

export const SocketChatSettings: React.FC<SocketChatSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose,
  availableTools,
  isSaving = false,
  onResetToDefaults
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Default available tools if not provided
  const defaultTools: ToolDefinition[] = useMemo(() => [
    { id: 'execute_sql', name: 'SQL実行', description: 'データベースクエリの実行', category: 'database' },
    { id: 'web_search', name: 'Web検索', description: 'インターネット検索', category: 'search' },
    { id: 'analyze_crud', name: 'CRUD分析', description: 'データ操作の分析', category: 'analysis' },
    { id: 'execute_api', name: 'API実行', description: '外部API呼び出し', category: 'integration' }
  ], []);

  const tools = availableTools || defaultTools;

  // Optimized handler functions with useCallback
  const handleToolToggle = useCallback((toolId: string) => {
    const newSelectedTools = settings.selectedTools.includes(toolId)
      ? settings.selectedTools.filter(id => id !== toolId)
      : [...settings.selectedTools, toolId];
    
    onSettingsChange({
      ...settings,
      selectedTools: newSelectedTools
    });
  }, [settings, onSettingsChange]);

  const handleTemperatureChange = useCallback((temperature: number) => {
    onSettingsChange({
      ...settings,
      temperature: Math.max(0, Math.min(2, temperature))
    });
  }, [settings, onSettingsChange]);

  const handleMaxTokensChange = useCallback((maxTokens: number) => {
    onSettingsChange({
      ...settings,
      maxTokens: Math.max(100, Math.min(4000, maxTokens))
    });
  }, [settings, onSettingsChange]);

  const handleMarkdownToggle = useCallback(() => {
    onSettingsChange({
      ...settings,
      enableMarkdown: !settings.enableMarkdown
    });
  }, [settings, onSettingsChange]);

  const handleMultimodalToggle = useCallback((key: keyof Pick<MCPChatSettings, 'enableCharts' | 'enableBrowserFrame' | 'enablePlaywright'>) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  }, [settings, onSettingsChange]);

  // Advanced settings handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartDefaultsChange = useCallback((key: keyof ChartDefaults, value: any) => {
    onSettingsChange({
      ...settings,
      chartDefaults: {
        ...settings.chartDefaults,
        [key]: value
      }
    });
  }, [settings, onSettingsChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBrowserDefaultsChange = useCallback((key: keyof BrowserDefaults, value: any) => {
    onSettingsChange({
      ...settings,
      browserDefaults: {
        ...settings.browserDefaults,
        [key]: value
      }
    });
  }, [settings, onSettingsChange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePlaywrightDefaultsChange = useCallback((key: keyof PlaywrightDefaults, value: any) => {
    onSettingsChange({
      ...settings,
      playwrightDefaults: {
        ...settings.playwrightDefaults,
        [key]: value
      }
    });
  }, [settings, onSettingsChange]);

  // Export/Import handlers
  const handleExportSettings = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `socket-chat-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      log.error('Failed to export settings', { error });
      alert('設定のエクスポートに失敗しました');
    }
  }, [settings]);

  const handleImportSettings = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        
        // Validate imported settings structure
        if (typeof importedSettings !== 'object' || !importedSettings) {
          throw new Error('Invalid settings format');
        }

        // Merge with current settings to preserve any missing fields
        onSettingsChange({ ...settings, ...importedSettings });
        alert('設定が正常にインポートされました');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        setImportError(`設定ファイルの読み込みに失敗しました: ${errorMessage}`);
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  }, [settings, onSettingsChange]);

  // Memoized calculations
  const enabledFeaturesCount = useMemo(() => {
    return [
      settings.enableCharts,
      settings.enableBrowserFrame,
      settings.enablePlaywright
    ].filter(Boolean).length;
  }, [settings.enableCharts, settings.enableBrowserFrame, settings.enablePlaywright]);

  const enabledFeaturesList = useMemo(() => {
    const features = [];
    if (settings.enableCharts) features.push('チャート');
    if (settings.enableBrowserFrame) features.push('ブラウザー');
    if (settings.enablePlaywright) features.push('Playwright');
    return features.join(', ') || 'なし';
  }, [settings.enableCharts, settings.enableBrowserFrame, settings.enablePlaywright]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <FiSettings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">チャット設定</h3>
          {isSaving && (
            <div className="flex items-center space-x-2 text-blue-600">
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">保存中...</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {onResetToDefaults && (
            <button
              onClick={onResetToDefaults}
              className="p-2 hover:bg-gray-200 rounded-md transition-colors"
              title="デフォルト設定にリセット"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-md transition-colors"
            title="設定パネルを閉じる"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Available Tools */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">利用可能なツール</h4>
          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="font-medium text-gray-900">{tool.name}</div>
                    {tool.category && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {tool.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{tool.description}</div>
                </div>
                <button
                  onClick={() => handleToolToggle(tool.id)}
                  className="ml-3 transition-colors"
                  title={settings.selectedTools.includes(tool.id) ? 'ツールを無効にする' : 'ツールを有効にする'}
                >
                  {settings.selectedTools.includes(tool.id) ? (
                    <FiToggleRight className="w-6 h-6 text-blue-600" />
                  ) : (
                    <FiToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <FiInfo className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                選択されたツール: {settings.selectedTools.length}個 / {tools.length}個
              </span>
            </div>
          </div>
        </div>

        {/* AI Response Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">AI応答設定</h4>
          
          {/* Temperature */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              温度設定 (Temperature): {settings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>保守的 (0.0)</span>
              <span>バランス (1.0)</span>
              <span>創造的 (2.0)</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              低い値ほど一貫した応答、高い値ほど創造的な応答
            </div>
          </div>

          {/* Max Tokens */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最大トークン数: {settings.maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>短い (100)</span>
              <span>中程度 (2000)</span>
              <span>長い (4000)</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              応答の最大長度を制御します
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">表示設定</h4>
          
          {/* Markdown Toggle */}
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-3">
            <div>
              <div className="font-medium text-gray-900">Markdown表示</div>
              <div className="text-sm text-gray-600">
                AI応答をMarkdown形式で表示します
              </div>
            </div>
            <button onClick={handleMarkdownToggle}>
              {settings.enableMarkdown ? (
                <FiToggleRight className="w-6 h-6 text-blue-600" />
              ) : (
                <FiToggleLeft className="w-6 h-6 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Multimodal Features */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">マルチモーダル機能</h4>
          <div className="space-y-3">
            {/* Chart Display */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">チャート表示</div>
                <div className="text-sm text-gray-600">
                  データを様々なグラフ形式で可視化します
                </div>
              </div>
              <button onClick={() => handleMultimodalToggle('enableCharts')}>
                {settings.enableCharts ? (
                  <FiToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <FiToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            {/* Browser Frame */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">ブラウザーエミュレーション</div>
                <div className="text-sm text-gray-600">
                  安全なサンドボックス環境でWebページを表示します
                </div>
              </div>
              <button onClick={() => handleMultimodalToggle('enableBrowserFrame')}>
                {settings.enableBrowserFrame ? (
                  <FiToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <FiToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            {/* Playwright */}
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Playwright自動化</div>
                <div className="text-sm text-gray-600">
                  ブラウザー自動化スクリプトの実行結果を表示します
                </div>
              </div>
              <button onClick={() => handleMultimodalToggle('enablePlaywright')}>
                {settings.enablePlaywright ? (
                  <FiToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <FiToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <FiInfo className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                有効な機能: {enabledFeaturesCount}個 - {enabledFeaturesList}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Multimodal Settings */}
        {(settings.enableCharts || settings.enableBrowserFrame || settings.enablePlaywright) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">詳細設定</h4>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showAdvancedSettings ? '非表示' : '表示'}
              </button>
            </div>
            
            {showAdvancedSettings && (
              <div className="space-y-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                {/* Chart Defaults */}
                {settings.enableCharts && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">チャート設定</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">デフォルト幅</label>
                        <input
                          type="number"
                          value={settings.chartDefaults.width}
                          onChange={(e) => handleChartDefaultsChange('width', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="200"
                          max="1600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">デフォルト高さ</label>
                        <input
                          type="number"
                          value={settings.chartDefaults.height}
                          onChange={(e) => handleChartDefaultsChange('height', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="200"
                          max="800"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm text-gray-700 mb-1">テーマ</label>
                        <select
                          value={settings.chartDefaults.theme}
                          onChange={(e) => handleChartDefaultsChange('theme', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="light">ライト</option>
                          <option value="dark">ダーク</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Browser Defaults */}
                {settings.enableBrowserFrame && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">ブラウザー設定</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">デフォルト幅</label>
                        <input
                          type="number"
                          value={settings.browserDefaults.width}
                          onChange={(e) => handleBrowserDefaultsChange('width', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="400"
                          max="1920"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">デフォルト高さ</label>
                        <input
                          type="number"
                          value={settings.browserDefaults.height}
                          onChange={(e) => handleBrowserDefaultsChange('height', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="300"
                          max="1080"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">ビューポート</label>
                        <select
                          value={settings.browserDefaults.viewport}
                          onChange={(e) => handleBrowserDefaultsChange('viewport', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="desktop">デスクトップ</option>
                          <option value="tablet">タブレット</option>
                          <option value="mobile">モバイル</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allowInteraction"
                          checked={settings.browserDefaults.allowInteraction}
                          onChange={(e) => handleBrowserDefaultsChange('allowInteraction', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="allowInteraction" className="text-sm text-gray-700">
                          インタラクション許可
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Playwright Defaults */}
                {settings.enablePlaywright && (
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Playwright設定</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">タイムアウト (ms)</label>
                        <input
                          type="number"
                          value={settings.playwrightDefaults.timeout}
                          onChange={(e) => handlePlaywrightDefaultsChange('timeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="5000"
                          max="120000"
                          step="1000"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="headless"
                          checked={settings.playwrightDefaults.headless}
                          onChange={(e) => handlePlaywrightDefaultsChange('headless', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor="headless" className="text-sm text-gray-700">
                          ヘッドレスモード
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resource Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">リソース設定</h4>
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="text-sm text-gray-600">
              現在、利用可能なリソースはありません。
            </div>
            <div className="text-xs text-gray-500 mt-1">
              将来のバージョンでファイルやドキュメントの参照が可能になります。
            </div>
          </div>
        </div>

        {/* Export/Import Settings */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">設定の管理</h4>
          
          {/* Import Error Display */}
          {importError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiInfo className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">{importError}</span>
              </div>
              <button
                onClick={() => setImportError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800"
              >
                閉じる
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleExportSettings}
              className="flex items-center justify-center space-x-2 px-4 py-3 text-sm bg-blue-600 text-white border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              disabled={isSaving}
            >
              <FiDownload className="w-4 h-4" />
              <span>設定をエクスポート</span>
            </button>
            
            <label className="block">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportSettings}
                disabled={isSaving}
              />
              <div className="flex items-center justify-center space-x-2 px-4 py-3 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
                <FiUpload className="w-4 h-4" />
                <span>設定をインポート</span>
              </div>
            </label>
            
            {onResetToDefaults && (
              <button
                onClick={onResetToDefaults}
                className="flex items-center justify-center space-x-2 px-4 py-3 text-sm bg-red-600 text-white border border-red-600 rounded-md hover:bg-red-700 transition-colors"
                disabled={isSaving}
              >
                <FiRefreshCw className="w-4 h-4" />
                <span>デフォルトにリセット</span>
              </button>
            )}
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            <p>• エクスポート: 現在の設定をJSONファイルとして保存</p>
            <p>• インポート: 保存した設定ファイルを読み込み</p>
            <p>• リセット: すべての設定を初期値に戻す</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <FiInfo className="w-3 h-3" />
            <span>{isSaving ? '設定を保存中...' : '設定は自動的に保存されます'}</span>
          </div>
          <div className="text-xs text-gray-400">
            v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};
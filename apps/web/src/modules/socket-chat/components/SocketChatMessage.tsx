/**
 * Socket Chat Message Component
 * Displays individual chat messages with markdown support and agent interaction indicators
 */

import React, { useMemo, useCallback } from 'react';

import { 
  FiUsers, 
  FiClock, 
  FiMessageSquare, 
  FiTool, 
  FiZap, 
  FiAlertCircle,
  FiBarChart,
  FiGlobe,
  FiPlay,
  FiGitBranch,
  FiFileText
} from 'react-icons/fi';

import { createContextLogger } from '@/modules/logger';

import { MarkdownPreview } from '../../../components/common/MarkdownPreview';
// import { AgentInteractionMessage } from './AgentInteractionMessage'; // Unused component
import { useMultimodal } from '../../../contexts/MultimodalContext';
import { MultiModalContentType } from '../../../types/multimodal';
// Speech functionality removed
import { MCPChatMessage, MessageType } from '../types/mcpChat';
import { 
  isChartMessage, 
  isBrowserMessage, 
  isPlaywrightMessage, 
  isFlowMessage,
  isMarkdownDocumentMessage
} from '../types/mcpChat';

import { BrowserFrame } from './multimodal/BrowserFrame';
import { ChartRenderer } from './multimodal/ChartRenderer';
import { FlowRenderer } from './multimodal/FlowRenderer';
import { MarkdownDocumentRenderer } from './multimodal/MarkdownDocumentRenderer';
import { PlaywrightResults } from './multimodal/PlaywrightResults';

const log = createContextLogger('SocketChatMessage');

interface SocketChatMessageProps {
  /** The chat message to display */
  message: MCPChatMessage;
  /** Whether to enable markdown rendering for assistant messages */
  enableMarkdown: boolean;
  /** Whether to show agent interaction information */
  showAgentInfo?: boolean;
  /** Whether to show multi-agent processing details - controlled from parent */
  showAgentDetails?: boolean;
  /** Whether to show JSON debug information */
  showJsonDetails?: boolean;
  /** Speech functionality removed */
  /** Callback when multimodal content is opened */
  onMultimodalOpen?: (type: MessageType, content: React.ReactNode) => void;
  /** Whether to show compact view for mobile */
  compact?: boolean;
}

export const SocketChatMessage: React.FC<SocketChatMessageProps> = ({
  message,
  enableMarkdown,
  showAgentInfo = true,
  showAgentDetails = true,
  showJsonDetails = false,
  onMultimodalOpen,
  compact = false
}) => {
  // Remove local showDetails state as it's now controlled by parent
  // const [showDetails, setShowDetails] = useState(true);
  
  // Memoized calculations to avoid unnecessary re-renders
  const messageAnalysis = useMemo(() => {
    const isUser = message.role === 'user';
    const hasAgentInteractions = message.agentInteractions && message.agentInteractions.length > 0;
    const hasFailure = !!message.failureReport;
    const hasPerformanceData = !!message.performanceMetrics;
    const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
    const hasDetailedInfo = hasAgentInteractions || hasToolCalls || hasPerformanceData;

    // Multimodal content checks using type guards
    const hasChartData = isChartMessage(message);
    const hasBrowserData = isBrowserMessage(message);
    const hasPlaywrightData = isPlaywrightMessage(message);
    const hasFlowData = isFlowMessage(message);
    const hasMarkdownDocumentData = isMarkdownDocumentMessage(message);
    
    // より確実なマルチモーダル判定 - 実際のデータ存在を確認
    const isMultimodal = hasChartData || hasBrowserData || hasPlaywrightData || hasFlowData || hasMarkdownDocumentData;

    return {
      isUser,
      hasAgentInteractions,
      hasFailure,
      hasPerformanceData,
      hasToolCalls,
      hasDetailedInfo,
      isMultimodal,
      hasChartData,
      hasBrowserData,
      hasPlaywrightData,
      hasFlowData,
      hasMarkdownDocumentData
    };
  }, [
    message.role,
    message.agentInteractions?.length,
    message.failureReport,
    message.performanceMetrics,
    message.toolCalls?.length,
    message.messageType,
    message.chartData,
    message.browserFrameData,
    message.playwrightResult,
    message.flowData,
    message.markdownDocumentData
  ]);

  // Speech functionality removed

  const { openMultimodal, closeMultimodal, isOpen: isMultimodalOpen, contentType } = useMultimodal();

  // Speech status tracking removed

  // Memoized utility functions
  const formatTimestamp = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const getFailureSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  // Speech handlers removed

  /**
   * Check if this message's multimodal content is currently being displayed
   */
  const isThisMessageDisplaying = useCallback(() => {
    if (!isMultimodalOpen || !contentType) return false;
    
    // Check if the currently displayed content type matches this message's type
    switch (contentType) {
      case 'chart':
        return messageAnalysis.hasChartData;
      case 'browser':
        return messageAnalysis.hasBrowserData;
      case 'playwright':
        return messageAnalysis.hasPlaywrightData;
      case 'flow':
        return messageAnalysis.hasFlowData;
      case 'markdown_document':
        return messageAnalysis.hasMarkdownDocumentData;
      default:
        return false;
    }
  }, [isMultimodalOpen, contentType, messageAnalysis]);

  /**
   * Handle opening or closing multimodal content in the side panel
   */
  const handleToggleMultimodal = useCallback((type: MessageType) => {
    // If this message's content is currently being displayed, close it
    if (isThisMessageDisplaying()) {
      closeMultimodal();
      log.debug(`[Multimodal] Closing panel from message`, {
        timestamp: new Date().toISOString(),
        messageId: message.id,
        contentType: type
      });
      return;
    }

    // Otherwise, open the multimodal content
    handleOpenMultimodal(type);
  }, [isThisMessageDisplaying, closeMultimodal, message.id]);

  /**
   * Handle opening multimodal content in the side panel
   */
  const handleOpenMultimodal = useCallback((type: MessageType) => {
    // Skip if it's text type
    if (type === 'text') return;
    
    // Log multimodal trigger from message with detailed data
    log.debug(`[Multimodal] Triggered from message`, {
      timestamp: new Date().toISOString(),
      messageId: message.id,
      messageType: type,
      messageTimestamp: message.timestamp,
      hasChartData: messageAnalysis.hasChartData,
      hasBrowserData: messageAnalysis.hasBrowserData,
      hasPlaywrightData: messageAnalysis.hasPlaywrightData,
      hasFlowData: messageAnalysis.hasFlowData,
      hasMarkdownDocumentData: messageAnalysis.hasMarkdownDocumentData,
      // Detailed data inspection
      actualMessageType: message.messageType,
      chartData: message.chartData,
      browserFrameData: message.browserFrameData,
      playwrightResult: message.playwrightResult,
      flowData: message.flowData,
      markdownDocumentData: message.markdownDocumentData
    });
    
    let content: React.ReactNode;
    const multimodalType = type as MultiModalContentType;
    
    switch (type) {
      case 'chart':
        log.debug(`[Multimodal] Creating chart content`, {
          hasChartData: messageAnalysis.hasChartData,
          chartData: message.chartData,
          chartDataType: typeof message.chartData
        });
        if (messageAnalysis.hasChartData && message.chartData) {
          content = <ChartRenderer chartData={message.chartData} />;
          log.debug(`[Multimodal] ChartRenderer created successfully`);
        } else {
          log.warn(`[Multimodal] Chart data missing or invalid`, {
            hasChartData: messageAnalysis.hasChartData,
            chartData: message.chartData
          });
        }
        break;
      case 'browser':
        if (messageAnalysis.hasBrowserData && message.browserFrameData) {
          content = <BrowserFrame frameData={message.browserFrameData} />;
        }
        break;
      case 'playwright':
        if (messageAnalysis.hasPlaywrightData && message.playwrightResult) {
          content = <PlaywrightResults result={message.playwrightResult} />;
        }
        break;
      case 'flow':
        if (messageAnalysis.hasFlowData && message.flowData) {
          content = <FlowRenderer flowData={message.flowData} />;
        }
        break;
      case 'markdown_document':
        if (messageAnalysis.hasMarkdownDocumentData && message.markdownDocumentData) {
          content = <MarkdownDocumentRenderer documentData={message.markdownDocumentData} />;
        }
        break;
    }
    
    if (content) {
      // Call external callback first if provided
      onMultimodalOpen?.(type, content);
      // Then open in internal modal
      openMultimodal(content, multimodalType);
      
      // Log successful multimodal content creation
      log.debug(`[Multimodal] Content created and modal opened`, {
        timestamp: new Date().toISOString(),
        messageId: message.id,
        multimodalType,
        contentGenerated: true,
        contentType: typeof content
      });
    } else {
      // Log when content couldn't be created
      log.warn(`[Multimodal] Failed to create content for type: ${type}`, {
        timestamp: new Date().toISOString(),
        messageId: message.id,
        multimodalType,
        reason: 'No content generated',
        messageAnalysis: {
          hasChartData: messageAnalysis.hasChartData,
          hasBrowserData: messageAnalysis.hasBrowserData,
          hasPlaywrightData: messageAnalysis.hasPlaywrightData,
          hasFlowData: messageAnalysis.hasFlowData
        }
      });
    }
  }, [messageAnalysis, message, onMultimodalOpen, openMultimodal]);

  /**
   * Render multimodal content preview with open button
   */
  const renderMultimodalPreview = useCallback(() => {
    log.debug('🔍 [DEBUG] renderMultimodalPreview called', {
      isMultimodal: messageAnalysis.isMultimodal,
      hasChartData: messageAnalysis.hasChartData,
      hasBrowserData: messageAnalysis.hasBrowserData,
      hasPlaywrightData: messageAnalysis.hasPlaywrightData,
      hasFlowData: messageAnalysis.hasFlowData,
      hasMarkdownDocumentData: messageAnalysis.hasMarkdownDocumentData,
      messageId: message.id,
      // 🔍 実際のメッセージ構造をチェック
      messageType: message.messageType,
      hasFlowDataField: !!message.flowData,
      flowDataContent: message.flowData,
      messageContent: message.content?.substring(0, 100)
    });
    
    // 💥 フローダイアグラムが実際に表示されているなら、メッセージにflowDataがあるはず
    // 型ガードに頼らず、直接flowDataの存在をチェック
    const hasActualFlowData = !!message.flowData && typeof message.flowData === 'object';
    const hasActualChartData = !!message.chartData && typeof message.chartData === 'object';
    const hasActualBrowserData = !!message.browserFrameData && typeof message.browserFrameData === 'object';
    const hasActualPlaywrightData = !!message.playwrightResult && typeof message.playwrightResult === 'object';
    const hasActualMarkdownData = !!message.markdownDocumentData && typeof message.markdownDocumentData === 'object';
    
    // 実際のデータ存在に基づく判定
    const forceIsMultimodal = hasActualFlowData || hasActualChartData || hasActualBrowserData || hasActualPlaywrightData || hasActualMarkdownData;
    
    log.debug('💥 [FORCE] Direct data check:', {
      hasActualFlowData,
      hasActualChartData,
      hasActualBrowserData,
      hasActualPlaywrightData,
      hasActualMarkdownData,
      forceIsMultimodal,
      originalIsMultimodal: messageAnalysis.isMultimodal
    });
    
    if (!forceIsMultimodal) {
      log.debug('🚨 [DEBUG] No actual multimodal data found, returning null');
      return null;
    }

    // チャートデータが存在する場合
    if (hasActualChartData) {
        return (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FiBarChart className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-800">グラフデータ</span>
              </div>
              <button
                onClick={() => handleToggleMultimodal('chart')}
                className={`px-3 py-1 rounded-md transition-colors text-sm ${
                  isThisMessageDisplaying() && contentType === 'chart'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isThisMessageDisplaying() && contentType === 'chart' ? 'グラフを非表示' : 'グラフを表示'}
              </button>
            </div>
            <p className="text-sm text-gray-600">{message.chartData?.title || 'チャートデータが生成されました'}</p>
            {/* Small preview */}
            <div className="mt-2 h-32 flex items-center justify-center bg-white rounded border">
              {message.chartData && (
                <ChartRenderer chartData={message.chartData} preview={true} />
              )}
            </div>
          </div>
        );
    }
    
    // ブラウザーデータが存在する場合
    if (hasActualBrowserData) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FiGlobe className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-800">ブラウザー表示</span>
            </div>
            <button
              onClick={() => handleToggleMultimodal('browser')}
              className={`px-3 py-1 rounded-md transition-colors text-sm ${
                isThisMessageDisplaying() && contentType === 'browser'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isThisMessageDisplaying() && contentType === 'browser' ? 'ブラウザーを閉じる' : 'ブラウザーを開く'}
            </button>
          </div>
          <p className="text-sm text-gray-600">{message.browserFrameData?.url}</p>
          {/* URL preview */}
          <div className="mt-2 p-2 bg-white rounded border text-xs font-mono text-gray-500">
            {message.browserFrameData?.url}
          </div>
        </div>
      );
    }
    
    // Playwrightデータが存在する場合  
    if (hasActualPlaywrightData) {
        return (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FiPlay className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-800">Playwright実行結果</span>
              </div>
              <button
                onClick={() => handleToggleMultimodal('playwright')}
                className={`px-3 py-1 rounded-md transition-colors text-sm ${
                  isThisMessageDisplaying() && contentType === 'playwright'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isThisMessageDisplaying() && contentType === 'playwright' ? '結果を閉じる' : '結果を詳しく見る'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {message.playwrightResult?.status === 'completed' ? '実行完了' : '実行中'}
              {message.playwrightResult?.steps && ` (${message.playwrightResult.steps.length}ステップ)`}
            </p>
            {/* Status indicator */}
            <div className="mt-2 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                message.playwrightResult?.status === 'completed' ? 'bg-green-500' : 
                message.playwrightResult?.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-xs text-gray-500">{message.playwrightResult?.status}</span>
            </div>
          </div>
        );
    }
    
    // フローデータが存在する場合 - 💥 最も重要なケース
    if (hasActualFlowData) {
      log.debug('✅ [FORCE] Rendering Flow preview button with ACTUAL data', { 
        flowData: message.flowData,
        flowDataKeys: Object.keys(message.flowData || {}),
        flowTitle: message.flowData?.title
      });
      return (
        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-300 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FiGitBranch className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-800">🎯 フローダイアグラム</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">ACTIVE</span>
            </div>
            <button
              onClick={() => handleToggleMultimodal('flow')}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                isThisMessageDisplaying() && contentType === 'flow'
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
              }`}
            >
              {isThisMessageDisplaying() && contentType === 'flow' ? '🔒 フローを非表示' : '🚀 フローを表示'}
            </button>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            {message.flowData?.title || 'フローダイアグラムが生成されました'}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            ノード数: {message.flowData?.nodes?.length || 0} | エッジ数: {message.flowData?.edges?.length || 0}
          </p>
        </div>
      );
    }
    
    // Markdownドキュメントデータが存在する場合
    if (hasActualMarkdownData) {
        return (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FiFileText className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-gray-800">ドキュメント</span>
              </div>
              <button
                onClick={() => handleToggleMultimodal('markdown_document')}
                className={`px-3 py-1 rounded-md transition-colors text-sm ${
                  isThisMessageDisplaying() && contentType === 'markdown_document'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {isThisMessageDisplaying() && contentType === 'markdown_document' ? 'ドキュメントを閉じる' : 'ドキュメントを表示'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{message.markdownDocumentData?.title || 'ドキュメントが生成されました'}</p>
                {message.markdownDocumentData?.description && (
                  <p className="text-xs text-gray-600 mt-1">{message.markdownDocumentData.description}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-500">
                {message.markdownDocumentData?.wordCount && (
                  <div>{message.markdownDocumentData.wordCount.toLocaleString()}文字</div>
                )}
                {message.markdownDocumentData?.type && (
                  <div className="mt-1">
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                      {message.markdownDocumentData.type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
    
    // どのマルチモーダルタイプにも該当しない場合
    log.debug('🚨 [DEBUG] No multimodal type matched, returning null');
    return null;
  }, [messageAnalysis, message, isThisMessageDisplaying, contentType, handleToggleMultimodal]);

  /**
   * JSONデータを抽出してメッセージコンテンツから除去する関数
   */
  const extractJsonAndCleanContent = useCallback(() => {
    const content = message.content;
    let cleanContent = content;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsonData: any = null;

    // JSON文字列パターンを検出（flowData、chartData等）
    const jsonPatterns = [
      /"flowData":\s*\{[\s\S]*?\}/,
      /"chartData":\s*\{[\s\S]*?\}/,
      /"browserFrameData":\s*\{[\s\S]*?\}/,
      /"playwrightResult":\s*\{[\s\S]*?\}/,
      /"markdownDocumentData":\s*\{[\s\S]*?\}/,
    ];

    // 大きなJSONオブジェクト全体を検出
    const fullJsonMatch = content.match(/^\s*\{[\s\S]*\}\s*$/);
    if (fullJsonMatch) {
      try {
        jsonData = JSON.parse(fullJsonMatch[0]);
        cleanContent = ''; // JSON全体の場合はコンテンツを空にする
      } catch {
        // JSONパースエラーの場合はそのまま
      }
    } else {
      // 部分的なJSONを検出して除去
      for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match) {
          cleanContent = cleanContent.replace(match[0], '').trim();
          if (!jsonData) {
            try {
              jsonData = JSON.parse(`{${match[0]}}`);
            } catch {
              // パースエラーは無視
            }
          }
        }
      }
    }

    return { cleanContent, jsonData };
  }, [message.content]);

  /**
   * JSONデバッグ情報の表示
   */
  const renderJsonDebugInfo = useCallback(() => {
    if (!showJsonDetails) return null;

    const { jsonData } = extractJsonAndCleanContent();
    const hasMultimodalData = message.flowData || message.chartData || message.browserFrameData || 
                              message.playwrightResult || message.markdownDocumentData;

    if (!jsonData && !hasMultimodalData) return null;

    return (
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-mono text-green-400">JSON Debug Info</span>
            <span className="text-xs text-gray-400">
              {jsonData ? 'from content' : 'from message object'}
            </span>
          </div>
          <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
            {jsonData 
              ? JSON.stringify(jsonData, null, 2)
              : JSON.stringify({
                  messageType: message.messageType,
                  flowData: message.flowData,
                  chartData: message.chartData,
                  browserFrameData: message.browserFrameData,
                  playwrightResult: message.playwrightResult,
                  markdownDocumentData: message.markdownDocumentData
                }, null, 2)
            }
          </pre>
        </div>
      </div>
    );
  }, [showJsonDetails, message, extractJsonAndCleanContent]);

  /**
   * エージェント表示名を取得する関数
   */
  const getAgentDisplayName = useCallback((executorMessage: string): string => {
    // デバッグログ
    log.debug('🐛 getAgentDisplayName called with:', executorMessage);
    
    // 角括弧でエージェント名を抽出
    const match = executorMessage.match(/\[([^\]]+)\]/);
    log.debug('🐛 regex match result:', match);
    
    if (match && match[1]) {
      log.debug('🐛 returning agent name from brackets:', match[1]);
      return match[1];
    }
    
    // フォールバック: メッセージ内容からエージェント名を判別
    if (executorMessage.includes('Web検索分析エージェント')) return 'Web検索分析エージェント';
    if (executorMessage.includes('SQLエンジニアエージェント')) return 'SQLエンジニアエージェント';
    if (executorMessage.includes('API実行エンジニアエージェント')) return 'API実行エンジニアエージェント';
    if (executorMessage.includes('ReactFlowデザイナーエージェント')) return 'ReactFlowデザイナーエージェント';
    if (executorMessage.includes('Rechartデザイナーエージェント')) return 'Rechartデザイナーエージェント';
    if (executorMessage.includes('ブラウザー操作エージェント')) return 'ブラウザー操作エージェント';
    if (executorMessage.includes('MarkdownWriterエージェント')) return 'MarkdownWriterエージェント';
    if (executorMessage.includes('Conductorエージェント')) return 'Conductorエージェント';
    
    // デフォルトは「実行エージェント」
    return '実行エージェント';
  }, []);

  return (
    <div className={`flex ${messageAnalysis.isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${compact ? 'max-w-sm' : 'max-w-3xl'} rounded-lg p-1 shadow-sm border transition-colors ${
          messageAnalysis.isUser
            ? 'bg-blue-500 text-white border-blue-600'
            : messageAnalysis.hasFailure
            ? 'bg-red-50 text-red-900 border-red-200'
            : 'bg-yellow-50 text-gray-900 border-yellow-200 hover:border-yellow-300'
        }`}
      >
        {/* Message Header - only show if there's relevant info */}
        {(showAgentInfo && messageAnalysis.hasDetailedInfo) || messageAnalysis.hasPerformanceData ? (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {showAgentInfo && messageAnalysis.hasDetailedInfo && (
                <div className="flex items-center space-x-1">
                  <FiUsers className="w-3 h-3" />
                  <span className="text-xs">Multi-Agent</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs opacity-75">
              {messageAnalysis.hasPerformanceData && message.performanceMetrics && (
                <div className="flex items-center space-x-1">
                  <FiZap className="w-3 h-3" />
                  <span>{Math.round(message.performanceMetrics.totalDuration / 1000)}s</span>
                </div>
              )}
              {/* Audio button functionality removed */}
              <FiClock className="w-3 h-3" />
              <span>{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-end mb-2">
            <div className="flex items-center space-x-2 text-xs opacity-75">
              {/* Audio button functionality removed */}
              <FiClock className="w-3 h-3" />
              <span>{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="mb-2">
          {enableMarkdown && !messageAnalysis.isUser ? (
            (() => {
              const { cleanContent } = extractJsonAndCleanContent();
              return cleanContent ? <MarkdownPreview content={cleanContent} /> : null;
            })()
          ) : (
            (() => {
              const { cleanContent } = extractJsonAndCleanContent();
              return cleanContent ? <div className="whitespace-pre-wrap">{cleanContent}</div> : null;
            })()
          )}
        </div>

        {/* Multimodal Content Preview */}
        {renderMultimodalPreview()}

        {/* Failure Report */}
        {messageAnalysis.hasFailure && message.failureReport && (
          <div className={`mt-3 p-3 rounded-md border ${getFailureSeverityColor(message.failureReport.severity)}`}>
            <div className="flex items-center space-x-2 mb-2">
              <FiAlertCircle className="w-4 h-4" />
              <span className="font-medium">処理失敗レポート</span>
              <span className="text-xs uppercase font-bold">
                {message.failureReport.severity}
              </span>
            </div>
            <p className="text-sm mb-2">{message.failureReport.reason}</p>
            <p className="text-xs opacity-80">{message.failureReport.details}</p>
            
            {message.failureReport.suggestions && message.failureReport.suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">改善提案:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {message.failureReport.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Individual message toggle button removed - now controlled by parent */}

        {/* Detailed Information Accordion - Unified Agent & Tool Display */}
        {!messageAnalysis.isUser && showAgentDetails && messageAnalysis.hasDetailedInfo && (
          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            {/* Combined Agent Interactions and Tool Usage Timeline */}
            {(messageAnalysis.hasAgentInteractions || messageAnalysis.hasToolCalls) && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-md p-3 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <FiMessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">マルチエージェント処理履歴</span>
                  <span className="text-xs text-gray-500">
                    ({(message.agentInteractions?.length || 0) + (message.toolCalls?.length || 0)}件)
                  </span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {/* Combine and sort interactions and tool calls by timestamp */}
                  {(() => {
                    const allItems: Array<{
                      type: 'interaction' | 'tool';
                      timestamp: string;
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      data: any;
                    }> = [];

                    // Add agent interactions
                    message.agentInteractions?.forEach(interaction => {
                      allItems.push({
                        type: 'interaction',
                        timestamp: interaction.timestamp,
                        data: interaction
                      });
                    });

                    // Add tool calls with their timestamps
                    message.toolCalls?.forEach((toolCall, _index) => {
                      // Use real timestamp if available, otherwise fallback to message timestamp
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const toolTimestamp = (toolCall as any).timestamp || message.timestamp || new Date().toISOString();
                      allItems.push({
                        type: 'tool',
                        timestamp: toolTimestamp,
                        data: toolCall
                      });
                    });

                    // Sort by timestamp
                    allItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                    return allItems.map((item, index) => {
                      if (item.type === 'interaction') {
                        const interaction = item.data;
                        return (
                          <div key={`interaction-${index}`} className="bg-white rounded p-2 border border-blue-200">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <FiMessageSquare className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-700">
                                  {interaction.interactionType === 'proposal' ? 'エージェント提案' : 
                                   interaction.interactionType === 'approved' ? '処理完了' : 
                                   interaction.interactionType}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(interaction.timestamp).toLocaleTimeString('ja-JP')}
                              </span>
                            </div>
                            <div className="text-xs text-gray-700 space-y-1">
                              <div>
                                <span className="font-medium text-blue-700">Conductor:</span> {interaction.conductorMessage}
                              </div>
                              <div>
                                <span className="font-medium text-green-700">
                                  {getAgentDisplayName(interaction.executorMessage)}:
                                </span> {interaction.executorMessage}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const toolCall = item.data;
                        return (
                          <div key={`tool-${toolCall.id || index}`} className="bg-white rounded p-2 border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FiTool className="w-3 h-3 text-green-600" />
                                <span className="text-sm font-medium text-green-700">{toolCall.toolName}</span>
                                <span className="text-xs text-gray-500">MCPツール</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(item.timestamp).toLocaleTimeString('ja-JP')}
                              </span>
                            </div>
                            
                            {/* Tool Arguments (Query) */}
                            {toolCall.arguments && Object.keys(toolCall.arguments).length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-gray-600 mb-1">🔍 クエリ:</div>
                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
                                  {Object.entries(toolCall.arguments).map(([key, value]) => (
                                    <div key={key} className="mb-1">
                                      <span className="font-medium text-blue-600">{key}:</span>{' '}
                                      <span className="font-mono">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Tool Results */}
                            {toolCall.result !== undefined && (
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">📊 結果:</div>
                                <div className="text-xs text-gray-700 bg-green-50 p-2 rounded border max-h-32 overflow-y-auto">
                                  <div className="whitespace-pre-wrap">
                                    {(() => {
                                      const resultStr = typeof toolCall.result === 'string'
                                        ? toolCall.result
                                        : JSON.stringify(toolCall.result, null, 2);
                                      return resultStr.substring(0, 300) + (resultStr.length > 300 ? '...' : '');
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {messageAnalysis.hasPerformanceData && message.performanceMetrics && (
              <div className="bg-yellow-50 rounded-md p-3 border border-yellow-200">
                <div className="flex items-center space-x-2 mb-2">
                  <FiZap className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">パフォーマンス</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-600">総実行時間:</span>
                    <span className="ml-1 font-mono">{Math.round(message.performanceMetrics.totalDuration / 1000)}s</span>
                  </div>
                  {message.performanceMetrics.averageExchangeDuration && (
                    <div>
                      <span className="text-gray-600">平均交換時間:</span>
                      <span className="ml-1 font-mono">
                        {Math.round(message.performanceMetrics.averageExchangeDuration / 1000)}s
                      </span>
                    </div>
                  )}
                  {message.totalExchanges && (
                    <div>
                      <span className="text-gray-600">総交換回数:</span>
                      <span className="ml-1 font-mono">{message.totalExchanges}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* JSON Debug Information */}
        {renderJsonDebugInfo()}

      </div>
    </div>
  );
};
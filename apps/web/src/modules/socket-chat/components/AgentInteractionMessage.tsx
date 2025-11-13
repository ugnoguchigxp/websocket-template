/**
 * Agent Interaction Message Component
 * Displays conductor and executor interactions as individual chat messages
 */

import React from 'react';

import { FiUser, FiCpu, FiActivity, FiArrowDown } from 'react-icons/fi';

interface AgentInteractionMessageProps {
  interaction: {
    id: string;
    sessionId: string;
    conductorMessage: string;
    executorMessage: string;
    interactionType: 'proposal' | 'evaluation' | 'feedback' | 'approved' | 'rejected';
    messageCategory: 'conductor_thinking' | 'agent_exchange';
    timestamp: string;
  };
  agentInfo?: string;
  className?: string;
}

export const AgentInteractionMessage: React.FC<AgentInteractionMessageProps> = ({
  interaction,
  agentInfo,
  className = ''
}) => {
  /**
   * エージェント表示名を取得する関数
   */
  const getAgentDisplayName = (executorMessage: string): string => {
    // 角括弧でエージェント名を抽出
    const match = executorMessage.match(/\[([^\]]+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    
    // フォールバック: メッセージ内容からエージェント名を判別
    if (executorMessage.includes('Web検索分析エージェント')) return 'Web検索分析エージェント';
    if (executorMessage.includes('SQLエンジニアエージェント')) return 'SQLエンジニアエージェント';
    if (executorMessage.includes('API実行エンジニアエージェント')) return 'API実行エンジニアエージェント';
    if (executorMessage.includes('ReactFlowデザイナーエージェント')) return 'ReactFlowデザイナーエージェント';
    if (executorMessage.includes('Rechartデザイナーエージェント')) return 'Rechartデザイナーエージェント';
    if (executorMessage.includes('ブラウザー操作エージェント')) return 'ブラウザー操作エージェント';
    if (executorMessage.includes('Conductorエージェント')) return 'Conductorエージェント';
    
    // デフォルトは「実行エージェント」
    return '実行エージェント';
  };
  const getInteractionTypeInfo = (type: string) => {
    switch (type) {
      case 'proposal':
        return { label: '提案', color: 'bg-blue-50 border-blue-200', icon: 'text-blue-500' };
      case 'evaluation':
        return { label: '評価', color: 'bg-purple-50 border-purple-200', icon: 'text-purple-500' };
      case 'feedback':
        return { label: 'フィードバック', color: 'bg-orange-50 border-orange-200', icon: 'text-orange-500' };
      case 'approved':
        return { label: '承認', color: 'bg-green-50 border-green-200', icon: 'text-green-500' };
      case 'rejected':
        return { label: '却下', color: 'bg-red-50 border-red-200', icon: 'text-red-500' };
      default:
        return { label: type, color: 'bg-gray-50 border-gray-200', icon: 'text-gray-500' };
    }
  };

  /**
   * 指揮者（conductor）の表示名を取得する関数
   */
  const getConductorDisplayName = (): string => {
    if (agentInfo === 'web_search_analyst') {
      return 'Web検索分析エージェント';
    }
    return '指揮者 (Conductor)';
  };

  const typeInfo = getInteractionTypeInfo(interaction.interactionType);
  const formattedTime = new Date(interaction.timestamp).toLocaleTimeString();

  return (
    <div className={`mb-4 ${className}`}>
      {/* Interaction header */}
      <div className={`border rounded-lg p-3 ${typeInfo.color}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FiActivity className={`w-4 h-4 ${typeInfo.icon}`} />
            <span className="text-sm font-medium text-gray-700">
              {
                interaction.messageCategory === 'conductor_thinking' 
                  ? `指揮者思考: ${typeInfo.label}`
                  : `エージェント間交換: ${typeInfo.label}`
              }
            </span>
          </div>
          <span className="text-xs text-gray-500">{formattedTime}</span>
        </div>

        {/* Conductor and Executor conversation */}
        <div className="space-y-3">
          {/* Conductor message */}
          {interaction.conductorMessage && (
            <div className="bg-white/70 border border-purple-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <FiUser className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">{getConductorDisplayName()}</span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {interaction.conductorMessage}
              </div>
            </div>
          )}

          {/* Arrow between messages (Conductor → Executor: top to bottom) */}
          {interaction.conductorMessage && interaction.executorMessage && (
            <div className="flex justify-center">
              <FiArrowDown className="w-4 h-4 text-gray-400" />
            </div>
          )}

          {/* Executor message */}
          {interaction.executorMessage && (
            <div className="bg-white/70 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <FiCpu className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{getAgentDisplayName(interaction.executorMessage)}</span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {interaction.executorMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
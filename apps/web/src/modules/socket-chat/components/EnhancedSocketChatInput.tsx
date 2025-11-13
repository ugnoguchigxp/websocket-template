/**
 * Enhanced Socket Chat Input Component with Text Correction
 * Integrates voice recognition error correction for business/technical contexts
 */

import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';

import { FiSend, FiLoader, FiEdit3, FiCheckCircle, FiXCircle } from 'react-icons/fi';

import { createContextLogger } from '@/modules/logger';

import { useConversation } from '../../../contexts/ConversationProvider';
import { useTextCorrection, ThemeType } from '../../text-enhancement';
import type { MCPChatMessage } from '../types/mcpChat';

import { SpeechControls } from './SpeechControls';

const log = createContextLogger('EnhancedSocketChatInput');

interface EnhancedSocketChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  messages?: MCPChatMessage[];
  /** Theme for text correction (default: 'business') */
  correctionTheme?: ThemeType;
  /** Enable auto-correction for speech input */
  enableAutoCorrection?: boolean;
}

export const EnhancedSocketChatInput: React.FC<EnhancedSocketChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "メッセージを入力してください...",
  messages = [],
  correctionTheme = 'business',
  enableAutoCorrection = true
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [originalSpeechText, setOriginalSpeechText] = useState('');
  const [showCorrectionSuggestion, setShowCorrectionSuggestion] = useState(false);
  const [correctionSuggestion, setCorrectionSuggestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  
  const { 
    isConversationMode, 
    isListening, 
    speak,
    stopListening,
    recognizedText,
    partialText,
    clearRecognizedText
  } = useConversation();

  // Text correction hook
  const {
    correctText,
    analyzeTheme,
    isProcessing: isCorrecting,
    error: correctionError,
    lastResult,
    theme,
    setTheme
  } = useTextCorrection(correctionTheme, {
    useCache: true,
    debounceMs: 300,
    autoThemeDetection: true,
    minConfidenceThreshold: 0.6
  });

  /**
   * Auto-detect theme based on recent messages
   */
  const detectContextualTheme = useCallback(async () => {
    if (messages.length === 0) return;

    // Analyze recent messages to determine context
    const recentMessages = messages
      .slice(-5)
      .filter(msg => msg.content && msg.content.length > 20)
      .map(msg => msg.content)
      .join(' ');

    if (recentMessages.length > 50) {
      try {
        const analysis = await analyzeTheme(recentMessages);
        if (analysis.confidence > 0.7 && analysis.recommendedTheme !== theme) {
          setTheme(analysis.recommendedTheme);
          log.info('Auto-detected theme change', {
            from: theme,
            to: analysis.recommendedTheme,
            confidence: analysis.confidence
          });
        }
      } catch (error) {
        log.warn('Theme detection failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
  }, [messages, analyzeTheme, theme, setTheme]);

  // Auto-detect theme when messages change
  useEffect(() => {
    detectContextualTheme();
  }, [detectContextualTheme]);

  /**
   * Auto-correct speech text
   */
  const autoCorrectSpeechText = useCallback(async (text: string): Promise<string> => {
    if (!enableAutoCorrection || !text.trim() || text.length < 10) {
      return text;
    }

    try {
      log.debug('Auto-correcting speech text', {
        originalLength: text.length,
        theme
      });

      const result = await correctText(text, theme);
      
      if (result.hasCorrections && result.confidence > 0.6) {
        setCorrectionSuggestion(result.correctedText);
        setShowCorrectionSuggestion(true);
        
        log.info('Speech correction suggestion available', {
          theme,
          confidence: result.confidence,
          hasCorrections: result.hasCorrections
        });

        // Auto-apply high-confidence corrections
        if (result.confidence > 0.8) {
          log.info('Auto-applying high-confidence correction', {
            confidence: result.confidence
          });
          return result.correctedText;
        }
      }

      return result.correctedText;
    } catch (error) {
      log.error('Auto-correction failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return text;
    }
  }, [enableAutoCorrection, theme, correctText]);

  /**
   * Manual text correction
   */
  const handleManualCorrection = useCallback(async () => {
    if (!message.trim()) return;

    try {
      const result = await correctText(message, theme);
      
      if (result.hasCorrections) {
        setMessage(result.correctedText);
        log.info('Manual correction applied', {
          theme,
          confidence: result.confidence
        });
      }
    } catch (error) {
      log.error('Manual correction failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [message, theme, correctText]);

  /**
   * Accept correction suggestion
   */
  const acceptCorrection = useCallback(() => {
    if (correctionSuggestion) {
      setMessage(correctionSuggestion);
      setShowCorrectionSuggestion(false);
      setCorrectionSuggestion('');
      log.info('Correction suggestion accepted');
    }
  }, [correctionSuggestion]);

  /**
   * Reject correction suggestion
   */
  const rejectCorrection = useCallback(() => {
    if (originalSpeechText) {
      setMessage(originalSpeechText);
    }
    setShowCorrectionSuggestion(false);
    setCorrectionSuggestion('');
    log.info('Correction suggestion rejected');
  }, [originalSpeechText]);

  // Get the latest assistant message for speech
  const getLastAssistantMessage = (): string => {
    const assistantMessages = messages.filter(msg => 
      msg.role === 'assistant' && !msg.isInteractionMessage
    );
    const lastMessage = assistantMessages[assistantMessages.length - 1];
    return lastMessage ? (lastMessage.content || '') : '';
  };

  // Conversation mode initialization
  useEffect(() => {
    if (isConversationMode) {
      const assistantMessageCount = messages.filter(msg => 
        msg.role === 'assistant' && !msg.isInteractionMessage
      ).length;
      lastMessageCountRef.current = assistantMessageCount;
    } else {
      lastMessageCountRef.current = 0;
    }
  }, [isConversationMode, messages]);

  // Auto-speak new AI responses in conversation mode
  useEffect(() => {
    if (isConversationMode) {
      const assistantMessages = messages.filter(msg => 
        msg.role === 'assistant' && !msg.isInteractionMessage
      );
      const currentMessageCount = assistantMessages.length;
      
      if (currentMessageCount > lastMessageCountRef.current) {
        const latestMessage = assistantMessages[assistantMessages.length - 1];
        if (latestMessage && latestMessage.content) {
          speak(latestMessage.content).catch(() => {
            // Speech failed - handled silently
          });
        }
        
        lastMessageCountRef.current = currentMessageCount;
      }
    }
  }, [messages, isConversationMode, speak]);

  const handleSend = async (textToSend?: string) => {
    const messageToSend = textToSend || message.trim();
    
    if (!messageToSend || disabled || isSending || messageToSend.length > 4000) return;

    // Stop speech recognition before sending message
    if (isListening) {
      stopListening();
    }

    setMessage('');
    setOriginalSpeechText('');
    setShowCorrectionSuggestion(false);
    setCorrectionSuggestion('');
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
    } catch {
      setMessage(messageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    
    // Ctrl+R or Cmd+R for manual correction
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      if (message.trim() && !isCorrecting) {
        handleManualCorrection();
      }
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 80), 200);
    textarea.style.height = `${newHeight}px`;
  };

  // Enhanced speech recognition handling with auto-correction
  useEffect(() => {
    if (recognizedText) {
      setOriginalSpeechText(recognizedText);
      
      // Auto-correct speech text
      autoCorrectSpeechText(recognizedText).then(correctedText => {
        if (!isConversationMode) {
          setMessage(prev => {
            const newText = prev + (prev ? ' ' : '') + correctedText;
            return newText;
          });
        } else {
          setMessage(correctedText);
        }
      });
      
      clearRecognizedText();
    }
  }, [recognizedText, isConversationMode, clearRecognizedText, autoCorrectSpeechText]);

  // Display partial text in real-time
  useEffect(() => {
    if (partialText && isConversationMode) {
      setMessage(partialText);
    }
  }, [partialText, isConversationMode]);

  // Legacy handlers for backward compatibility
  const handleSpeechRecognized = (_text: string) => {
    // Handled by useEffect above
  };

  const handleContinuousTextUpdate = (_text: string) => {
    // Handled by useEffect above
  };

  return (
    <div className="p-4">
      {/* Correction Suggestion Banner */}
      {showCorrectionSuggestion && correctionSuggestion !== message && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <FiEdit3 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                音声認識エラーを修正しました
              </h4>
              <p className="text-xs text-blue-700 mb-2">
                {theme === 'business' ? 'ビジネス' : theme === 'technical' ? '技術' : '医療'}用語の修正提案があります。
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={acceptCorrection}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200"
                >
                  <FiCheckCircle className="w-3 h-3" />
                  <span>修正を適用</span>
                </button>
                <button
                  onClick={rejectCorrection}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded hover:bg-gray-200"
                >
                  <FiXCircle className="w-3 h-3" />
                  <span>元に戻す</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speech Controls */}
      <div className="mb-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {/* Theme indicator */}
          <div className="text-xs text-gray-500">
            補正テーマ: <span className="font-medium capitalize">{theme}</span>
          </div>
          {lastResult && (
            <div className="text-xs text-gray-500">
              信頼度: {Math.round(lastResult.confidence * 100)}%
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Manual correction button */}
          <button
            onClick={handleManualCorrection}
            disabled={!message.trim() || isCorrecting || disabled}
            className="flex items-center space-x-1 px-2 py-1 text-xs border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="手動で文字修正 (Ctrl+R)"
          >
            {isCorrecting ? (
              <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiEdit3 className="w-3 h-3" />
            )}
            <span>修正</span>
          </button>

          <SpeechControls
            onSpeechRecognized={handleSpeechRecognized}
            onContinuousTextUpdate={handleContinuousTextUpdate}
            disabled={disabled || isSending}
            lastAssistantMessage={getLastAssistantMessage()}
            onSendViaHandleSend={handleSend}
            setMessage={setMessage}
            hideSpeaker={true}
          />
        </div>
      </div>
      
      <div className="flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isConversationMode && isListening && !partialText
                ? "音声入力中..." 
                : isConversationMode && partialText
                  ? "認識中..."
                  : placeholder
            }
            disabled={disabled || isSending}
            maxLength={4000}
            className="w-full min-h-[80px] max-h-[200px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            style={{ height: '80px' }}
          />
          
          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {message.length}/4000
          </div>
        </div>

        <button
          onClick={() => handleSend()}
          disabled={!message.trim() || disabled || isSending}
          className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="メッセージ送信 (Ctrl+Enter)"
        >
          {isSending ? (
            <FiLoader className="w-5 h-5 animate-spin" />
          ) : (
            <FiSend className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Error display */}
      {correctionError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          補正エラー: {correctionError}
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Ctrl+Enter: 送信 | Ctrl+R: 文字修正 | 音声認識エラーは自動補正されます
      </div>
    </div>
  );
};
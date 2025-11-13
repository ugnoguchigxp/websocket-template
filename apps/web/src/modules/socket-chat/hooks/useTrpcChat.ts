/**
 * WebSocket Chat Hook using tRPC Subscription
 * Pure WebSocket+tRPC implementation - no REST API
 */

import { useCallback, useEffect, useState } from 'react';
import { createContextLogger } from '@/modules/logger';
import { api as trpc } from '@/trpc';
import type { MCPChatMessage } from '../types/mcpChat';

const log = createContextLogger('useTrpcChat');

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

interface UseTrpcChatReturn {
  messages: MCPChatMessage[];
  sessionId: string | null;
  connectionState: ConnectionState;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string) => Promise<void>;
  clearSession: () => void;
  connect: () => void;
  disconnect: () => void;
  setError: (error: Error | null) => void;
}

/**
 * tRPC subscription-based chat hook
 * Uses existing WebSocket connection - no additional connections needed
 */
export function useTrpcChat(): UseTrpcChatReturn {
  const [messages, setMessages] = useState<MCPChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Send message mutation - must be at top level
  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      log.debug('Message sent successfully');
      setIsLoading(false);
    },
    onError: (err) => {
      log.error('Failed to send message', { error: err });
      setError(err as Error);
      setIsLoading(false);
    },
  });

  // Get session info
  const { data: session, isSuccess, isError, error: queryError } = trpc.chat.getSession.useQuery(undefined, {
    enabled: connectionState === 'disconnected',
    retry: false, // Don't retry if unauthorized
  });

  // Update state when session is retrieved
  useEffect(() => {
    if (isSuccess && session) {
      log.info('Session info retrieved', { sessionId: session.sessionId });
      setSessionId(session.sessionId);
      setConnectionState('connected');
    }
  }, [isSuccess, session]);

  // Update state on error
  useEffect(() => {
    if (isError && queryError) {
      const errorMessage = queryError.message || String(queryError);
      log.error('Failed to get session', { error: errorMessage });
      
      // Check if it's an authentication error
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('UNAUTHORIZED')) {
        log.warn('User not authenticated for chat');
        setError(new Error('認証が必要です。ログインしてください。'));
        setConnectionState('error');
      } else {
        setError(queryError as Error);
        setConnectionState('error');
      }
    }
  }, [isError, queryError]);

  // Subscribe to chat messages
  trpc.chat.onMessage.useSubscription(
    { sessionId: sessionId || undefined },
    {
      enabled: !!sessionId && connectionState === 'connected',
      onData: (message) => {
        log.debug('Received message via subscription', { type: message.type });
        
        // Convert tRPC message to MCPChatMessage
        const mcpMessage: MCPChatMessage = {
          id: `msg-${Date.now()}`,
          type: message.type === 'user_message' ? 'user' : 'assistant',
          content: message.content || '',
          timestamp: new Date(),
          metadata: message.metadata,
        };

        setMessages((prev) => [...prev, mcpMessage]);
      },
      onError: (err) => {
        log.error('Subscription error', { error: err });
        setError(err as Error);
        setConnectionState('error');
      },
    }
  );

  // Send message function
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    
    // Add user message to local state
    const userMessage: MCPChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via tRPC
    await sendMutation.mutateAsync({
      type: 'user_message',
      content,
    });
  }, [sendMutation]);

  // Clear session
  const clearSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  // Connect (actually just retrieves session)
  const connect = useCallback(() => {
    setConnectionState('connecting');
    // Session query will auto-run
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setConnectionState('disconnected');
    setSessionId(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (connectionState === 'disconnected') {
      connect();
    }
  }, [connectionState, connect]);

  return {
    messages,
    sessionId,
    connectionState,
    isLoading,
    error,
    sendMessage,
    clearSession,
    connect,
    disconnect,
    setError,
  };
}

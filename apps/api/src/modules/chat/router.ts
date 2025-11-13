/**
 * tRPC Chat Router
 * WebSocket subscription-based chat using existing tRPC connection
 */

import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import { inject, injectable } from 'tsyringe';
import { logger } from '../logger/core/logger.js';
import { ChatDispatcher } from './dispatcher.js';
import type { Context } from '../../routers/index.js';

const chatMessageSchema = z.object({
  type: z.enum(['user_message', 'response_chunk', 'response_complete', 'error', 'ping', 'pong']),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Create chat router for tRPC
 */
export function createChatRouter(t: any) {
  const chatDispatcher = new ChatDispatcher();
  
  return t.router({
    /**
     * Send a chat message
     */
    send: t.procedure
      .input(chatMessageSchema)
      .mutation(async ({ input, ctx }: { input: ChatMessage; ctx: Context }) => {
        if (!ctx.user) {
          throw new Error('Unauthorized');
        }

        logger.info('[Chat] Message received via tRPC', {
          userId: ctx.user.sub,
          type: input.type,
        });

        // ChatDispatcher will handle the message
        // For now, just acknowledge receipt
        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      }),

    /**
     * Subscribe to chat messages (real-time)
     */
    onMessage: t.procedure
      .input(z.object({
        sessionId: z.string().optional(),
      }))
      .subscription(({ input, ctx }: { input: { sessionId?: string }; ctx: Context }) => {
        if (!ctx.user) {
          throw new Error('Unauthorized');
        }

        logger.info('[Chat] Client subscribed to chat messages', {
          userId: ctx.user.sub,
          sessionId: input.sessionId,
        });

        return observable<ChatMessage>((emit) => {
          // Setup message handler
          const handleMessage = (message: ChatMessage) => {
            emit.next(message);
          };

          // Register handler with ChatDispatcher
          const handlerId = `${ctx.user!.sub}-${Date.now()}`;
          // chatDispatcher.registerHandler(handlerId, handleMessage);

          // Emit initial connection message
          emit.next({
            type: 'response_chunk',
            content: 'Connected to chat',
            metadata: {
              sessionId: input.sessionId || handlerId,
              timestamp: new Date().toISOString(),
            },
          });

          // Cleanup on unsubscribe
          return () => {
            logger.info('[Chat] Client unsubscribed from chat messages', {
              userId: ctx.user?.sub,
              handlerId,
            });
            // chatDispatcher.unregisterHandler(handlerId);
          };
        });
      }),

    /**
     * Get chat session info
     */
    getSession: t.procedure
      .query(async ({ ctx }: { ctx: Context }) => {
        if (!ctx.user) {
          throw new Error('Unauthorized');
        }

        return {
          userId: ctx.user.sub,
          sessionId: `session-${ctx.user.localUserId}`,
          timestamp: new Date().toISOString(),
        };
      }),
  });
}

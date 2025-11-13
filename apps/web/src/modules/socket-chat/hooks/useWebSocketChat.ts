/**
 * useWebSocketChat - Compatibility wrapper for useTrpcChat
 * 
 * This file re-exports useTrpcChat for backward compatibility.
 * All new code should use useTrpcChat directly.
 * 
 * @deprecated Use useTrpcChat instead
 */

export { useTrpcChat as useWebSocketChat } from './useTrpcChat';
export type { ConnectionState } from './useTrpcChat';

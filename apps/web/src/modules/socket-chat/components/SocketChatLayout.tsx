/**
 * Socket Chat Layout Component
 * Handles split-screen layout for chat and multimodal content
 */

import React, { ReactNode, useEffect, useState, useCallback, useRef } from 'react';

import { FiX, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';

import { createContextLogger } from '@/modules/logger';

import { useMultimodal } from '../../../contexts/MultimodalContext';

const log = createContextLogger('SocketChatLayout');

interface SocketChatLayoutProps {
  /** Main chat content */
  children: ReactNode;
  /** Multimodal content to display in right panel */
  multimodalContent?: ReactNode;
  /** Whether multimodal panel is open */
  isMultimodalOpen: boolean;
  /** Callback when multimodal panel is closed */
  onMultimodalClose: () => void;
  /** Optional title for multimodal panel */
  multimodalTitle?: string;
  /** Optional panel width configuration */
  panelWidth?: 'narrow' | 'normal' | 'wide';
  /** Whether to show panel controls */
  showPanelControls?: boolean;
}

/**
 * SocketChatLayout component
 * Provides responsive split-screen layout with smooth animations
 */
export const SocketChatLayout: React.FC<SocketChatLayoutProps> = ({
  children,
  multimodalContent,
  isMultimodalOpen,
  onMultimodalClose,
  multimodalTitle,
  panelWidth = 'normal',
  showPanelControls = true
}) => {
  const { fullscreenToggleRequested } = useMultimodal();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // References to control panels imperatively
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const multimodalPanelRef = useRef<ImperativePanelHandle>(null);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for fullscreen toggle requests from multimodal content
  useEffect(() => {
    toggleFullscreen();
  }, [fullscreenToggleRequested]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMultimodalOpen) {
        onMultimodalClose();
      }
    };

    if (isMultimodalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    
    return undefined;
  }, [isMultimodalOpen, onMultimodalClose]);

  // Prevent body scroll when mobile modal is open
  useEffect(() => {
    if (isMobile && isMultimodalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
    
    return undefined;
  }, [isMobile, isMultimodalOpen]);

  // Get default panel size based on panel width setting
  const getDefaultPanelSize = useCallback(() => {
    switch (panelWidth) {
      case 'narrow': return 30;
      case 'wide': return 60;
      case 'normal':
      default: return 50;
    }
  }, [panelWidth]);

  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // Use setTimeout to ensure state updates are applied before resizing
    setTimeout(() => {
      // Imperatively resize panels
      if (!isMobile && chatPanelRef.current && multimodalPanelRef.current) {
        if (newFullscreenState) {
          // Fullscreen: multimodal panel takes 100%, chat panel takes 0%
          log.debug('[SocketChatLayout] Setting fullscreen - chat: 0%, multimodal: 100%');
          chatPanelRef.current.resize(0);
          multimodalPanelRef.current.resize(100);
        } else {
          // Normal: restore to default sizes
          const defaultSize = getDefaultPanelSize();
          log.debug(`[SocketChatLayout] Restoring normal - chat: ${100 - defaultSize}%, multimodal: ${defaultSize}%`);
          chatPanelRef.current.resize(100 - defaultSize);
          multimodalPanelRef.current.resize(defaultSize);
        }
      }
    }, 0);
  }, [isFullscreen, isMobile, getDefaultPanelSize]);

  // Debug logging
  useEffect(() => {
    log.debug(`[SocketChatLayout] State changed:`, {
      isMultimodalOpen,
      hasMultimodalContent: !!multimodalContent,
      multimodalTitle,
      isMobile,
      isFullscreen,
      panelWidth
    });
  }, [isMultimodalOpen, multimodalContent, multimodalTitle, isMobile, isFullscreen, panelWidth]);

  // Mobile layout - use overlay modal
  if (isMobile) {
    return (
      <div className="flex h-full w-full relative">
        {/* Chat Area - full width on mobile */}
        <div className="w-full h-full">
          {children}
        </div>

        {/* Mobile Modal Overlay */}
        {isMultimodalOpen && multimodalContent && (
          <div 
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Close on backdrop click
              if (e.target === e.currentTarget) {
                onMultimodalClose();
              }
            }}
          >
            <div className="bg-white rounded-lg w-full h-full max-w-4xl max-h-full overflow-hidden shadow-2xl">
              {/* Mobile Modal Header */}
              {showPanelControls && (
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                      title={isFullscreen ? "ウィンドウ表示" : "フルスクリーン"}
                    >
                      {isFullscreen ? (
                        <FiMinimize2 className="w-4 h-4" />
                      ) : (
                        <FiMaximize2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={onMultimodalClose}
                    className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                    title="閉じる"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile Modal Content */}
              <div className="flex-1 overflow-auto">
                {multimodalContent}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout - resizable panels
  return (
    <div className="flex h-full w-full">
      {!isMultimodalOpen ? (
        // Single panel when multimodal is closed
        <div className="w-full h-full">
          {children}
        </div>
      ) : (
        // Resizable split panels when multimodal is open
        <PanelGroup direction="horizontal" className="w-full h-full">
          {/* Chat Panel */}
          <Panel 
            ref={chatPanelRef}
            defaultSize={100 - getDefaultPanelSize()} 
            minSize={isFullscreen ? 0 : 30} 
            className="flex flex-col"
          >
            {isFullscreen ? null : children}
          </Panel>

          {/* Resize Handle */}
          {!isFullscreen && (
            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="w-1 h-8 bg-gray-400 rounded-full"></div>
            </PanelResizeHandle>
          )}

          {/* Multimodal Panel */}
          <Panel 
            ref={multimodalPanelRef}
            defaultSize={getDefaultPanelSize()} 
            minSize={isFullscreen ? 100 : 25}
            className="flex flex-col bg-white"
          >
            {/* Panel Header */}
            {showPanelControls && (
              <div className="flex items-center justify-between p-3 border-b bg-gray-50 shrink-0">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                    title={isFullscreen ? "分割表示" : "全画面表示"}
                  >
                    {isFullscreen ? (
                      <FiMinimize2 className="w-4 h-4" />
                    ) : (
                      <FiMaximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={onMultimodalClose}
                  className="p-1.5 hover:bg-gray-200 rounded-md transition-colors"
                  title="閉じる"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Panel Content */}
            <div className="flex-1 overflow-auto">
              {multimodalContent}
            </div>
          </Panel>
        </PanelGroup>
      )}
    </div>
  );
};

// Note: CSS Animation classes should be added to global CSS or Tailwind config
// .animate-slideInRight {
//   animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
// }

export default SocketChatLayout;
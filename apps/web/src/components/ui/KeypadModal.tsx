/**
 * KeypadModal Base Component
 * 共通キーパッドモーダル（時刻・数値入力用）
 */

import { useEffect } from 'react';
import type React from 'react';

interface KeypadModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  displayContent: React.ReactNode;
  errorMessage?: string;
  onNumberClick: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onConfirm: () => void;
  additionalButton?: React.ReactNode;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({
  open,
  title,
  onClose,
  displayContent,
  errorMessage,
  onNumberClick,
  onBackspace,
  onClear,
  onConfirm,
  additionalButton,
}) => {
  // ESC key handling
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  // Overlay click handling
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleOverlayClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keypad-modal-title"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-gray-300">
          <h2 id="keypad-modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Display */}
          <div className="bg-gray-100 border-2 border-gray-400 rounded-md px-4 py-3 min-h-[60px] flex items-center justify-center">
            {displayContent}
          </div>

          {/* Error Message */}
          {errorMessage && <div className="text-red-600 text-sm text-center">{errorMessage}</div>}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onNumberClick(num.toString())}
                className="min-h-[60px] text-xl font-semibold bg-gray-100 hover:bg-gray-200 border-2 border-gray-400 rounded-md transition-colors"
              >
                {num}
              </button>
            ))}

            {additionalButton || <div />}

            <button
              type="button"
              onClick={() => onNumberClick('0')}
              className="min-h-[60px] text-xl font-semibold bg-gray-100 hover:bg-gray-200 border-2 border-gray-400 rounded-md transition-colors"
            >
              0
            </button>

            <button
              type="button"
              onClick={onBackspace}
              className="min-h-[60px] text-base font-semibold bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-400 rounded-md transition-colors"
            >
              ←
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onClear}
              className="min-h-[50px] text-base font-semibold bg-red-100 hover:bg-red-200 border-2 border-red-400 rounded-md transition-colors"
            >
              クリア
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[50px] text-base font-semibold bg-gray-100 hover:bg-gray-200 border-2 border-gray-400 rounded-md transition-colors"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[50px] text-base font-semibold bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-md transition-colors"
            >
              確定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

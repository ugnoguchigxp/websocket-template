import React, { useEffect, useRef, useState, useCallback } from 'react';

import {
	FaExclamationCircle,
	FaCheckCircle,
	FaInfoCircle,
	FaTimes,
	FaExclamationTriangle,
} from 'react-icons/fa';

import { ToastNotification } from '@/contexts/NotificationContext';
import { createContextLogger } from '@logger';

import { NOTIFICATION_ANIMATION } from './constants';

const log = createContextLogger('NotificationToast');

interface NotificationToastProps {
	notification: ToastNotification;
	onClose: (id: string) => void;
	onHide: (id: string) => void;
}

const iconMap = {
	info: FaInfoCircle,
	success: FaCheckCircle,
	warning: FaExclamationTriangle,
	error: FaExclamationCircle,
};

const colorClasses = {
	info: {
		container: 'bg-blue-50 border-blue-200',
		icon: 'text-blue-500',
		title: 'text-blue-900',
		message: 'text-blue-700',
		button: 'text-blue-500 hover:text-blue-700',
	},
	success: {
		container: 'bg-green-50 border-green-200',
		icon: 'text-green-500',
		title: 'text-green-900',
		message: 'text-green-700',
		button: 'text-green-500 hover:text-green-700',
	},
	warning: {
		container: 'bg-yellow-50 border-yellow-200',
		icon: 'text-yellow-600',
		title: 'text-yellow-900',
		message: 'text-yellow-700',
		button: 'text-yellow-600 hover:text-yellow-800',
	},
	error: {
		container: 'bg-red-50 border-red-200',
		icon: 'text-red-500',
		title: 'text-red-900',
		message: 'text-red-700',
		button: 'text-red-500 hover:text-red-700',
	},
};

export const NotificationToast: React.FC<NotificationToastProps> = React.memo(
	({ notification, onClose, onHide }) => {
		const [isVisible, setIsVisible] = useState(false);
		const [isLeaving, setIsLeaving] = useState(false);
		const timeoutRef = useRef<NodeJS.Timeout | null>(null);
		const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

		const Icon = iconMap[notification.type];
		const colors = colorClasses[notification.type];

		const handleClose = useCallback(() => {
			log.debug('Closing toast notification', {
				id: notification.id,
				type: notification.type,
			});

			setIsLeaving(true);
			onHide(notification.id);

			// Remove from DOM after animation
			hideTimeoutRef.current = setTimeout(() => {
				onClose(notification.id);
			}, NOTIFICATION_ANIMATION.HIDE_DURATION);
		}, [notification.id, notification.type, onHide, onClose]);

		// Show animation on mount
		useEffect(() => {
			const timer = setTimeout(() => setIsVisible(true), NOTIFICATION_ANIMATION.TOAST_DELAY);
			return () => clearTimeout(timer);
		}, []);

		// Auto-hide timer
		useEffect(() => {
			if (notification.duration > 0) {
				timeoutRef.current = setTimeout(() => {
					handleClose();
				}, notification.duration);
			}

			return () => {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
			};
		}, [notification.duration, handleClose]);

		// Cleanup timeouts on unmount
		useEffect(() => {
			return () => {
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
				if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
			};
		}, []);

		// Don't render if notification is not visible or is leaving
		if (!notification.isVisible || isLeaving) {
			return null;
		}

		return (
			<div
				id={`notification-toast-${notification.id}`}
				className={`
        notification-toast
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'translate-x-full opacity-0' : ''}
        w-full max-w-sm mx-auto mb-3 last:mb-0
        border rounded-lg shadow-lg
        ${colors.container}
        relative overflow-hidden
      `}
				role="alert"
				aria-live="polite"
				aria-atomic="true"
			>
				{/* Progress bar for timed notifications */}
				{notification.duration > 0 && (
					<div className="absolute top-0 left-0 h-1 bg-black bg-opacity-10 w-full">
						<div
							className="h-full bg-black bg-opacity-20 animate-pulse"
							style={{
								animation: `shrink ${notification.duration}ms linear forwards`,
							}}
						/>
					</div>
				)}

				<div className="p-4">
					<div className="flex items-start space-x-3">
						{/* Icon */}
						<div className="flex-shrink-0 pt-1">
							<Icon className={`w-5 h-5 ${colors.icon}`} aria-hidden="true" />
						</div>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<h4 className={`text-sm font-medium ${colors.title} mb-1`}>{notification.title}</h4>
							<p className={`text-sm ${colors.message} break-words`}>{notification.message}</p>
						</div>

						{/* Close button */}
						<div className="flex-shrink-0">
							<button
								onClick={handleClose}
								className={`
                inline-flex rounded-md p-1.5
                ${colors.button}
                hover:bg-black hover:bg-opacity-5
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                transition-colors duration-150
              `}
								aria-label="Close notification"
							>
								<FaTimes className="w-4 h-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
);

NotificationToast.displayName = 'NotificationToast';

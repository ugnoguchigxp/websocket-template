import React from 'react';

import { createPortal } from 'react-dom';

import { useNotificationContext } from '@/contexts/NotificationContext';
import { createContextLogger } from '@logger';

import { NOTIFICATION_LIMITS } from './constants';
import { NotificationToast } from './NotificationToast';

const log = createContextLogger('NotificationContainer');

interface NotificationContainerProps {
	maxNotifications?: number;
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionClasses = {
	'top-right': 'top-4 right-4',
	'top-left': 'top-4 left-4',
	'bottom-right': 'bottom-4 right-4',
	'bottom-left': 'bottom-4 left-4',
	'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
	'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
	maxNotifications = NOTIFICATION_LIMITS.MAX_TOASTS,
	position = 'top-right',
}) => {
	const { toasts, removeNotification, hideNotification } = useNotificationContext();

	// Filter only visible toasts and limit count
	const visibleToasts = toasts.filter((toast) => toast.isVisible).slice(0, maxNotifications);

	// Don't render if no toasts
	if (visibleToasts.length === 0) {
		return null;
	}

	log.debug('Rendering notification container', {
		count: visibleToasts.length,
		position,
	});

	const containerContent = (
		<div
			className={`
        fixed z-50 pointer-events-none
        ${positionClasses[position]}
        w-full max-w-sm
      `}
			role="region"
			aria-label="Notifications"
			aria-live="polite"
		>
			<div className="space-y-2 pointer-events-auto">
				{visibleToasts.map((toast) => (
					<NotificationToast
						key={toast.id}
						notification={toast}
						onClose={removeNotification}
						onHide={hideNotification}
					/>
				))}
			</div>

			{/* Screen reader announcement for new notifications */}
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				{visibleToasts.length > 0 &&
					`${visibleToasts.length} notification${visibleToasts.length > 1 ? 's' : ''} displayed`}
			</div>
		</div>
	);

	// Create portal to render outside normal component tree
	const portalRoot = document.getElementById('notification-portal') || document.body;

	return createPortal(containerContent, portalRoot);
};

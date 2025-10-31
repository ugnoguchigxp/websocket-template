import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

import { createContextLogger } from '@logger';

const log = createContextLogger('NotificationContext');

// Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationPayload {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	duration?: number;
	isRead?: boolean;
	createdAt?: string;
}

export interface ToastNotification extends NotificationPayload {
	duration: number;
	isVisible: boolean;
}

// State
interface NotificationState {
	toasts: ToastNotification[];
	isNotificationCenterOpen: boolean;
	unreadCount: number;
}

// Actions
type NotificationAction =
	| { type: 'ADD_TOAST'; payload: NotificationPayload }
	| { type: 'REMOVE_TOAST'; payload: { id: string } }
	| { type: 'HIDE_TOAST'; payload: { id: string } }
	| { type: 'OPEN_NOTIFICATION_CENTER' }
	| { type: 'CLOSE_NOTIFICATION_CENTER' }
	| { type: 'SET_UNREAD_COUNT'; payload: { count: number } }
	| { type: 'CLEAR_ALL_TOASTS' };

// Initial state
const initialState: NotificationState = {
	toasts: [],
	isNotificationCenterOpen: false,
	unreadCount: 0,
};

// Reducer
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
	switch (action.type) {
		case 'ADD_TOAST': {
			const duration = action.payload.duration || getDefaultDuration(action.payload.type);
			const newToast: ToastNotification = {
				...action.payload,
				duration,
				isVisible: true,
				createdAt: action.payload.createdAt || new Date().toISOString(),
			};

			log.debug('Adding toast notification', {
				id: newToast.id,
				type: newToast.type,
				title: newToast.title,
			});

			// Keep maximum 5 toasts visible
			const updatedToasts = [newToast, ...state.toasts].slice(0, 5);

			return {
				...state,
				toasts: updatedToasts,
				unreadCount: state.unreadCount + 1,
			};
		}

		case 'HIDE_TOAST': {
			return {
				...state,
				toasts: state.toasts.map((toast) =>
					toast.id === action.payload.id ? { ...toast, isVisible: false } : toast
				),
			};
		}

		case 'REMOVE_TOAST': {
			log.debug('Removing toast notification', { id: action.payload.id });
			return {
				...state,
				toasts: state.toasts.filter((toast) => toast.id !== action.payload.id),
			};
		}

		case 'OPEN_NOTIFICATION_CENTER': {
			log.debug('Opening notification center');
			return {
				...state,
				isNotificationCenterOpen: true,
			};
		}

		case 'CLOSE_NOTIFICATION_CENTER': {
			log.debug('Closing notification center');
			return {
				...state,
				isNotificationCenterOpen: false,
			};
		}

		case 'SET_UNREAD_COUNT': {
			return {
				...state,
				unreadCount: action.payload.count,
			};
		}

		case 'CLEAR_ALL_TOASTS': {
			log.debug('Clearing all toast notifications');
			return {
				...state,
				toasts: [],
			};
		}

		default:
			return state;
	}
}

// Helper function for default duration based on type
function getDefaultDuration(type: NotificationType): number {
	switch (type) {
		case 'error':
			return 8000; // 8 seconds for errors
		case 'warning':
			return 6000; // 6 seconds for warnings
		case 'success':
			return 4000; // 4 seconds for success
		case 'info':
		default:
			return 5000; // 5 seconds for info
	}
}

// Context
interface NotificationContextValue {
	// State
	toasts: ToastNotification[];
	isNotificationCenterOpen: boolean;
	unreadCount: number;

	// Actions
	addNotification: (notification: Omit<NotificationPayload, 'id'>) => void;
	removeNotification: (id: string) => void;
	hideNotification: (id: string) => void;
	openNotificationCenter: () => void;
	closeNotificationCenter: () => void;
	clearAllToasts: () => void;
	setUnreadCount: (count: number) => void;

	// Convenience methods
	showSuccess: (title: string, message: string, duration?: number) => void;
	showError: (title: string, message: string, duration?: number) => void;
	showWarning: (title: string, message: string, duration?: number) => void;
	showInfo: (title: string, message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
	children: ReactNode;
}

// Counter for generating unique notification IDs
let notificationCounter = 0;

// Provider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
	const [state, dispatch] = useReducer(notificationReducer, initialState);

	// Actions
	const addNotification = useCallback((notification: Omit<NotificationPayload, 'id'>) => {
		const id = `notification-${Date.now()}-${notificationCounter++}`;
		dispatch({
			type: 'ADD_TOAST',
			payload: { ...notification, id },
		});
	}, []);

	const removeNotification = useCallback((id: string) => {
		dispatch({ type: 'REMOVE_TOAST', payload: { id } });
	}, []);

	const hideNotification = useCallback((id: string) => {
		dispatch({ type: 'HIDE_TOAST', payload: { id } });
	}, []);

	const openNotificationCenter = useCallback(() => {
		dispatch({ type: 'OPEN_NOTIFICATION_CENTER' });
	}, []);

	const closeNotificationCenter = useCallback(() => {
		dispatch({ type: 'CLOSE_NOTIFICATION_CENTER' });
	}, []);

	const clearAllToasts = useCallback(() => {
		dispatch({ type: 'CLEAR_ALL_TOASTS' });
	}, []);

	const setUnreadCount = useCallback((count: number) => {
		dispatch({ type: 'SET_UNREAD_COUNT', payload: { count } });
	}, []);

	// Convenience methods
	const showSuccess = useCallback(
		(title: string, message: string, duration?: number) => {
			addNotification({ type: 'success', title, message, duration });
		},
		[addNotification]
	);

	const showError = useCallback(
		(title: string, message: string, duration?: number) => {
			addNotification({ type: 'error', title, message, duration });
		},
		[addNotification]
	);

	const showWarning = useCallback(
		(title: string, message: string, duration?: number) => {
			addNotification({ type: 'warning', title, message, duration });
		},
		[addNotification]
	);

	const showInfo = useCallback(
		(title: string, message: string, duration?: number) => {
			addNotification({ type: 'info', title, message, duration });
		},
		[addNotification]
	);

	const contextValue: NotificationContextValue = {
		// State
		toasts: state.toasts,
		isNotificationCenterOpen: state.isNotificationCenterOpen,
		unreadCount: state.unreadCount,

		// Actions
		addNotification,
		removeNotification,
		hideNotification,
		openNotificationCenter,
		closeNotificationCenter,
		clearAllToasts,
		setUnreadCount,

		// Convenience methods
		showSuccess,
		showError,
		showWarning,
		showInfo,
	};

	return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};

// Hook for using the notification context
export const useNotificationContext = (): NotificationContextValue => {
	const context = useContext(NotificationContext);
	if (context === undefined) {
		throw new Error('useNotificationContext must be used within a NotificationProvider');
	}
	return context;
};

// Re-export types for convenience
export type { NotificationContextValue };

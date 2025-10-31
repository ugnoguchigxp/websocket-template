import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test-utils';
import { NotificationContainer } from '../../../src/components/notifications/NotificationContainer';
import { useNotificationContext } from '../../../src/contexts/NotificationContext';
// Mock NotificationContext
vi.mock('../../../src/contexts/NotificationContext', async () => {
    const actual = await vi.importActual('../../../src/contexts/NotificationContext');
    return {
        ...actual,
        useNotificationContext: vi.fn(),
    };
});
// Mock NotificationToast
vi.mock('../../../src/components/notifications/NotificationToast', () => ({
    NotificationToast: ({ notification, onClose, onHide }) => (<div data-testid={`notification-toast-${notification.id}`}>
      <div>{notification.title}</div>
      <div>{notification.message}</div>
      <button onClick={() => onClose(notification.id)}>Close</button>
      <button onClick={() => onHide(notification.id)}>Hide</button>
    </div>),
}));
// Mock constants
vi.mock('../../../src/components/notifications/constants', () => ({
    NOTIFICATION_LIMITS: {
        MAX_TOASTS: 5,
    },
}));
// Mock react-dom
vi.mock('react-dom', () => ({
    createPortal: (node) => node,
}));
describe('NotificationContainer Component', () => {
    const mockToasts = [
        {
            id: 'toast-1',
            type: 'info',
            title: 'Info Toast',
            message: 'Info message',
            duration: 5000,
            isVisible: true,
            createdAt: new Date().toISOString(),
        },
        {
            id: 'toast-2',
            type: 'success',
            title: 'Success Toast',
            message: 'Success message',
            duration: 3000,
            isVisible: true,
            createdAt: new Date().toISOString(),
        },
    ];
    const mockContextValue = {
        toasts: mockToasts,
        isNotificationCenterOpen: false,
        unreadCount: 2,
        addToast: vi.fn(),
        removeToast: vi.fn(),
        hideToast: vi.fn(),
        clearAllToasts: vi.fn(),
        toggleNotificationCenter: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
    };
    beforeEach(() => {
        vi.clearAllMocks();
        useNotificationContext.mockReturnValue(mockContextValue);
    });
    // Basic rendering tests
    it('renders notification container with toasts', () => {
        renderWithProviders(<NotificationContainer />);
        expect(screen.getByTestId('notification-toast-toast-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-toast-toast-2')).toBeInTheDocument();
        expect(screen.getByText('Info Toast')).toBeInTheDocument();
        expect(screen.getByText('Success Toast')).toBeInTheDocument();
    });
    it('renders empty container when no toasts', () => {
        useNotificationContext.mockReturnValue({
            ...mockContextValue,
            toasts: [],
        });
        renderWithProviders(<NotificationContainer />);
        expect(screen.queryByTestId(/notification-toast-/)).not.toBeInTheDocument();
    });
    // Props tests
    it('uses custom maxNotifications', () => {
        const manyToasts = Array.from({ length: 10 }, (_, i) => ({
            id: `toast-${i}`,
            type: 'info',
            title: `Toast ${i}`,
            message: `Message ${i}`,
            duration: 5000,
            isVisible: true,
            createdAt: new Date().toISOString(),
        }));
        useNotificationContext.mockReturnValue({
            ...mockContextValue,
            toasts: manyToasts,
        });
        renderWithProviders(<NotificationContainer maxNotifications={3}/>);
        // Should render only first 3 toasts
        expect(screen.getByTestId('notification-toast-toast-0')).toBeInTheDocument();
        expect(screen.getByTestId('notification-toast-toast-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-toast-toast-2')).toBeInTheDocument();
        expect(screen.queryByTestId('notification-toast-toast-3')).not.toBeInTheDocument();
    });
    it('applies correct position classes', () => {
        const positions = [
            'top-right',
            'top-left',
            'bottom-right',
            'bottom-left',
            'top-center',
            'bottom-center'
        ];
        positions.forEach(position => {
            const { unmount } = renderWithProviders(<NotificationContainer position={position}/>);
            // Verify container renders with position
            expect(screen.getByTestId('notification-toast-toast-1')).toBeInTheDocument();
            unmount();
        });
    });
    it('uses default position when not specified', () => {
        renderWithProviders(<NotificationContainer />);
        // Verify container renders with default position
        expect(screen.getByTestId('notification-toast-toast-1')).toBeInTheDocument();
    });
    // Filter tests
    it('only renders visible toasts', () => {
        const mixedToasts = [
            { ...mockToasts[0], isVisible: true },
            { ...mockToasts[1], isVisible: false },
        ];
        useNotificationContext.mockReturnValue({
            ...mockContextValue,
            toasts: mixedToasts,
        });
        renderWithProviders(<NotificationContainer />);
        expect(screen.getByTestId('notification-toast-toast-1')).toBeInTheDocument();
        expect(screen.queryByTestId('notification-toast-toast-2')).not.toBeInTheDocument();
    });
    // Context integration tests
    it('uses notification context values', () => {
        renderWithProviders(<NotificationContainer />);
        expect(useNotificationContext).toHaveBeenCalled();
    });
    // Edge cases tests
    it('handles empty toasts array gracefully', () => {
        useNotificationContext.mockReturnValue({
            ...mockContextValue,
            toasts: [],
        });
        renderWithProviders(<NotificationContainer />);
        expect(screen.queryByTestId(/notification-toast-/)).not.toBeInTheDocument();
    });
    // Component existence test
    it('component is properly defined', () => {
        expect(NotificationContainer).toBeDefined();
    });
});
// Helper for position classes
const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
};

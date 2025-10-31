import { forwardRef } from 'react';
// Mock Radix UI Portal to render children without portal
export const MockPortal = forwardRef(function PortalMock(props, ref) {
    return <>{props.children}</>;
});
// Setup function to mock Radix UI components
export function setupRadixMocks() {
    // Mock @radix-ui/react-portal
    vi.mock('@radix-ui/react-portal', () => ({
        ...vi.requireActual('@radix-ui/react-portal'),
        Portal: MockPortal,
    }));
}

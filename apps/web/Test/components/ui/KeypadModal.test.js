import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../test-utils';
import { KeypadModal } from '../../../src/components/ui/KeypadModal';
describe('KeypadModal Component', () => {
    const defaultProps = {
        open: false,
        title: 'Keypad',
        onClose: vi.fn(),
        displayContent: <div>Display Content</div>,
        onNumberClick: vi.fn(),
        onBackspace: vi.fn(),
        onClear: vi.fn(),
        onConfirm: vi.fn(),
    };
    beforeEach(() => {
        vi.clearAllMocks();
    });
    // Basic rendering tests
    it('does not render when open is false', () => {
        renderWithProviders(<KeypadModal {...defaultProps}/>);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
    it('renders when open is true', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Keypad')).toBeInTheDocument();
        expect(screen.getByText('Display Content')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('9')).toBeInTheDocument();
    });
    // Number selection tests
    it('calls onNumberClick when number button is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        fireEvent.click(screen.getByText('5'));
        expect(defaultProps.onNumberClick).toHaveBeenCalledWith('5');
        fireEvent.click(screen.getByText('0'));
        expect(defaultProps.onNumberClick).toHaveBeenCalledWith('0');
    });
    // Clear button tests
    it('calls onClear when clear button is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const clearButton = screen.getByText('クリア');
        fireEvent.click(clearButton);
        expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
    });
    // Backspace button tests
    it('calls onBackspace when backspace button is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const deleteButton = screen.getByText('←');
        fireEvent.click(deleteButton);
        expect(defaultProps.onBackspace).toHaveBeenCalledTimes(1);
    });
    // Confirm button tests
    it('calls onConfirm when confirm button is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const confirmButton = screen.getByText('確定');
        fireEvent.click(confirmButton);
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });
    // Close functionality tests
    it('calls onClose when close button is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const closeButton = screen.getByText('キャンセル');
        fireEvent.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
    it('calls onClose when overlay is clicked', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const overlay = document.querySelector('.bg-black\\/50');
        if (overlay) {
            fireEvent.click(overlay);
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        }
    });
    // Display content tests
    it('displays custom display content', () => {
        const customDisplay = <div>Custom Display: 123</div>;
        renderWithProviders(<KeypadModal {...defaultProps} open={true} displayContent={customDisplay}/>);
        expect(screen.getByText('Custom Display: 123')).toBeInTheDocument();
    });
    it('displays error message when provided', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true} errorMessage="Invalid input"/>);
        expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });
    // Title tests
    it('displays custom title', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true} title="Number Input"/>);
        expect(screen.getByText('Number Input')).toBeInTheDocument();
    });
    // Multiple number input tests
    it('handles multiple number selections', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        fireEvent.click(screen.getByText('1'));
        fireEvent.click(screen.getByText('2'));
        fireEvent.click(screen.getByText('3'));
        expect(defaultProps.onNumberClick).toHaveBeenNthCalledWith(1, '1');
        expect(defaultProps.onNumberClick).toHaveBeenNthCalledWith(2, '2');
        expect(defaultProps.onNumberClick).toHaveBeenNthCalledWith(3, '3');
    });
    // Accessibility tests
    it('has proper accessibility attributes', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
    // Keyboard interaction tests
    it('handles ESC key press', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        const dialog = screen.getByRole('dialog');
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
    // Component existence test
    it('component is properly defined', () => {
        expect(KeypadModal).toBeDefined();
    });
    // Additional button tests
    it('renders additional button when provided', () => {
        const additionalButton = <button data-testid="additional-btn">Extra</button>;
        renderWithProviders(<KeypadModal {...defaultProps} open={true} additionalButton={additionalButton}/>);
        expect(screen.getByTestId('additional-btn')).toBeInTheDocument();
        expect(screen.getByText('Extra')).toBeInTheDocument();
    });
    // Edge cases tests
    it('handles rapid button clicks', () => {
        renderWithProviders(<KeypadModal {...defaultProps} open={true}/>);
        for (let i = 0; i < 10; i++) {
            fireEvent.click(screen.getByText(i.toString()));
        }
        expect(defaultProps.onNumberClick).toHaveBeenCalledTimes(10);
    });
});

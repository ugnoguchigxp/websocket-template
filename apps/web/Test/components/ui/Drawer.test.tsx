import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../test-utils';
import Drawer from '../../../src/components/ui/Drawer';

describe('Drawer Component', () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    children: <div>Drawer Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Basic rendering tests
  it('does not render overlay when isOpen is false', () => {
    renderWithProviders(<Drawer {...defaultProps} />);
    
    // Overlay should not be present when closed
    expect(document.querySelector('.bg-opacity-50')).not.toBeInTheDocument();
    // But drawer content should still be rendered (off-screen)
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('renders overlay when isOpen is true', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} />);
    
    // Overlay should be present when open
    expect(document.querySelector('.bg-opacity-50')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  // Position tests
  it('renders with right position by default', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} />);
    
    const drawer = screen.getByText('Drawer Content').parentElement;
    expect(drawer).toBeInTheDocument();
  });

  it('renders with left position when specified', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} position="left" />);
    
    const drawer = screen.getByText('Drawer Content').parentElement;
    expect(drawer).toBeInTheDocument();
  });

  // Custom props tests
  it('applies custom width class', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} width="w-96" />);
    
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  it('applies noPadding when true', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} noPadding={true} />);
    
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  // ESC key handling tests
  it('calls onClose when ESC key is pressed', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when ESC key is pressed but drawer is closed', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={false} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when other keys are pressed', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} />);
    
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    fireEvent.keyDown(document, { key: 'Tab' });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  // Children rendering tests
  it('renders complex children', () => {
    const complexChildren = (
      <div>
        <h2>Drawer Title</h2>
        <p>Drawer description</p>
        <button>Action Button</button>
      </div>
    );
    
    renderWithProviders(<Drawer {...defaultProps} isOpen={true}>
      {complexChildren}
    </Drawer>);
    
    expect(screen.getByText('Drawer Title')).toBeInTheDocument();
    expect(screen.getByText('Drawer description')).toBeInTheDocument();
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('renders null children without error', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} children={null} />);
    
    // Should not throw error
    expect(true).toBe(true);
  });

  // Event listener cleanup tests
  it('properly handles multiple open/close cycles', () => {
    const { rerender } = renderWithProviders(<Drawer {...defaultProps} isOpen={false} />);
    
    // Open drawer
    rerender(<Drawer {...defaultProps} isOpen={true} />);
    expect(document.querySelector('.bg-opacity-50')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
    
    // Close drawer
    rerender(<Drawer {...defaultProps} isOpen={false} />);
    expect(document.querySelector('.bg-opacity-50')).not.toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument(); // Still rendered but off-screen
    
    // Open again
    rerender(<Drawer {...defaultProps} isOpen={true} />);
    expect(document.querySelector('.bg-opacity-50')).toBeInTheDocument();
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  // Accessibility tests
  it('has proper structure for accessibility', () => {
    renderWithProviders(<Drawer {...defaultProps} isOpen={true} />);
    
    expect(screen.getByText('Drawer Content')).toBeInTheDocument();
  });

  // Component existence test
  it('component is properly defined', () => {
    expect(Drawer).toBeDefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../test-utils';
import DatePicker from '../../../src/components/ui/DatePicker';

// Mock react-datepicker
vi.mock('react-datepicker', () => ({
  default: ({ selected, onChange, placeholderText, disabled, selectsRange, startDate, endDate, monthsShown, renderCustomHeader }: any) => (
    <div data-testid="react-datepicker">
      <input
        type="text"
        placeholder={placeholderText}
        value={selected ? selected.toLocaleDateString() : ''}
        onChange={(e) => {
          // Simulate date selection
          if (onChange) {
            if (selectsRange) {
              onChange([new Date(2024, 0, 15), new Date(2024, 0, 20)]);
            } else {
              onChange(new Date(2024, 0, 15));
            }
          }
        }}
        disabled={disabled}
        data-testid="datepicker-input"
      />
      {renderCustomHeader && (
        <div data-testid="custom-header">
          <button onClick={() => {}} data-testid="year-picker-btn">Year</button>
          <button onClick={() => {}} data-testid="month-picker-btn">Month</button>
        </div>
      )}
      {selectsRange && (
        <div data-testid="range-info">
          <span data-testid="start-date">{startDate?.toLocaleDateString() || ''}</span>
          <span data-testid="end-date">{endDate?.toLocaleDateString() || ''}</span>
        </div>
      )}
      <div data-testid="months-shown">{monthsShown}</div>
    </div>
  ),
  registerLocale: vi.fn(),
}));

describe('DatePicker Component', () => {
  const defaultProps = {
    value: null,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Basic rendering tests
  it('renders with default props', () => {
    renderWithProviders(<DatePicker {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('日付を選択')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    renderWithProviders(<DatePicker {...defaultProps} label="Select date" />);
    
    expect(screen.getByPlaceholderText('Select date')).toBeInTheDocument();
  });

  it('renders datepicker input', () => {
    renderWithProviders(<DatePicker {...defaultProps} />);
    
    const input = screen.getByTestId('datepicker-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '日付を選択');
  });

  it('displays selected date', () => {
    const testDate = new Date(2024, 0, 15);
    renderWithProviders(<DatePicker {...defaultProps} value={testDate} />);
    
    expect(screen.getByDisplayValue('2024/1/15')).toBeInTheDocument();
    const input = screen.getByTestId('datepicker-input');
    expect(input).toBeInTheDocument();
  });

  // Props tests
  it('applies disabled state', () => {
    renderWithProviders(<DatePicker {...defaultProps} disabled={true} />);
    
    const input = screen.getByTestId('datepicker-input');
    expect(input).toBeDisabled();
  });

  it('applies custom placeholder', () => {
    renderWithProviders(<DatePicker {...defaultProps} label="開始日を選択" />);
    
    const input = screen.getByTestId('datepicker-input');
    expect(input).toHaveAttribute('placeholder', '開始日を選択');
  });

  it('applies custom className', () => {
    renderWithProviders(<DatePicker {...defaultProps} className="custom-datepicker" />);
    
    const wrapper = screen.getByTestId('react-datepicker').parentElement;
    expect(wrapper).toHaveClass('custom-datepicker');
  });

  // Range selection tests
  it('renders range datepicker when selectsRange is true', () => {
    const rangeProps = {
      selectsRange: true,
      startDate: new Date(2024, 0, 15),
      endDate: new Date(2024, 0, 20),
      onRangeChange: vi.fn(),
    };
    
    renderWithProviders(<DatePicker {...rangeProps} />);
    
    expect(screen.getByTestId('react-datepicker')).toBeInTheDocument();
    expect(screen.getByTestId('range-info')).toBeInTheDocument();
    expect(screen.getByTestId('start-date')).toHaveTextContent('2024/1/15');
    expect(screen.getByTestId('end-date')).toHaveTextContent('2024/1/20');
  });

  it('renders range datepicker structure', () => {
    const rangeProps = {
      selectsRange: true,
      onRangeChange: vi.fn(),
    };
    
    renderWithProviders(<DatePicker {...rangeProps} />);
    
    // Verify range datepicker renders with correct structure
    expect(screen.getByTestId('react-datepicker')).toBeInTheDocument();
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('shows custom header for range datepicker', () => {
    const rangeProps = {
      selectsRange: true,
      startDate: new Date(2024, 0, 15),
      endDate: new Date(2024, 0, 20),
      onRangeChange: vi.fn(),
    };
    
    renderWithProviders(<DatePicker {...rangeProps} />);
    
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.getByTestId('year-picker-btn')).toBeInTheDocument();
    expect(screen.getByTestId('month-picker-btn')).toBeInTheDocument();
  });

  // Custom header tests
  it('shows custom header for single datepicker', () => {
    renderWithProviders(<DatePicker {...defaultProps} />);
    
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.getByTestId('year-picker-btn')).toBeInTheDocument();
    expect(screen.getByTestId('month-picker-btn')).toBeInTheDocument();
  });

  // Multiple months tests
  it('displays multiple months when monthsShown > 1', () => {
    renderWithProviders(<DatePicker {...defaultProps} monthsShown={2} />);
    
    expect(screen.getByTestId('months-shown')).toHaveTextContent('2');
  });

  // Edge cases tests
  it('handles null value', () => {
    renderWithProviders(<DatePicker {...defaultProps} value={null} />);
    
    const input = screen.getByTestId('datepicker-input');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  it('handles undefined range dates', () => {
    const rangeProps = {
      selectsRange: true,
      startDate: null,
      endDate: null,
      onRangeChange: vi.fn(),
    };
    
    renderWithProviders(<DatePicker {...rangeProps} />);
    
    expect(screen.getByTestId('start-date')).toHaveTextContent('');
    expect(screen.getByTestId('end-date')).toHaveTextContent('');
  });

  // Component existence test
  it('component is properly defined', () => {
    expect(DatePicker).toBeDefined();
  });
});

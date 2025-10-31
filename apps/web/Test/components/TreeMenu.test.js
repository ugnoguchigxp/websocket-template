import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import { TreeMenu } from '../../src/components/TreeMenu';
// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => fallback || key,
    }),
}));
// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useLocation: () => ({ pathname: '/top' }),
    };
});
// Mock react-icons
vi.mock('react-icons/fa', () => ({
    FaChevronLeft: () => <div data-testid="chevron-left">←</div>,
}));
const mockMenuData = [
    {
        id: 'top',
        label: 'Top',
        labelKey: 'top',
        path: '/top',
    },
    {
        id: 'bbs',
        label: 'BBS',
        labelKey: 'bbs',
        path: '/bbs',
    },
    {
        id: 'components',
        label: 'Components',
        labelKey: 'components',
        children: [
            {
                id: 'button',
                label: 'Button',
                labelKey: 'button',
                path: '/components/button',
            },
            {
                id: 'input',
                label: 'Input',
                labelKey: 'input',
                path: '/components/input',
            },
        ],
    },
    {
        id: 'folder-only',
        label: 'Folder Only',
        children: [
            {
                id: 'nested-item',
                label: 'Nested Item',
                path: '/nested',
            },
        ],
    },
];
const renderTreeMenu = (component) => {
    return renderWithProviders(component);
};
describe('TreeMenu Component', () => {
    const defaultProps = {
        menuData: mockMenuData,
    };
    beforeEach(() => {
        vi.clearAllMocks();
    });
    // Basic rendering tests
    it('renders tree menu with menu data', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        expect(screen.getByText('Top')).toBeInTheDocument();
        expect(screen.getByText('BBS')).toBeInTheDocument();
        expect(screen.getByText('Components')).toBeInTheDocument();
        expect(screen.getByText('Folder Only')).toBeInTheDocument();
    });
    it('renders menu header', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        expect(screen.getByText('menu')).toBeInTheDocument();
    });
    it('renders close button when showCloseButton is true', () => {
        const onCloseMenu = vi.fn();
        renderTreeMenu(<TreeMenu {...defaultProps} showCloseButton={true} onCloseMenu={onCloseMenu}/>);
        const closeButton = screen.getByTestId('chevron-left');
        expect(closeButton).toBeInTheDocument();
    });
    it('does not render close button when showCloseButton is false', () => {
        renderTreeMenu(<TreeMenu {...defaultProps} showCloseButton={false}/>);
        expect(screen.queryByTestId('chevron-left')).not.toBeInTheDocument();
    });
    // Node expansion tests
    it('expands folder node when clicked', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const componentsButton = screen.getByText('Components');
        fireEvent.click(componentsButton);
        // Should show nested items
        expect(screen.getByText('Button')).toBeInTheDocument();
        expect(screen.getByText('Input')).toBeInTheDocument();
    });
    it('collapses folder node when clicked twice', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const componentsButton = screen.getByText('Components');
        fireEvent.click(componentsButton);
        fireEvent.click(componentsButton);
        // Should hide nested items
        expect(screen.queryByText('Button')).not.toBeInTheDocument();
        expect(screen.queryByText('Input')).not.toBeInTheDocument();
    });
    it('shows expand/collapse arrows for nodes with children', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        // Should show arrows for folders
        expect(screen.getAllByText('▶')).toHaveLength(2); // Components and Folder Only
    });
    it('updates arrow direction when expanding/collapsing', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const componentsButton = screen.getByText('Components');
        // Initially collapsed
        expect(screen.getAllByText('▶')).toHaveLength(2);
        fireEvent.click(componentsButton);
        // Should show expanded arrow
        expect(screen.getByText('▼')).toBeInTheDocument();
        expect(screen.getByText('▶')).toBeInTheDocument(); // Folder Only still collapsed
    });
    // Navigation tests
    it('renders links for leaf nodes', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const topLink = screen.getByText('Top');
        const bbsLink = screen.getByText('BBS');
        expect(topLink.closest('a')).toHaveAttribute('href', '/top');
        expect(bbsLink.closest('a')).toHaveAttribute('href', '/bbs');
    });
    it('renders links for nested items when expanded', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const componentsButton = screen.getByText('Components');
        fireEvent.click(componentsButton);
        const buttonLink = screen.getByText('Button');
        const inputLink = screen.getByText('Input');
        expect(buttonLink.closest('a')).toHaveAttribute('href', '/components/button');
        expect(inputLink.closest('a')).toHaveAttribute('href', '/components/input');
    });
    it('calls onSelect when link is clicked', () => {
        const onSelect = vi.fn();
        renderTreeMenu(<TreeMenu {...defaultProps} onSelect={onSelect}/>);
        const topLink = screen.getByText('Top');
        fireEvent.click(topLink);
        expect(onSelect).toHaveBeenCalled();
    });
    it('calls onCloseMenu when close button is clicked', () => {
        const onCloseMenu = vi.fn();
        renderTreeMenu(<TreeMenu {...defaultProps} showCloseButton={true} onCloseMenu={onCloseMenu}/>);
        const closeButton = screen.getByTestId('chevron-left');
        fireEvent.click(closeButton);
        expect(onCloseMenu).toHaveBeenCalled();
    });
    // Selection state tests
    it('highlights selected item based on current path', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const topLink = screen.getByText('Top');
        const topContainer = topLink.closest('div');
        expect(topContainer).toHaveClass('bg-blue-500', 'text-white', 'font-bold');
    });
    it('does not highlight non-selected items', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const bbsLink = screen.getByText('BBS');
        const bbsContainer = bbsLink.closest('div');
        expect(bbsContainer).not.toHaveClass('bg-blue-500', 'text-white', 'font-bold');
        expect(bbsContainer).toHaveClass('hover:bg-gray-100');
    });
    // Folder-only node tests
    it('renders folder-only nodes as buttons without links', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const folderOnlyButton = screen.getByText('Folder Only');
        const container = folderOnlyButton.closest('div');
        const button = container?.querySelector('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('Folder Only');
    });
    it('expands folder-only nodes when clicked', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const folderOnlyButton = screen.getByText('Folder Only');
        fireEvent.click(folderOnlyButton);
        expect(screen.getByText('Nested Item')).toBeInTheDocument();
    });
    // Accessibility tests
    it('has proper aria-labels for expand/collapse buttons', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const expandButtons = screen.getAllByRole('button').filter(btn => btn.textContent === '▶' || btn.textContent === '▼');
        expandButtons.forEach(button => {
            expect(button).toHaveAttribute('aria-label');
        });
    });
    it('has proper aria-label for close button', () => {
        renderTreeMenu(<TreeMenu {...defaultProps} showCloseButton={true} onCloseMenu={vi.fn()}/>);
        const closeButton = screen.getByTestId('chevron-left').closest('button');
        expect(closeButton).toHaveAttribute('aria-label', 'menu');
    });
    // i18n tests
    it('uses translated labels when labelKey is provided', () => {
        const menuDataWithKeys = [
            {
                id: 'test',
                label: 'Test Label',
                labelKey: 'test_key',
                path: '/test',
            },
        ];
        renderTreeMenu(<TreeMenu menuData={menuDataWithKeys}/>);
        expect(screen.getByText('Test Label')).toBeInTheDocument();
    });
    it('falls back to label when translation is not available', () => {
        const menuDataWithKeys = [
            {
                id: 'test',
                label: 'Fallback Label',
                labelKey: 'nonexistent_key',
                path: '/test',
            },
        ];
        renderTreeMenu(<TreeMenu menuData={menuDataWithKeys}/>);
        expect(screen.getByText('Fallback Label')).toBeInTheDocument();
    });
    // Edge cases tests
    it('handles empty menu data', () => {
        renderTreeMenu(<TreeMenu menuData={[]}/>);
        expect(screen.getByText('menu')).toBeInTheDocument();
        expect(screen.queryByText('Top')).not.toBeInTheDocument();
    });
    it('handles menu data without children', () => {
        const simpleMenuData = [
            {
                id: 'item1',
                label: 'Item 1',
                path: '/item1',
            },
            {
                id: 'item2',
                label: 'Item 2',
                path: '/item2',
            },
        ];
        renderTreeMenu(<TreeMenu menuData={simpleMenuData}/>);
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
        expect(screen.queryByText('▶')).not.toBeInTheDocument();
    });
    // CSS classes tests
    it('applies custom className', () => {
        const customClass = 'custom-tree-menu';
        renderTreeMenu(<TreeMenu {...defaultProps} className={customClass}/>);
        const treeMenu = screen.getByText('menu').closest('.tree-menu');
        expect(treeMenu).toHaveClass(customClass);
    });
    it('applies proper nesting indentation', () => {
        renderTreeMenu(<TreeMenu {...defaultProps}/>);
        const componentsButton = screen.getByText('Components');
        fireEvent.click(componentsButton);
        const nestedList = screen.getByText('Button').closest('ul');
        expect(nestedList).toHaveClass('pl-4');
    });
    // Component existence test
    it('TreeMenu component is properly defined', () => {
        expect(TreeMenu).toBeDefined();
    });
});

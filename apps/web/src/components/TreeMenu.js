import React, { useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
export const TreeMenu = ({ menuData, onSelect, className = '', showCloseButton = false, onCloseMenu, }) => {
    const { t } = useTranslation();
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const location = useLocation();
    const toggleNode = useCallback((id) => {
        setExpandedNodes((prev) => {
            const newExpandedNodes = new Set(prev);
            if (newExpandedNodes.has(id)) {
                newExpandedNodes.delete(id);
            }
            else {
                newExpandedNodes.add(id);
            }
            return newExpandedNodes;
        });
    }, []);
    const renderTree = (nodes, level = 0) => {
        return (<ul className={level > 0 ? 'pl-4' : ''}>
				{nodes.map((node) => {
                const isExpanded = expandedNodes.has(node.id);
                const isSelected = node.path === location.pathname;
                const isFolder = !!node.children && (!node.path || node.path === '');
                const displayLabel = node.labelKey ? t(node.labelKey, node.label) : node.label;
                return (<li key={node.id} className="mb-1">
							<div className={`flex items-center justify-between rounded px-2 py-1 transition-colors ${isSelected ? 'bg-blue-500 text-white font-bold' : 'hover:bg-gray-100'}`}>
								{isFolder ? (<button type="button" onClick={() => toggleNode(node.id)} className="flex-grow text-left focus:outline-none">
										{displayLabel}
									</button>) : (<Link to={node.path || '#'} onClick={onSelect} className="flex-grow focus:outline-none">
										{displayLabel}
									</Link>)}
								{node.children && (<button onClick={() => toggleNode(node.id)} className="p-1 focus:outline-none" aria-label={isExpanded ? `${displayLabel}を折りたたむ` : `${displayLabel}を展開する`}>
										{isExpanded ? '▼' : '▶'}
									</button>)}
							</div>
							{node.children && isExpanded && renderTree(node.children, level + 1)}
						</li>);
            })}
			</ul>);
    };
    return (<div className={`tree-menu ${className}`}>
			<div className="px-2 py-2 bg-gray-800 text-white font-bold flex items-center justify-between">
				<span>{t('menu')}</span>
				{showCloseButton && onCloseMenu && (<button onClick={onCloseMenu} className="text-white hover:text-gray-300 focus:outline-none p-1" aria-label={t('menu')}>
						<FaChevronLeft className="w-4 h-4"/>
					</button>)}
			</div>
			<div className="p-2">{renderTree(menuData)}</div>
		</div>);
};

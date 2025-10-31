/**
 * NumberInput Component
 * 数値入力用のキーパッド付きInput
 */
import React, { useState } from 'react';
import { Input } from './Input';
import { KeypadModal } from './KeypadModal';
import { createContextLogger } from '@logger';
const log = createContextLogger('NumberInput');
export const NumberInput = ({ value, onChange, label = '数値を入力', placeholder = 'タップして入力', min, max, disabled = false, className = '', allowDecimal = false, }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const handleOpen = () => {
        if (disabled)
            return;
        setInputValue(value?.toString() || '');
        setErrorMessage('');
        setModalOpen(true);
        log.debug('Number input modal opened', { currentValue: value });
    };
    const handleNumberClick = (digit) => {
        setInputValue((prev) => prev + digit);
        setErrorMessage('');
    };
    const handleBackspace = () => {
        setInputValue((prev) => prev.slice(0, -1));
        setErrorMessage('');
    };
    const handleClear = () => {
        setInputValue('');
        setErrorMessage('');
    };
    const handleDecimalClick = () => {
        if (!allowDecimal)
            return;
        if (inputValue.includes('.'))
            return;
        setInputValue((prev) => (prev || '0') + '.');
        setErrorMessage('');
    };
    const handleConfirm = () => {
        if (!inputValue) {
            setErrorMessage('値を入力してください');
            return;
        }
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue)) {
            setErrorMessage('有効な数値を入力してください');
            return;
        }
        if (min !== undefined && numValue < min) {
            setErrorMessage(`${min}以上の値を入力してください`);
            return;
        }
        if (max !== undefined && numValue > max) {
            setErrorMessage(`${max}以下の値を入力してください`);
            return;
        }
        log.info('Number input confirmed', { value: numValue });
        if (onChange) {
            onChange(numValue);
        }
        setModalOpen(false);
        setInputValue('');
        setErrorMessage('');
    };
    const handleClose = () => {
        setModalOpen(false);
        setInputValue('');
        setErrorMessage('');
        log.debug('Number input modal closed');
    };
    return (<>
			<Input type="text" value={value?.toString() || ''} placeholder={placeholder} onClick={handleOpen} readOnly disabled={disabled} className={className}/>
			<KeypadModal open={modalOpen} title={label} onClose={handleClose} displayContent={<div className="text-3xl font-bold text-gray-900">{inputValue || '0'}</div>} errorMessage={errorMessage} onNumberClick={handleNumberClick} onBackspace={handleBackspace} onClear={handleClear} onConfirm={handleConfirm} additionalButton={allowDecimal ? (<button type="button" onClick={handleDecimalClick} className="min-h-[60px] text-xl font-semibold bg-gray-100 hover:bg-gray-200 border-2 border-gray-400 rounded-md transition-colors">
							.
						</button>) : undefined}/>
		</>);
};

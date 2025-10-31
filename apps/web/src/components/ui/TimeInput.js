/**
 * TimeInput Component
 * 時刻入力用のキーパッド付きInput (HH:MM形式)
 */
import React, { useState } from 'react';
import { Input } from './Input';
import { KeypadModal } from './KeypadModal';
import { createContextLogger } from '@logger';
const log = createContextLogger('TimeInput');
export const TimeInput = ({ value, onChange, label = '時刻を入力', placeholder = 'タップして入力', disabled = false, className = '', }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const formatTimeDisplay = (input) => {
        // Remove non-digits
        const digits = input.replace(/\D/g, '');
        // Format as HH:MM
        if (digits.length === 0)
            return '';
        if (digits.length <= 2)
            return digits;
        return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    };
    const handleOpen = () => {
        if (disabled)
            return;
        // Remove colon from existing value for editing
        const initialValue = value ? value.replace(':', '') : '';
        setInputValue(initialValue);
        setErrorMessage('');
        setModalOpen(true);
        log.debug('Time input modal opened', { currentValue: value });
    };
    const handleNumberClick = (digit) => {
        // Only allow up to 4 digits
        const digits = inputValue.replace(/\D/g, '');
        if (digits.length >= 4)
            return;
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
    const handleConfirm = () => {
        const digits = inputValue.replace(/\D/g, '');
        if (digits.length !== 4) {
            setErrorMessage('4桁の数字を入力してください (HHMM)');
            return;
        }
        const hours = parseInt(digits.slice(0, 2), 10);
        const minutes = parseInt(digits.slice(2, 4), 10);
        if (hours < 0 || hours > 23) {
            setErrorMessage('時間は00-23の範囲で入力してください');
            return;
        }
        if (minutes < 0 || minutes > 59) {
            setErrorMessage('分は00-59の範囲で入力してください');
            return;
        }
        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        log.info('Time input confirmed', { value: formattedTime });
        if (onChange) {
            onChange(formattedTime);
        }
        setModalOpen(false);
        setInputValue('');
        setErrorMessage('');
    };
    const handleClose = () => {
        setModalOpen(false);
        setInputValue('');
        setErrorMessage('');
        log.debug('Time input modal closed');
    };
    return (<>
			<Input type="text" value={value || ''} placeholder={placeholder} onClick={handleOpen} readOnly disabled={disabled} className={className}/>
			<KeypadModal open={modalOpen} title={label} onClose={handleClose} displayContent={<div className="text-3xl font-bold text-gray-900">
						{formatTimeDisplay(inputValue) || '--:--'}
					</div>} errorMessage={errorMessage} onNumberClick={handleNumberClick} onBackspace={handleBackspace} onClear={handleClear} onConfirm={handleConfirm} additionalButton={<button type="button" className="min-h-[60px] text-base font-semibold bg-gray-100 border-2 border-gray-400 rounded-md transition-colors cursor-default" disabled>
						:
					</button>}/>
		</>);
};

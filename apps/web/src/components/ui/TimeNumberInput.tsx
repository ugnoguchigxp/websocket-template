/**
 * TimeNumberInput Component
 * 4桁の数値で時刻を入力するキーパッド付きInput (HHMM形式 → HH:MM変換)
 */

import React, { useState } from 'react';
import { Input } from './Input';
import { KeypadModal } from './KeypadModal';
import { createContextLogger } from '@logger';

const log = createContextLogger('TimeNumberInput');

interface TimeNumberInputProps {
	value?: number | null; // HHMM format as number (e.g., 1430)
	onChange?: (value: number | null, formattedTime: string | null) => void;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export const TimeNumberInput: React.FC<TimeNumberInputProps> = ({
	value,
	onChange,
	label = '時刻を入力 (4桁)',
	placeholder = 'タップして入力',
	disabled = false,
	className = '',
}) => {
	const [modalOpen, setModalOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const formatTimeDisplay = (numStr: string) => {
		// Format as HHMM (just the number)
		const digits = numStr.replace(/\D/g, '');
		if (digits.length === 0) return '';
		return digits;
	};

	const formatToTime = (numValue: number): string => {
		// Convert HHMM number to HH:MM string
		const str = String(numValue).padStart(4, '0');
		return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
	};

	const handleOpen = () => {
		if (disabled) return;
		setInputValue(value ? String(value).padStart(4, '0') : '');
		setErrorMessage('');
		setModalOpen(true);
		log.debug('TimeNumber input modal opened', { currentValue: value });
	};

	const handleNumberClick = (digit: string) => {
		// Only allow up to 4 digits
		const currentDigits = inputValue.replace(/\D/g, '');
		if (currentDigits.length >= 4) return;

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

		const numValue = parseInt(digits, 10);
		const hours = Math.floor(numValue / 100);
		const minutes = numValue % 100;

		if (hours < 0 || hours > 23) {
			setErrorMessage('時間は00-23の範囲で入力してください');
			return;
		}

		if (minutes < 0 || minutes > 59) {
			setErrorMessage('分は00-59の範囲で入力してください');
			return;
		}

		const formattedTime = formatToTime(numValue);

		log.info('TimeNumber input confirmed', { value: numValue, formatted: formattedTime });
		if (onChange) {
			onChange(numValue, formattedTime);
		}
		setModalOpen(false);
		setInputValue('');
		setErrorMessage('');
	};

	const handleClose = () => {
		setModalOpen(false);
		setInputValue('');
		setErrorMessage('');
		log.debug('TimeNumber input modal closed');
	};

	const displayValue = value ? formatToTime(value) : '';

	return (
		<>
			<Input
				type="text"
				value={displayValue}
				placeholder={placeholder}
				onClick={handleOpen}
				readOnly
				disabled={disabled}
				className={className}
			/>
			<KeypadModal
				open={modalOpen}
				title={label}
				onClose={handleClose}
				displayContent={
					<div className="text-3xl font-bold text-gray-900">
						{formatTimeDisplay(inputValue) || '0000'}
					</div>
				}
				errorMessage={errorMessage}
				onNumberClick={handleNumberClick}
				onBackspace={handleBackspace}
				onClear={handleClear}
				onConfirm={handleConfirm}
			/>
		</>
	);
};

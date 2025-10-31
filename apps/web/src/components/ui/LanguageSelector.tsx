import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';

interface LanguageSelectorProps {
	className?: string;
	id?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '', id }) => {
	const { i18n } = useTranslation();

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
	};

	return (
		<Select value={i18n.language} onValueChange={changeLanguage}>
			<SelectTrigger id={id} className={className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="ja">日本語</SelectItem>
				<SelectItem value="en">English</SelectItem>
			</SelectContent>
		</Select>
	);
};

export default LanguageSelector;

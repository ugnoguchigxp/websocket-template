import type React from "react"

import { useTranslation } from "react-i18next"
import { FiGlobe } from "react-icons/fi"

interface LanguageSelectorProps {
	className?: string
	id: string
	"data-testid"?: string
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
	className,
	id,
	"data-testid": dataTestId,
}) => {
	const { i18n } = useTranslation()

	const options = [
		{ id: "ja", textValue: "ja", label: "日本語" },
		{ id: "en", textValue: "en", label: "English" },
		{ id: "cn", textValue: "cn", label: "中文" },
		{ id: "kr", textValue: "kr", label: "한국어" },
		{ id: "de", textValue: "de", label: "Deutsch" },
		{ id: "fr", textValue: "fr", label: "Français" },
		{ id: "pt", textValue: "pt", label: "Português" },
		{ id: "es", textValue: "es", label: "Español" },
		{ id: "nl", textValue: "nl", label: "Nederlands" },
	]

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng)
	}

	return (
		<div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
			<FiGlobe className="text-lg text-gray-500" aria-hidden="true" />
			<select
				id={id}
				data-testid={dataTestId}
				value={i18n.language}
				onChange={event => changeLanguage(event.target.value)}
				className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
				aria-label="Select language"
			>
				{options.map(option => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	)
}

export default LanguageSelector

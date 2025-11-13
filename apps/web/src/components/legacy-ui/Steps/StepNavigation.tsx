import { useTranslation } from "react-i18next"
import { MdArrowBack, MdArrowForward, MdCheck } from "react-icons/md"
import { useNavigate } from "react-router-dom"

import { personalInfoSchema } from "../../../schemas/personalInfo.schema"
import Button from "../Button"

import { useStep } from "./StepContext"

export function StepNavigation() {
	const { t } = useTranslation()
	const { currentStep, nextStep, prevStep, isLastStep, setStep, formData } = useStep()
	const navigate = useNavigate()

	const steps = ["Welcome", "Personal Info", "Preferences", "Review"]

	// WelcomeステップのNextボタン活性制御用
	const isWelcomeStep = currentStep === 0
	let nextDisabled = false
	if (isWelcomeStep) {
		nextDisabled = formData.agreement !== "agree"
	}

	// PersonalInfoステップのNextボタン活性制御（zodバリデーションで判定）
	const isPersonalInfoStep = currentStep === 1
	if (isPersonalInfoStep) {
		const parseResult = personalInfoSchema.safeParse({
			name: formData.name,
			email: formData.email,
			phone: formData.phone,
			gender: formData.gender,
			age: formData.age,
			birthday: formData.birthday,
		})
		nextDisabled = !parseResult.success
	}

	return (
		<div className="fixed bottom-0 left-0 w-full bg-white shadow z-50 mt-8 flex justify-between items-center p-4">
			<Button
				onClick={currentStep === 0 ? () => navigate("/") : prevStep}
				disabled={currentStep === 0}
				label={
					<>
						<MdArrowBack className="w-4 h-4" />
						{t("back", "Back")}
					</>
				}
				className={`border-2 shadow-sm ${
					currentStep === 0
						? "text-gray-700 border-gray-400 hover:border-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-all"
						: "text-gray-700 border-gray-400 hover:border-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-all"
				}`}
			/>

			<div className="flex gap-4 items-center">
				{steps.map((stepName, index) => (
					<button
						key={index}
						onClick={() => setStep(index)}
						className="group relative"
						title={stepName}
					>
						<div
							className={`w-4 h-4 rounded-full transition-all duration-200 cursor-pointer ${index === currentStep ? "bg-blue-500 scale-110" : "bg-gray-300 hover:bg-blue-300"}`}
						/>
						<span className="absolute top-6 left-1/2 -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
							{stepName}
						</span>
					</button>
				))}
			</div>

			<Button
				onClick={isLastStep ? () => navigate("/") : nextStep}
				disabled={nextDisabled}
				label={
					isLastStep ? (
						<>
							<span>{t("complete", "Complete")}</span>
							<MdCheck className="w-4 h-4" />
						</>
					) : (
						<>
							<span>{t("next", "Next")}</span>
							<MdArrowForward className="w-4 h-4" />
						</>
					)
				}
				className="text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			/>
		</div>
	)
}

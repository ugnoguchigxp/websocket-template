import { useCallback, useRef, useState } from "react"

type AutoSpeechInput = {
	fileId?: string | null
	fileUrl?: string | null
	chunks?: unknown
	textLength?: number
}

export function useAutoSpeech() {
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const [isAutoPlaying, setIsAutoPlaying] = useState(false)

	const ensureAudio = () => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
			audioRef.current.preload = "auto"
			audioRef.current.addEventListener("ended", () => setIsAutoPlaying(false), { once: false })
			audioRef.current.addEventListener("pause", () => setIsAutoPlaying(false), { once: false })
		}
		return audioRef.current
	}

	const playAutoSpeech = useCallback(async (input: AutoSpeechInput) => {
		const url = input.fileUrl ?? undefined
		if (!url) return
		const audio = ensureAudio()
		if (audio.src !== url) {
			audio.src = url
		}
		setIsAutoPlaying(true)
		try {
			await audio.play()
		} catch {
			setIsAutoPlaying(false)
		}
	}, [])

	const stopAutoSpeech = useCallback(() => {
		const audio = audioRef.current
		if (!audio) return
		try {
			audio.pause()
			audio.currentTime = 0
		} finally {
			setIsAutoPlaying(false)
		}
	}, [])

	return { isAutoPlaying, playAutoSpeech, stopAutoSpeech }
}

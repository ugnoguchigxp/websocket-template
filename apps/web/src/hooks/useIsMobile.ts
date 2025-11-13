import { useMediaQuery } from "react-responsive"

/**
 * モバイル判定用カスタムフック
 * @param maxWidth モバイル判定の最大幅（デフォルト: 767px）
 * @returns isMobile: boolean
 */
export const useIsMobile = (maxWidth = 767): boolean => {
	return useMediaQuery({ maxWidth })
}

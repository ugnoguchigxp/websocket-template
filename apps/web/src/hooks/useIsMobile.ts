import { useMediaQuery } from "react-responsive"
export const useIsMobile = () => {
	return useMediaQuery({ maxWidth: 767 }, undefined, matches => matches ?? false)
}

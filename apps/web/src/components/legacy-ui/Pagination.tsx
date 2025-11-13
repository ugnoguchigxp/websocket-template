import type React from "react"

import { FaAngleDoubleLeft, FaAngleDoubleRight, FaAngleLeft, FaAngleRight } from "react-icons/fa"

type PaginationProps = {
	currentPage: number
	totalPages: number
	totalPosts: number
	onPageChange: (page: number) => void
}

const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalPages,
	totalPosts,
	onPageChange,
}) => {
	return (
		<div className="flex justify-center mt-6 gap-2">
			<button
				className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
				onClick={() => onPageChange(1)}
				disabled={currentPage === 1}
				title="First Page"
			>
				<FaAngleDoubleLeft />
			</button>
			<button
				className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}
				title="Previous Page"
			>
				<FaAngleLeft />
			</button>
			<span className="px-2 py-1 text-gray-700">
				{currentPage} / {totalPages || 1} ({totalPosts})
			</span>
			<button
				className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === totalPages || totalPages === 0}
				title="Next Page"
			>
				<FaAngleRight />
			</button>
			<button
				className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
				onClick={() => onPageChange(totalPages)}
				disabled={currentPage === totalPages || totalPages === 0}
				title="Last Page"
			>
				<FaAngleDoubleRight />
			</button>
		</div>
	)
}

export default Pagination

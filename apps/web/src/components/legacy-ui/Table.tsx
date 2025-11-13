import {
	type HeaderGroup,
	type Row,
	type Table as TanStackTable,
	flexRender,
} from "@tanstack/react-table"
import {
	FaAngleDoubleLeft,
	FaAngleDoubleRight,
	FaAngleLeft,
	FaAngleRight,
	FaSortDown,
	FaSortUp,
} from "react-icons/fa"

interface TableProps<T> {
	table: TanStackTable<T>
	isMobile?: boolean
	total?: number
	pageSize?: number
	onPageSizeChange?: (size: number) => void
}

function Table<T>({ table, isMobile, total, pageSize, onPageSizeChange }: TableProps<T>) {
	return (
		<>
			<div className="mb-4 flex items-center gap-2">
				<label htmlFor="page-size-select" className="text-gray-700 text-sm">
					表示件数
				</label>
				<select
					id="page-size-select"
					className="border rounded px-2 py-1 text-sm"
					value={pageSize}
					onChange={e => onPageSizeChange?.(Number(e.target.value))}
				>
					<option value={10}>10</option>
					<option value={20}>20</option>
					<option value={30}>30</option>
				</select>
			</div>
			<div className="overflow-x-auto">
				<table
					className={`min-w-full bg-white border border-gray-200 rounded-lg ${isMobile ? "text-xs" : ""}`}
				>
					<thead>
						{table.getHeaderGroups().map((headerGroup: HeaderGroup<T>) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map(header => {
									const canSort = header.column.getCanSort()
									const isSorted = header.column.getIsSorted()
									return (
										<th
											key={header.id}
											className={`px-3 py-2 bg-gray-400 text-left select-none ${canSort ? "cursor-pointer" : ""} border-b border-b-gray-500 border-r border-r-white`}
											onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
											aria-sort={
												isSorted ? (isSorted === "asc" ? "ascending" : "descending") : "none"
											}
										>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
											{canSort && (
												<span className="ml-1">
													{isSorted === "asc" ? (
														<FaSortUp className="inline text-blue-800" />
													) : isSorted === "desc" ? (
														<FaSortDown className="inline text-blue-800" />
													) : null}
												</span>
											)}
										</th>
									)
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row: Row<T>) => (
							<tr key={row.id} className="hover:bg-gray-50 transition">
								{row.getVisibleCells().map(cell => (
									<td
										key={cell.id}
										className="px-3 py-2 border-b border-b-gray-500 border-r border-r-white"
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="flex justify-center mt-4 gap-2">
				<button
					className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
					onClick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
					title="最初"
				>
					<FaAngleDoubleLeft />
				</button>
				<button
					className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					title="前へ"
				>
					<FaAngleLeft />
				</button>
				<span className="px-2 py-1 text-gray-700">
					{table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}{" "}
					{total !== undefined && `(${total})`}
				</span>
				<button
					className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					title="次へ"
				>
					<FaAngleRight />
				</button>
				<button
					className="px-3 py-1 rounded border bg-white disabled:opacity-50 flex items-center justify-center"
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
					title="最後"
				>
					<FaAngleDoubleRight />
				</button>
			</div>
		</>
	)
}

export default Table

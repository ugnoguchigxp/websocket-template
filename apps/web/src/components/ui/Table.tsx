import {
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
	type ColumnFiltersState,
} from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import { useState } from "react"
import { Button } from "./Button"

interface TableProps<TData> {
	data: TData[]
	columns: ColumnDef<TData>[]
	pageSize?: number
	loading?: boolean
	emptyMessage?: string
	enableSelection?: boolean
	enableSorting?: boolean
	enablePagination?: boolean
	enableFiltering?: boolean
	initialSorting?: SortingState
	initialFilters?: ColumnFiltersState
	onSortingChange?: (sorting: SortingState) => void
	onFiltersChange?: (filters: ColumnFiltersState) => void
}

export function Table<TData>({ 
	data, 
	columns, 
	pageSize = 10,
	loading = false,
	emptyMessage,
	enableSorting = true,
	enablePagination = true,
	initialSorting = [],
	initialFilters = [],
	onSortingChange,
	onFiltersChange,
}: TableProps<TData>) {
	const { t } = useTranslation()
	const [sorting, setSorting] = useState<SortingState>(initialSorting)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialFilters)

	const handleSortingChange = (updater: any) => {
		setSorting(updater)
		if (onSortingChange) {
			const newSorting = typeof updater === 'function' ? updater(sorting) : updater
			onSortingChange(newSorting)
		}
	}

	const handleFiltersChange = (updater: any) => {
		setColumnFilters(updater)
		if (onFiltersChange) {
			const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
			onFiltersChange(newFilters)
		}
	}

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
		},
		onSortingChange: handleSortingChange,
		onColumnFiltersChange: handleFiltersChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
		getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			pagination: {
				pageSize,
			},
		},
	})

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto rounded-md border bg-white">
				<table className="w-full caption-bottom text-sm">
					<thead className="border-b bg-gray-50">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
									>
										{header.isPlaceholder ? null : (
											<div
												className={
													header.column.getCanSort() ? "cursor-pointer select-none" : ""
												}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{{
													asc: " 🔼",
													desc: " 🔽",
												}[header.column.getIsSorted() as string] ?? null}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="[&_tr:last-child]:border-0">
						{loading ? (
							<tr>
								<td colSpan={columns.length} className="h-24 text-center">
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
									</div>
								</td>
							</tr>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="p-4 align-middle">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</tr>
							))
						) : (
							<tr>
								<td colSpan={columns.length} className="h-24 text-center">
									{emptyMessage || t("no_data")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{enablePagination && (
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						{t("showing")} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} {t("of")} {table.getFilteredRowModel().rows.length}
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							{t("previous")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							{t("next")}
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

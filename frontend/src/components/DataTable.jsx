import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { C, Btn } from './ui';

export function DataTable({
  data = [],
  columns,
  filterPlaceholder = 'Search…',
  pageSize = 12,
  extraFilters,
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel:       getCoreRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div>
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder={filterPlaceholder}
          style={{
            padding: '8px 14px',
            border: `1px solid ${C.border}`,
            borderRadius: 8, fontSize: 14,
            outline: 'none', minWidth: 220,
          }}
        />
        {extraFilters}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontWeight: 600, fontSize: 11.5, color: C.muted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: `1px solid ${C.border}`,
                      background: C.bg,
                      cursor: h.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc'  ? ' ↑'
                    : h.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: 'center', padding: 40,
                    color: C.muted, fontSize: 14,
                  }}
                >
                  No records found
                </td>
              </tr>
            ) : table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? C.surface : C.bg }}>
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: `1px solid ${C.border}`,
                      color: C.text, verticalAlign: 'middle',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14, flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 13, color: C.muted }}>
          {table.getFilteredRowModel().rows.length} records
          {table.getPageCount() > 1 &&
            ` · Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`}
        </span>
        {table.getPageCount() > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="ghost"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              ← Prev
            </Btn>
            <Btn size="sm" variant="ghost"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              Next →
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
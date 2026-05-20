import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { alpha } from '@mui/material/styles'

export function SoftTable({ children, ...props }) {
  return (
    <Table
      sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid #e3e3e7',
        },
      }}
      {...props}
    >
      {children}
    </Table>
  )
}

export function SoftTableHead({ children, ...props }) {
  return (
    <TableHead
      sx={{
        '& .MuiTableCell-root': {
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#52525b',
          padding: '0.75rem 1rem',
          backgroundColor: 'transparent',
        },
      }}
      {...props}
    >
      {children}
    </TableHead>
  )
}

export function SoftTableBody({ children, ...props }) {
  return (
    <TableBody
      sx={{
        '& .MuiTableRow-root': {
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: '#f4f4f5',
          },
        },
        '& .MuiTableCell-root': {
          padding: '1rem',
          color: '#3f3f46',
          fontSize: '0.875rem',
        },
      }}
      {...props}
    >
      {children}
    </TableBody>
  )
}

export function SoftTableRow({ children, selected, ...props }) {
  return (
    <TableRow
      sx={{
        ...(selected && {
          backgroundColor: alpha('#f97316', 0.08),
          '&:hover': {
            backgroundColor: alpha('#f97316', 0.12),
          },
        }),
      }}
      {...props}
    >
      {children}
    </TableRow>
  )
}

export function SoftTableCell({ children, ...props }) {
  return <TableCell {...props}>{children}</TableCell>
}

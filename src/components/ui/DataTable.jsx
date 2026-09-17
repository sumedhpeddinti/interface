import { classNames } from '../../lib/format'

export function TableWrap({ className, children }) {
  return (
    <div className={classNames('hairline-scroll w-full overflow-x-auto', className)}>{children}</div>
  )
}

export function Table({ className, children }) {
  return (
    <table className={classNames('w-full border-collapse text-left text-sm', className)}>
      {children}
    </table>
  )
}

export function THead({ children, className }) {
  return (
    <thead className={classNames('border-b border-zinc-200 bg-zinc-50/70', className)}>
      {children}
    </thead>
  )
}

export function TBody({ children, className }) {
  return <tbody className={classNames('divide-y divide-zinc-200', className)}>{children}</tbody>
}

export function TR({ children, className, onClick, selected, ...rest }) {
  return (
    <tr
      onClick={onClick}
      className={classNames(
        onClick && 'cursor-pointer',
        'transition-colors hover:bg-zinc-50/80',
        selected && 'bg-zinc-50',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  )
}

export function TH({ children, className, align = 'left', width }) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={classNames(
        'px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function TD({ children, className, align = 'left', mono, muted, ...rest }) {
  return (
    <td
      className={classNames(
        'px-4 py-3 align-middle text-zinc-900',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'tnum',
        muted && 'text-zinc-500',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  )
}

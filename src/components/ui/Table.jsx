import { cn } from "../../lib/cn.js";

/*
 * Tabel data seragam.
 *   <TableWrap label="Daftar stok"><Table>...<Thead><tr><Th>..</Th></tr></Thead><tbody>...</tbody></Table></TableWrap>
 */
export function TableWrap({ label, className, children }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "scrollbar-thin overflow-x-auto rounded-xl border border-border bg-surface focus-visible:outline-primary-bright",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Table({ className, children, caption }) {
  return (
    <table className={cn("tabular w-full border-collapse text-sm", className)}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  );
}

export function Thead({ className, children }) {
  return <thead className={cn("bg-surface-2 text-xs uppercase tracking-wide text-muted", className)}>{children}</thead>;
}

export function Th({ className, align = "left", children, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border px-3 py-2.5 font-semibold",
        align === "center" && "text-center",
        align === "right" && "text-right",
        align === "left" && "text-left",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, align = "left", children, ...props }) {
  return (
    <td
      className={cn(
        "border-b border-border-soft px-3 py-2.5 align-middle text-fg",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function Tr({ className, children, ...props }) {
  return (
    <tr className={cn("transition-colors hover:bg-primary-soft/60", className)} {...props}>
      {children}
    </tr>
  );
}

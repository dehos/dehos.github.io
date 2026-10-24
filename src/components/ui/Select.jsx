import { Select as RadixSelect } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn.js";

// Radix Select tidak mengizinkan item dengan value "" sehingga dipetakan ke penanda internal.
const KOSONG = "__kosong__";
const keDalam = (value) => (value === "" || value == null ? KOSONG : String(value));
const keLuar = (value) => (value === KOSONG ? "" : value);

/**
 * Select ringkas.
 * options: [{ value, label, disabled? }]. Opsi dengan value "" dianggap "tidak ada pilihan".
 * Bila value "" tidak ada di options, placeholder ditampilkan.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Pilih…",
  disabled,
  className,
  triggerClassName,
  id,
  name,
  required,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid
}) {
  const adaOpsiKosong = options.some((option) => option.value === "");
  const nilai = keDalam(value);
  const tampilkanPlaceholder = nilai === KOSONG && !adaOpsiKosong;

  return (
    <RadixSelect.Root
      value={tampilkanPlaceholder ? undefined : nilai}
      onValueChange={(next) => onValueChange?.(keLuar(next))}
      disabled={disabled}
      name={name}
      required={required}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className={cn(
          "inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm text-fg",
          "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft",
          "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted data-[placeholder]:text-muted/80",
          "aria-[invalid=true]:border-danger",
          className,
          triggerClassName
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="animate-menu-in z-[70] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-pop"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={String(option.value)}
                value={keDalam(option.value)}
                disabled={option.disabled}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-fg outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-primary-soft data-[disabled]:opacity-50"
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

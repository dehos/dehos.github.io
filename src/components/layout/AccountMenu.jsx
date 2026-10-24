import { DropdownMenu } from "radix-ui";
import { Check, KeyRound, LogOut, Menu, Palette } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { cn } from "../../lib/cn.js";

const itemClass =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-fg outline-none data-[highlighted]:bg-primary-soft";

export function AccountMenu({ onChangePassword, onSignOut }) {
  const { theme, setTheme, themes } = useTheme();
  const aktif = themes.find((item) => item.id === theme);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Buka menu akun"
          className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-fg-soft transition-colors hover:bg-primary-soft data-[state=open]:bg-primary-soft"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="animate-menu-in z-[70] min-w-[220px] rounded-xl border border-border bg-surface p-1.5 shadow-pop"
        >
          <DropdownMenu.Item className={itemClass} onSelect={onChangePassword}>
            <KeyRound className="size-4 text-muted" aria-hidden="true" />
            Ubah password
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={cn(itemClass, "justify-between data-[state=open]:bg-primary-soft")}>
              <span className="inline-flex items-center gap-2.5">
                <Palette className="size-4 text-muted" aria-hidden="true" />
                Tema
              </span>
              <span className="text-xs font-semibold text-muted">{aktif?.label}</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                alignOffset={-6}
                className="animate-menu-in z-[70] min-w-[170px] rounded-xl border border-border bg-surface p-1.5 shadow-pop"
              >
                <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
                  {themes.map((item) => (
                    <DropdownMenu.RadioItem key={item.id} value={item.id} className={cn(itemClass, "justify-between")}>
                      <span className="inline-flex items-center gap-2.5">
                        <span
                          className="size-3.5 rounded-full border border-black/10"
                          style={{ background: item.swatch }}
                          aria-hidden="true"
                        />
                        {item.label}
                      </span>
                      <DropdownMenu.ItemIndicator>
                        <Check className="size-4 text-primary" aria-hidden="true" />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border-soft" />
          <DropdownMenu.Item className={cn(itemClass, "text-danger data-[highlighted]:bg-danger-soft")} onSelect={onSignOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

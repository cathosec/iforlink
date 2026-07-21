import { useState } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_GROUPS,
  CategoryIcon,
  DEFAULT_CATEGORY_ICON,
} from "@/lib/category-icons";
import { Check } from "lucide-react";

export function CategoryIconPicker({
  value,
  onChange,
  triggerClassName,
  size = "md",
}: {
  value: string | null | undefined;
  onChange: (key: string) => void;
  triggerClassName?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = value || DEFAULT_CATEGORY_ICON;

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const query = q.trim().toLowerCase();
  const filtered = query
    ? CATEGORY_ICONS.filter(
        (i) =>
          i.label.toLowerCase().includes(query) ||
          i.key.toLowerCase().includes(query),
      )
    : CATEGORY_ICONS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Escolher ícone da categoria"
          className={cn(
            "grid shrink-0 place-items-center rounded-md border bg-accent/40 text-brand transition-colors hover:bg-accent",
            dim,
            triggerClassName,
          )}
        >
          <CategoryIcon name={current} className={iconDim} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="mb-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ícone..."
            className="h-9"
            autoFocus
          />
        </div>
        <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
          {query ? (
            <IconGrid
              icons={filtered}
              current={current}
              onPick={(k) => {
                onChange(k);
                setOpen(false);
              }}
            />
          ) : (
            CATEGORY_ICON_GROUPS.map((group) => {
              const items = filtered.filter((i) => i.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  <IconGrid
                    icons={items}
                    current={current}
                    onPick={(k) => {
                      onChange(k);
                      setOpen(false);
                    }}
                  />
                </div>
              );
            })
          )}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhum ícone encontrado.
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2">
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} ícones
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              onChange(DEFAULT_CATEGORY_ICON);
              setOpen(false);
            }}
          >
            Padrão
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IconGrid({
  icons,
  current,
  onPick,
}: {
  icons: typeof CATEGORY_ICONS;
  current: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {icons.map((i) => {
        const active = i.key === current;
        const Icon = i.icon;
        return (
          <button
            key={i.key}
            type="button"
            title={i.label}
            aria-label={i.label}
            onClick={() => onPick(i.key)}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-md border text-foreground/80 transition-colors hover:border-brand hover:bg-accent hover:text-brand",
              active
                ? "border-brand bg-brand/10 text-brand"
                : "border-transparent",
            )}
          >
            <Icon className="h-4 w-4" />
            {active && (
              <Check className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-brand p-0.5 text-brand-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}

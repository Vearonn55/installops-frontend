import { Search, Filter, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DateRangeFilter } from "../filters/DateRangeFilter";
import { cn } from "../../lib/utils";

type FilterOption = { value: string; label: string };

type Props = {
  q: string;
  onQChange: (value: string) => void;
  status: "all" | "pending" | "confirmed" | "cancelled";
  onStatusChange: (value: "all" | "pending" | "confirmed" | "cancelled") => void;
  store: string;
  onStoreChange: (value: string) => void;
  storeOptions: FilterOption[];
  storeDisabled?: boolean;
  showStatusFilter: boolean;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  showNetsisDateHint?: boolean;
  netsisDateFilterActive?: boolean;
};

function FilterSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  icon: typeof Search;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs text-gray-600">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          className={cn("input-select-with-icon w-full", disabled && "opacity-60")}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function OrdersFilters({
  q,
  onQChange,
  status,
  onStatusChange,
  store,
  onStoreChange,
  storeOptions,
  storeDisabled,
  showStatusFilter,
  from,
  to,
  onFromChange,
  onToChange,
  showNetsisDateHint,
  netsisDateFilterActive,
}: Props) {
  const { t } = useTranslation("common");

  return (
    <div className="filter-panel space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
        <div className="min-w-0 md:col-span-2">
          <label className="mb-1 block text-xs text-gray-600">
            {t("ordersPage.filters.searchLabel")}
          </label>
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input-search-field w-full"
              placeholder={t("ordersPage.filters.searchPlaceholder")}
              value={q}
              onChange={(e) => onQChange(e.target.value)}
            />
          </div>
        </div>

        {showStatusFilter ? (
          <FilterSelect
            label={t("ordersPage.filters.statusLabel")}
            icon={Filter}
            value={status}
            onChange={(v) => onStatusChange(v as Props["status"])}
            options={[
              { value: "all", label: t("ordersPage.filters.status.all") },
              { value: "pending", label: t("ordersPage.filters.status.pending") },
              { value: "confirmed", label: t("ordersPage.filters.status.confirmed") },
              { value: "cancelled", label: t("ordersPage.filters.status.cancelled") },
            ]}
          />
        ) : (
          <div className="hidden min-w-0 md:block" aria-hidden />
        )}

        <FilterSelect
          label={t("ordersPage.filters.storeLabel")}
          icon={Store}
          value={store}
          onChange={onStoreChange}
          options={storeOptions}
          disabled={storeDisabled}
        />
      </div>

      <div>
        <DateRangeFilter
          from={from}
          to={to}
          fromLabel={t("ordersPage.filters.from")}
          toLabel={t("ordersPage.filters.to")}
          onFromChange={onFromChange}
          onToChange={onToChange}
        />
        {showNetsisDateHint ? (
          <p className="mt-2 text-xs text-gray-500">
            {netsisDateFilterActive
              ? t("ordersPage.filters.netsisDateActive")
              : t("ordersPage.filters.netsisDateHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

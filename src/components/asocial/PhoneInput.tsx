import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, DEFAULT_DIAL, splitPhone, toE164 } from "@/lib/phone";

/**
 * Country selector + local number. Emits an E.164 string (e.g. +51987654321).
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = "987 654 321",
  id,
}: {
  value: string;
  onChange: (e164: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const parts = useMemo(() => splitPhone(value), [value]);
  const dial = parts.dial || DEFAULT_DIAL;

  return (
    <div className="flex gap-2">
      <Select value={dial} onValueChange={(d) => onChange(toE164(d, parts.local))}>
        <SelectTrigger className="w-28 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.dial}>
              {c.dial} {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder}
        value={parts.local}
        onChange={(e) => onChange(toE164(dial, e.target.value))}
      />
    </div>
  );
}

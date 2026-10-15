'use client';

import { Badge } from '@/components/ui/badge';

// label shown on the chip -> value matched against Property.provider ('All' = no filter)
const PROVIDER_GROUPS = [
{ label: 'All', value: 'All' },
{ label: 'Unite Students', value: 'Unite' },
{ label: 'iQ Student', value: 'iQ' },
{ label: 'Chapter', value: 'Chapter' },
{ label: 'Scape', value: 'Scape' },
{ label: 'Prestige', value: 'Prestige' },
{ label: 'UCL Halls', value: 'UCL' },
{ label: 'KCL Halls', value: 'KCL' },
{ label: 'Imperial Halls', value: 'Imperial' },
{ label: 'QMUL Halls', value: 'QMUL' },
{ label: 'LSE Halls', value: 'LSE' },
{ label: 'Goldsmiths Halls', value: 'Goldsmiths' },
{ label: 'UEL Halls', value: 'UEL' },
{ label: 'Greenwich Halls', value: 'Greenwich' },
{ label: 'Westminster Halls', value: 'Westminster' },
{ label: 'Middlesex Halls', value: 'Middlesex' },
{ label: "St Mary's Halls", value: "St Mary's" },
{ label: 'Mezzino', value: 'Mezzino' },
{ label: 'Urbanest', value: 'Urbanest' },
{ label: 'Stay Club', value: 'Stay Club' },
{ label: 'Other', value: 'Other' },
];

interface GroupChipsProps {
selected: string;
onSelect: (group: string) => void;
/** Providers that have halls; chips for the others (e.g. Prestige, 0 halls) are hidden. */
available?: string[];
}

export function GroupChips({ selected, onSelect, available }: GroupChipsProps) {
const groups = available?.length
  ? PROVIDER_GROUPS.filter(({ value }) => value === 'All' || value === selected || available.includes(value))
  : PROVIDER_GROUPS;
return (
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-4">
  {groups.map(({ label, value }) => {
    const isSelected = selected === value;
    return (
      <Badge
        key={value}
        variant={isSelected ? 'default' : 'outline'}
        className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors"
        onClick={() => onSelect(value)}
      >
        {label}
      </Badge>
    );
  })}
</div>
);
}

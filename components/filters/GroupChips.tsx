'use client';

import { Badge } from '@/components/ui/badge';

const PROVIDER_GROUPS = [
'All',
'Unite Students',
'iQ Student',
'Chapter',
'Scape',
'Prestige',
'UCL Halls',
'KCL Halls',
'Imperial Halls',
];

interface GroupChipsProps {
selected: string;
onSelect: (group: string) => void;
}

export function GroupChips({ selected, onSelect }: GroupChipsProps) {
return (
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-4">
  {PROVIDER_GROUPS.map((group) => {
    const isSelected = selected === group;
    return (
      <Badge
        key={group}
        variant={isSelected ? 'default' : 'outline'}
        className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs font-medium transition-colors"
        onClick={() => onSelect(group)}
      >
        {group}
      </Badge>
    );
  })}
</div>
);
}

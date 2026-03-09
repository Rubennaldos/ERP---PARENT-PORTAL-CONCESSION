import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface MenuFieldOptionSelectorProps {
  fieldLabel: string;
  icon?: string;
  defaultValue: string;
  alternatives: string[];
  selectedValue: string | null;
  onChange: (value: string | null) => void;
  compact?: boolean;
}

export const MenuFieldOptionSelector = ({
  fieldLabel,
  icon,
  defaultValue,
  alternatives,
  selectedValue,
  onChange,
  compact = false,
}: MenuFieldOptionSelectorProps) => {
  if (!defaultValue) return null;

  const hasAlternatives = alternatives && alternatives.length > 0;
  const currentValue = selectedValue || defaultValue;

  if (!hasAlternatives) {
    return (
      <div className={compact ? 'text-xs' : 'text-sm'}>
        <p className={`font-medium text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {icon} {fieldLabel}
        </p>
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>
          {defaultValue}
        </p>
      </div>
    );
  }

  const allOptions = [defaultValue, ...alternatives];

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <p className={`font-medium text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {icon} {fieldLabel}
      </p>
      <RadioGroup
        value={currentValue}
        onValueChange={(val) => onChange(val === defaultValue ? null : val)}
        className="space-y-1"
      >
        {allOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <RadioGroupItem
              value={option}
              id={`${fieldLabel}-${index}`}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor={`${fieldLabel}-${index}`}
              className={`cursor-pointer ${compact ? 'text-xs' : 'text-sm'} ${
                currentValue === option ? 'font-semibold text-gray-900' : 'text-gray-600'
              }`}
            >
              {option}
              {index === 0 && (
                <Badge className="ml-1.5 text-[9px] h-3.5 px-1 bg-green-100 text-green-700 border-green-300">
                  predeterminado
                </Badge>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export const getDisplayValue = (
  chosenValue: string | null | undefined,
  menuDefault: string | null | undefined
): string => {
  return chosenValue || menuDefault || '—';
};

export const hasAnyAlternatives = (menu: {
  starter_alternatives?: string[];
  main_course_alternatives?: string[];
  beverage_alternatives?: string[];
  dessert_alternatives?: string[];
} | null): boolean => {
  if (!menu) return false;
  return (
    (menu.starter_alternatives?.length ?? 0) > 0 ||
    (menu.main_course_alternatives?.length ?? 0) > 0 ||
    (menu.beverage_alternatives?.length ?? 0) > 0 ||
    (menu.dessert_alternatives?.length ?? 0) > 0
  );
};

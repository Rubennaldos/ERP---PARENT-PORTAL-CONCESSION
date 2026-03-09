import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface MenuAlternativesEditorProps {
  label: string;
  icon?: string;
  alternatives: string[];
  onChange: (alternatives: string[]) => void;
  placeholder?: string;
  defaultValue?: string;
}

export const MenuAlternativesEditor = ({
  label,
  icon,
  alternatives,
  onChange,
  placeholder = 'Agregar opción...',
  defaultValue,
}: MenuAlternativesEditorProps) => {
  const [newOption, setNewOption] = useState('');
  const [isOpen, setIsOpen] = useState(alternatives.length > 0);

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === defaultValue?.toLowerCase()) return;
    if (alternatives.some(a => a.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...alternatives, trimmed]);
    setNewOption('');
  };

  const removeOption = (index: number) => {
    onChange(alternatives.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {icon} Opciones adicionales de {label.toLowerCase()}
        {alternatives.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {alternatives.length}
          </Badge>
        )}
      </button>

      {isOpen && (
        <div className="pl-2 border-l-2 border-blue-200 space-y-2">
          {defaultValue && (
            <div className="flex items-center gap-1.5">
              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                Predeterminado
              </Badge>
              <span className="text-xs text-gray-600">{defaultValue}</span>
            </div>
          )}

          {alternatives.map((alt, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                Opción {index + 2}
              </Badge>
              <span className="text-xs text-gray-600 flex-1">{alt}</span>
              <button
                type="button"
                onClick={() => removeOption(index)}
                className="text-red-400 hover:text-red-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="h-7 text-xs flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addOption}
              disabled={!newOption.trim()}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

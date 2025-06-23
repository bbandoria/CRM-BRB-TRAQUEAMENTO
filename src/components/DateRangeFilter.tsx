
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetSelect: (preset: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetSelect
}) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const presets = [
    { label: 'Últimos 7 dias', value: '7days' },
    { label: 'Últimos 14 dias', value: '14days' },
    { label: 'Últimos 28 dias', value: '28days' },
    { label: 'Este mês', value: 'thismonth' },
    { label: 'Limpar', value: 'clear' }
  ];

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      // Corrigir timezone: usar apenas a data local sem conversão UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      onStartDateChange(localDateString);
      setStartOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      // Corrigir timezone: usar apenas a data local sem conversão UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      onEndDateChange(localDateString);
      setEndOpen(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <div className="flex gap-2 items-center">
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-36 justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
              onSelect={handleStartDateSelect}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-sm text-muted-foreground">até</span>
        
        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-36 justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate ? new Date(endDate + 'T00:00:00') : undefined}
              onSelect={handleEndDateSelect}
              initialFocus
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex gap-1 flex-wrap">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant="outline"
            size="sm"
            onClick={() => onPresetSelect(preset.value)}
            className="text-xs h-8"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

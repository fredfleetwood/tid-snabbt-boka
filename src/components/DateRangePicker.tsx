
import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { FormItem, FormMessage } from '@/components/ui/form';
import { CalendarDays, Plus, X } from 'lucide-react';
import { format, isAfter, isBefore, addMonths, startOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange[];
  onChange: (ranges: DateRange[]) => void;
  error?: string;
}

const DateRangePicker = ({ value, onChange, error }: DateRangePickerProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({});

  const today = startOfDay(new Date());
  const maxDate = addMonths(today, 6);

  const addNewRange = () => {
    setEditingIndex(value.length);
    setTempRange({});
  };

  const removeRange = (index: number) => {
    const newRanges = value.filter((_, i) => i !== index);
    onChange(newRanges);
  };

  const saveRange = () => {
    if (tempRange.from && tempRange.to && editingIndex !== null) {
      const newRanges = [...value];
      if (editingIndex === value.length) {
        newRanges.push({ from: tempRange.from, to: tempRange.to });
      } else {
        newRanges[editingIndex] = { from: tempRange.from, to: tempRange.to };
      }
      onChange(newRanges);
      setEditingIndex(null);
      setTempRange({});
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempRange({});
  };

  const validateDateRange = (from?: Date, to?: Date): string | null => {
    if (!from || !to) return null;
    
    if (isBefore(from, today)) {
      return "Historiska datum är inte tillåtna";
    }
    
    if (!isAfter(to, from)) {
      return "Startdatum måste vara före slutdatum";
    }
    
    if (isAfter(from, maxDate) || isAfter(to, maxDate)) {
      return "Datum kan inte vara mer än 6 månader framåt";
    }
    
    return null;
  };

  const rangeError = tempRange.from && tempRange.to ? validateDateRange(tempRange.from, tempRange.to) : null;

  return (
    <FormItem>
      <Label className="text-sm font-medium">
        Datumperioder <span className="text-red-500">*</span>
      </Label>
      
      <div className="space-y-3">
        {value.map((range, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <span className="text-sm font-medium">
              {format(range.from, 'd MMM yyyy', { locale: sv })} - {format(range.to, 'd MMM yyyy', { locale: sv })}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingIndex(index);
                  setTempRange({ from: range.from, to: range.to });
                }}
              >
                Redigera
              </Button>
              {value.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRange(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {editingIndex !== null && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Label className="text-xs text-gray-600 mb-2 block">Startdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {tempRange.from ? format(tempRange.from, 'd MMM yyyy', { locale: sv }) : 'Välj startdatum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempRange.from}
                      onSelect={(date) => setTempRange({ ...tempRange, from: date })}
                      disabled={(date) => isBefore(date, today) || isAfter(date, maxDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <Label className="text-xs text-gray-600 mb-2 block">Slutdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {tempRange.to ? format(tempRange.to, 'd MMM yyyy', { locale: sv }) : 'Välj slutdatum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tempRange.to}
                      onSelect={(date) => setTempRange({ ...tempRange, to: date })}
                      disabled={(date) => 
                        isBefore(date, tempRange.from || today) || 
                        isAfter(date, maxDate)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {rangeError && (
              <p className="text-sm text-red-600 mb-3">{rangeError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={saveRange}
                disabled={!tempRange.from || !tempRange.to || !!rangeError}
                size="sm"
              >
                Spara period
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                size="sm"
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addNewRange}
          className="w-full"
          disabled={editingIndex !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          Lägg till period
        </Button>
      </div>

      {error && (
        <FormMessage className="text-sm text-red-600 mt-1">
          {error}
        </FormMessage>
      )}
    </FormItem>
  );
};

export default DateRangePicker;


import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown, X } from 'lucide-react';

const SWEDISH_CITIES = [
  'Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping', 'Örebro', 
  'Västerås', 'Norrköping', 'Helsingborg', 'Jönköping', 'Umeå', 'Lund', 
  'Borås', 'Sundsvall', 'Gävle', 'Eskilstuna', 'Karlstad', 'Växjö', 
  'Halmstad', 'Trollhättan', 'Falun', 'Skövde', 'Uddevalla', 'Östersund'
].sort();

interface LocationSelectorProps {
  value: string[];
  onChange: (locations: string[]) => void;
  error?: string;
}

const LocationSelector = ({ value, onChange, error }: LocationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = useMemo(() => {
    return SWEDISH_CITIES.filter(city =>
      city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const toggleLocation = (location: string) => {
    if (value.includes(location)) {
      onChange(value.filter(l => l !== location));
    } else {
      onChange([...value, location]);
    }
  };

  const removeLocation = (location: string) => {
    onChange(value.filter(l => l !== location));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <FormItem>
      <Label className="text-sm font-medium">
        Provplatser <span className="text-red-500">*</span>
      </Label>
      
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-left h-auto min-h-10"
            >
              <span className="truncate">
                {value.length === 0 
                  ? "Välj provplatser..." 
                  : `${value.length} plats${value.length !== 1 ? 'er' : ''} vald${value.length !== 1 ? 'a' : ''}`
                }
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sök provplatser..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {filteredCities.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  Inga platser hittades
                </div>
              ) : (
                <div className="p-2">
                  {filteredCities.map((city) => (
                    <div
                      key={city}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => toggleLocation(city)}
                    >
                      <Checkbox
                        checked={value.includes(city)}
                        onChange={() => {}} // Controlled by parent click
                      />
                      <label className="text-sm cursor-pointer flex-1">
                        {city}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {value.length > 0 && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="w-full"
                >
                  Rensa alla
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 min-h-12">
            {value.map((location) => (
              <Badge
                key={location}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                {location}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-gray-300"
                  onClick={() => removeLocation(location)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <FormMessage className="text-sm text-red-600 mt-1">
          {error}
        </FormMessage>
      )}
    </FormItem>
  );
};

export default LocationSelector;

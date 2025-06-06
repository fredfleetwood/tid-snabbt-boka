
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PersonnummerInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  isPrivacyMode?: boolean;
}

const PersonnummerInput = ({ value, onChange, error, isPrivacyMode = false }: PersonnummerInputProps) => {
  const [showValue, setShowValue] = useState(!isPrivacyMode);

  const validatePersonnummer = (input: string): boolean => {
    const regex = /^\d{8}-\d{4}$/;
    return regex.test(input);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove any non-digit characters except dash
    inputValue = inputValue.replace(/[^\d-]/g, '');
    
    // Auto-format: add dash after 8 digits if not present
    if (inputValue.length === 8 && !inputValue.includes('-')) {
      inputValue = inputValue + '-';
    }
    
    // Limit length to 13 characters (YYYYMMDD-XXXX)
    if (inputValue.length <= 13) {
      onChange(inputValue);
    }
  };

  const maskPersonnummer = (personnummer: string): string => {
    if (personnummer.length >= 13) {
      return personnummer.substring(0, 6) + 'XX-XXXX';
    }
    return 'XXXXXX-XXXX';
  };

  return (
    <FormItem>
      <Label htmlFor="personnummer" className="text-sm font-medium">
        Personnummer <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <FormControl>
          <Input
            id="personnummer"
            type="text"
            placeholder="19900101-1234 (används för BankID-inloggning)"
            value={showValue ? value : maskPersonnummer(value)}
            onChange={handleChange}
            className={`pr-10 ${error ? 'border-red-500' : ''}`}
            aria-describedby="personnummer-help personnummer-error"
          />
        </FormControl>
        {isPrivacyMode && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setShowValue(!showValue)}
            title={showValue ? "Dölj personnummer" : "Visa personnummer"}
          >
            {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <p id="personnummer-help" className="text-xs text-gray-600 mt-1">
        Ditt personnummer används för säker inloggning via BankID
      </p>
      {error && (
        <FormMessage id="personnummer-error" className="text-sm text-red-600 mt-1">
          {error}
        </FormMessage>
      )}
    </FormItem>
  );
};

export default PersonnummerInput;

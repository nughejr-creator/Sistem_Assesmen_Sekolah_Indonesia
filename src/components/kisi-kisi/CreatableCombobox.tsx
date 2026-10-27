import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Sparkles } from 'lucide-react';

interface CreatableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
}

export const CreatableCombobox: React.FC<CreatableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Pilih preset konteks atau ketik baru...',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filtered options based on search term
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExisting = options.some(opt => opt.toLowerCase() === searchTerm.trim().toLowerCase());
  const canCreate = searchTerm.trim().length > 0 && !isExisting;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger & Search Input */}
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setSearchTerm(value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto text-xs py-1 animate-fade-in">
          
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Daftar Preset Konteks Standar</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>

          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setSearchTerm(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-brand-50 transition-colors ${
                  value === opt ? 'bg-brand-50 font-bold text-brand-700' : 'text-slate-700'
                }`}
              >
                <span>{opt}</span>
                {value === opt && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 ml-2" />}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-400 italic">
              Tidak ada preset yang cocok.
            </div>
          )}

          {/* Creatable Option */}
          {canCreate && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange(searchTerm.trim());
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Gunakan Konteks Khusus: "{searchTerm.trim()}"</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

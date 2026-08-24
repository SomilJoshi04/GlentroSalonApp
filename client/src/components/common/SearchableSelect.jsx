import { useState, useRef, useEffect } from 'react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative w-full sm:max-w-xs ${className}`} ref={dropdownRef}>
      <div 
        className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface cursor-pointer flex items-center justify-between shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="material-symbols-outlined shrink-0 text-muted-text text-[20px] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
          expand_more
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface rounded-xl border border-border shadow-lg overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-border bg-surface sticky top-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[18px]">
                search
              </span>
              <input 
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between
                    ${opt.value === value 
                      ? 'bg-soft-primary text-primary font-medium' 
                      : 'text-on-surface hover:bg-surface-variant'
                    }`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && (
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-text">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

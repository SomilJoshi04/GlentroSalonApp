import { useState, useRef, useEffect } from 'react';
import { useBranch } from '../../../context/BranchContext';

const BranchSwitcher = () => {
  const { salons, selectedSalon, setSelectedSalon, loadingBranches } = useBranch();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (salon) => {
    setSelectedSalon(salon);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (loadingBranches) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-variant animate-pulse">
        <div className="w-4 h-4 bg-border rounded-full" />
        <div className="w-24 h-4 bg-border rounded" />
      </div>
    );
  }

  // Active label
  const activeLabel = selectedSalon ? selectedSalon.name : 'All Branches';

  const filteredSalons = salons.filter(salon => 
    salon.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    salon.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-variant hover:bg-surface-variant/80 transition-colors border border-border"
      >
        <span className="material-symbols-outlined text-primary text-[18px]">storefront</span>
        <span className="text-[13px] font-medium text-on-surface max-w-[120px] truncate">
          {activeLabel}
        </span>
        <span className={`material-symbols-outlined text-[18px] text-muted-text transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
          <div className="px-3 py-2 border-b border-border bg-surface-variant/50">
            <p className="text-[11px] font-semibold text-muted-text uppercase tracking-wider mb-2">Select Branch</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-muted-text">search</span>
              <input 
                type="text" 
                placeholder="Search branches..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-surface rounded-md border border-border focus:outline-none focus:border-primary text-on-surface"
              />
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {/* "All Branches" Option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                selectedSalon === null 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-on-surface hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] opacity-70">apps</span>
              <span className="text-[13px] font-medium flex-1">All Branches</span>
              {selectedSalon === null && (
                <span className="material-symbols-outlined text-[16px]">check</span>
              )}
            </button>

            {/* List of Salons */}
            {filteredSalons.map((salon) => (
              <button
                key={salon._id}
                onClick={() => handleSelect(salon)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  selectedSalon?._id === salon._id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-on-surface hover:bg-surface-variant'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-surface-variant flex items-center justify-center shrink-0 border border-border">
                  <span className="material-symbols-outlined text-[14px] opacity-70">store</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-medium truncate">{salon.name}</span>
                  <span className="text-[10px] text-muted-text truncate">{salon.city}</span>
                </div>
                {selectedSalon?._id === salon._id && (
                  <span className="material-symbols-outlined text-[16px] ml-auto">check</span>
                )}
              </button>
            ))}
            
            {filteredSalons.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-muted-text">
                No branches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;

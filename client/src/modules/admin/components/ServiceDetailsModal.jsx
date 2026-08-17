import StatusBadge from './StatusBadge';

const ServiceDetailsModal = ({ service, onClose }) => {
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-dark-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header Image */}
        <div className="relative h-48 bg-surface-variant flex items-center justify-center overflow-hidden shrink-0">
          {service.image ? (
            <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[64px] text-muted-text">cut</span>
          )}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white text-dark-900 shadow-md border border-border hover:bg-surface-variant transition-colors z-10"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline-md text-[24px] text-on-surface">{service.name}</h2>
              <StatusBadge status={service.isActive ? 'Active' : 'Inactive'} />
            </div>
            {service.description && (
              <p className="font-body-md text-[14px] text-muted-text">{service.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background-alt rounded-2xl border border-border">
              <span className="material-symbols-outlined text-primary mb-2">payments</span>
              <p className="font-label-sm text-[12px] text-muted-text uppercase tracking-wider">Price</p>
              <p className="font-headline-sm text-[18px] text-on-surface">₹{service.price}</p>
            </div>
            <div className="p-4 bg-background-alt rounded-2xl border border-border">
              <span className="material-symbols-outlined text-primary mb-2">schedule</span>
              <p className="font-label-sm text-[12px] text-muted-text uppercase tracking-wider">Duration</p>
              <p className="font-headline-sm text-[18px] text-on-surface">{service.duration} mins</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="font-body-sm text-[14px] text-muted-text">Target Gender</span>
              <span className="font-headline-sm text-[14px] text-on-surface capitalize">{service.gender}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="font-body-sm text-[14px] text-muted-text">Category</span>
              <div className="text-right">
                <span className="font-headline-sm text-[14px] text-on-surface block">{service.category?.name || 'Uncategorized'}</span>
                {service.subcategory && (
                  <span className="font-label-sm text-[12px] text-muted-text">{service.subcategory.name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="font-body-sm text-[14px] text-muted-text">Offered By Salon</span>
              <div className="text-right">
                <span className="font-headline-sm text-[14px] text-on-surface block">{service.salon?.name || 'Unknown Salon'}</span>
                <span className="font-label-sm text-[12px] text-muted-text">{service.salon?.city || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsModal;

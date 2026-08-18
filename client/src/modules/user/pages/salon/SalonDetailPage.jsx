import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSalonById } from '../../services/userApi';
import { goBack } from '../../../../utils/navigation';
import Loader from '../../../../components/common/Loader';
import { getImageUrl } from '../../../../utils/imageUtils';

const SalonDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => { loadSalon(); }, [id]);

  const loadSalon = async () => {
    try {
      const res = await getSalonById(id);
      const { salon: s, services: svc, staff: st } = res.data.data;
      setSalon(s); setServices(svc); setStaff(st);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === service._id) ? prev.filter(s => s._id !== service._id) : [...prev, service]
    );
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  if (loading) return <Loader text="Loading salon details..." />;
  if (!salon) return <div className="text-center py-20 bg-background min-h-screen pt-32"><h2 className="text-[20px] font-semibold text-on-surface">Salon not found</h2></div>;

  return (
    <div className="bg-background text-on-background font-body-md antialiased overflow-x-hidden min-h-screen">
      {/* Main Container */}
      <main className="relative w-full max-w-[480px] md:max-w-[768px] mx-auto bg-background pb-[100px] shadow-2xl min-h-screen">
        {/* Hero Section */}
        <section className="relative h-[320px] w-full bg-surface-variant">
          <img 
            src={salon.images?.[0] ? getImageUrl(salon.images[0]) : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80"} 
            alt={salon.name} 
            className="object-cover w-full h-full" 
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/10"></div>
          {/* Floating Actions */}
          <div className="absolute top-[max(1.5rem,env(safe-area-inset-top))] left-4 right-4 flex justify-between items-center z-10">
            <button onClick={() => goBack(navigate, '/salons')} className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm flex items-center justify-center shadow-sm text-on-surface hover:bg-surface transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm flex items-center justify-center shadow-sm text-on-surface hover:text-error transition-colors">
                <span className="material-symbols-outlined">favorite_border</span>
              </button>
            </div>
          </div>
        </section>

        {/* Content Canvas (Overlapping Hero) */}
        <div className="relative -mt-10 bg-background rounded-t-[32px] pt-8 px-4 flex flex-col gap-8 z-20">
          {/* Salon Header */}
          <header className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-border shadow-sm flex-shrink-0 bg-white flex items-center justify-center font-headline-md text-primary text-[24px]">
                  {salon.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <h1 className="font-headline-lg-mobile text-[24px] font-bold text-on-surface">{salon.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center text-rating">
                      <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      <span className="font-label-sm text-[12px] ml-1 text-on-surface">{salon.ratings?.average > 0 ? salon.ratings.average.toFixed(1) : 'New'}</span>
                    </div>
                    <span className="text-outline text-[12px]">•</span>
                    <span className="font-body-sm text-[14px] text-muted-text">{salon.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="w-full border-b border-border">
            <div className="flex overflow-x-auto hide-scrollbar gap-6 pb-4">
              {['services', 'about', 'staff', 'reviews'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative font-label-md text-[14px] whitespace-nowrap transition-colors capitalize ${activeTab === tab ? 'text-primary' : 'text-muted-text hover:text-primary'}`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content: Services */}
          {activeTab === 'services' && (
            <section className="animate-fade-in space-y-4">
              {services.length === 0 ? <p className="text-center text-muted-text py-8">No services available</p> : 
                services.map(service => {
                  const isSelected = selectedServices.some(s => s._id === service._id);
                  return (
                    <div key={service._id} className="flex justify-between items-center p-4 rounded-xl bg-surface border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => toggleService(service)}>
                      <div className="flex flex-col flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-headline-sm text-[18px] font-semibold text-on-surface">{service.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-surface-variant text-primary">{service.gender}</span>
                        </div>
                        <p className="font-body-sm text-[14px] text-muted-text mb-2 line-clamp-2">{service.category?.name || 'General'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-label-md text-[14px] text-primary font-bold">₹{service.price}</span>
                          <span className="text-outline text-[12px]">•</span>
                          <span className="font-body-sm text-[14px] text-muted-text flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span> {service.duration} min
                          </span>
                        </div>
                      </div>
                      <button 
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm ${isSelected ? 'bg-primary text-white' : 'bg-soft-primary text-primary hover:bg-primary hover:text-white'}`}
                      >
                        <span className="material-symbols-outlined">{isSelected ? 'check' : 'add'}</span>
                      </button>
                    </div>
                  )
                })
              }
            </section>
          )}

          {/* Tab Content: About */}
          {activeTab === 'about' && (
            <section className="animate-fade-in flex-col gap-6 flex">
              <div>
                <h3 className="font-headline-sm text-[20px] font-semibold text-on-surface mb-2">About Us</h3>
                <p className="font-body-sm text-[14px] text-muted-text leading-relaxed">
                  {salon.description || "Welcome to our premium salon. We specialize in personalized styling, advanced color techniques, and restorative treatments designed to elevate your natural essence in a serene, luxurious environment."}
                </p>
              </div>
              <hr className="border-border"/>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                <div>
                  <h4 className="font-label-md text-[14px] font-bold text-on-surface">Location</h4>
                  <p className="font-body-sm text-[14px] text-muted-text mt-1">{salon.address}, {salon.city}</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-primary mt-1">schedule</span>
                <div className="w-full">
                  <h4 className="font-label-md text-[14px] font-bold text-on-surface mb-2">Opening Hours</h4>
                  <div className="flex justify-between font-body-sm text-[14px] mb-1">
                    <span className="text-muted-text">Daily</span>
                    <span className="text-on-surface font-medium">{salon.openingTime} - {salon.closingTime}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Tab Content: Staff */}
          {activeTab === 'staff' && (
            <section className="animate-fade-in">
              <h3 className="font-headline-sm text-[20px] font-semibold text-on-surface mb-4">Our Top Specialists</h3>
              <div className="grid grid-cols-2 gap-4">
                {staff.length === 0 ? <p className="text-muted-text col-span-2">No staff listed yet.</p> : staff.map(s => (
                  <div key={s._id} className="flex flex-col items-center p-4 rounded-xl bg-surface border border-border shadow-sm">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-surface-variant flex items-center justify-center">
                      {s.avatar ? (
                        <img src={getImageUrl(s.avatar)} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-primary/50">person</span>
                      )}
                    </div>
                    <span className="font-label-md text-[14px] font-bold text-on-surface">{s.name}</span>
                    <span className="font-body-sm text-[12px] text-muted-text mt-1">{s.specializations?.[0] || 'Specialist'}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tab Content: Reviews */}
          {activeTab === 'reviews' && (
            <section className="animate-fade-in">
              <p className="font-body-sm text-[14px] text-muted-text text-center py-8">Review content would load here.</p>
            </section>
          )}

        </div>
      </main>

      {/* Sticky Bottom CTA */}
      {selectedServices.length > 0 && (
        <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full bg-surface border-t border-border shadow-[0_-10px_30px_rgba(109,62,168,0.08)] z-40 flex justify-center pb-safe">
          <div className="w-full max-w-[480px] md:max-w-[768px] px-4 py-4 flex justify-between items-center bg-surface">
            <div className="flex flex-col">
              <span className="font-label-sm text-[12px] text-muted-text">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected</span>
              <span className="font-headline-sm text-[20px] font-bold text-on-surface mt-0.5">₹{totalPrice}</span>
            </div>
            <button 
              onClick={() => navigate(`/salon/${id}/book`, { state: { salon, selectedServices, staff } })}
              className="bg-primary text-white font-label-md text-[14px] px-8 py-3.5 rounded-xl shadow-sm hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              Continue Booking <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonDetailPage;

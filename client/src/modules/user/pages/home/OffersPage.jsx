import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPackages, getSalons, getCategories } from '../../services/userApi';
import { useLocationContext } from '../../../../context/LocationContext';
import { goBack } from '../../../../utils/navigation';
import PageHeader from '../../../../components/common/PageHeader';
import { getImageUrl } from '../../../../utils/imageUtils';
import { Skeleton, SkeletonText } from '../../../../components/common/Skeleton';
import toast from 'react-hot-toast';

const OffersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedLocation } = useLocationContext();

  const initialSalon = searchParams.get('salon') || '';
  const initialSearch = searchParams.get('search') || '';

  // State for data
  const [offers, setOffers] = useState([]);
  const [salons, setSalons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSalon, setSelectedSalon] = useState(initialSalon);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minDiscount, setMinDiscount] = useState('');
  const [sortOption, setSortOption] = useState('recommended');
  
  // Responsive filter visibility
  const [isFilterExpanded, setIsFilterExpanded] = useState(!!initialSalon);

  // Fetch initial dropdown items (Salons and Categories)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [salonsRes, categoriesRes] = await Promise.all([
          getSalons({ limit: 100 }).catch(() => ({ data: { data: { salons: [] } } })),
          getCategories().catch(() => ({ data: { data: [] } }))
        ]);
        setSalons(salonsRes.data?.data?.salons || []);
        setCategories(categoriesRes.data?.data || []);
      } catch (err) {
        console.error('Failed to load filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch Offers based on filters, search, and sorting
  useEffect(() => {
    loadOffers();
  }, [
    selectedLocation,
    selectedSalon,
    selectedCategory,
    selectedGender,
    minPrice,
    maxPrice,
    minDiscount,
    sortOption,
    searchQuery
  ]);

  const loadOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        checkValidity: 'true',
        status: 'ACTIVE',
        isActive: 'true',
        page: 1,
        limit: 50
      };

      if (searchQuery.trim()) params.search = searchQuery;
      if (selectedSalon) params.salon = selectedSalon;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedGender) params.gender = selectedGender;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (minDiscount) params.minDiscount = minDiscount;
      
      // Pass location parameters if selected
      if (selectedLocation?.lat && selectedLocation?.lng) {
        params.lat = selectedLocation.lat;
        params.lng = selectedLocation.lng;
      } else if (selectedLocation?.city) {
        params.city = selectedLocation.city;
      }

      // Pass sorting option
      params.sort = sortOption;

      const res = await getPackages(params);
      setOffers(res.data?.data?.packages || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load offers at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedSalon('');
    setSelectedCategory('');
    setSelectedGender('');
    setMinPrice('');
    setMaxPrice('');
    setMinDiscount('');
    setSortOption('recommended');
    setSearchQuery('');
    toast.success('Filters cleared');
  };

  const handleBookOffer = (pkg) => {
    if (!pkg.salon?._id) return;
    navigate(`/salon/${pkg.salon._id}/book`, {
      state: {
        salon: pkg.salon,
        selectedServices: pkg.services,
        packageId: pkg._id,
        packageDoc: pkg
      }
    });
  };

  return (
    <div className="animate-fade-in space-y-6 w-full px-4 md:px-margin-desktop pb-[120px] pt-4 min-h-screen bg-background">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => goBack(navigate, '/')} 
              className="p-2 text-on-surface-variant hover:bg-soft-primary transition-colors rounded-full active:scale-95 duration-150 -ml-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="font-headline-xl text-[28px] md:text-[36px] font-bold text-on-surface leading-tight">
              Exclusive Offers & Deals
            </h1>
          </div>
          <p className="text-sm text-muted-text mt-1 ml-8">
            Pamper yourself with premium salon bundles and save big
          </p>
        </div>
      </header>

      {/* Search & Collapse Filter Controls */}
      <section className="bg-surface rounded-2xl p-4 border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offers by name, service or salon..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border text-sm bg-background-alt text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-2 transition-all shadow-sm ${
                isFilterExpanded 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-surface text-on-surface border-border hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Filters
            </button>
            {(selectedSalon || selectedCategory || selectedGender || minPrice || maxPrice || minDiscount || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2.5 text-error bg-error/10 hover:bg-error/15 border border-error/20 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">clear_all</span>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {isFilterExpanded && (
          <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
            {/* Salon Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Salon</label>
              <select
                value={selectedSalon}
                onChange={(e) => setSelectedSalon(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Salons</option>
                {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Gender</label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>

            {/* Discount Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Min Discount</label>
              <select
                value={minDiscount}
                onChange={(e) => setMinDiscount(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any Discount</option>
                <option value="10">10%+ Off</option>
                <option value="20">20%+ Off</option>
                <option value="30">30%+ Off</option>
                <option value="40">40%+ Off</option>
              </select>
            </div>

            {/* Price Filter Range */}
            <div className="flex flex-col sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <label className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Price Range (₹)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-muted-text text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-background-alt text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sorting bar & Location status */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-text">
          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
          <span>
            {selectedLocation?.formattedAddress 
              ? `Showing deals near: ${selectedLocation.formattedAddress}` 
              : 'Add your location to discover nearby deals'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="font-medium text-muted-text shrink-0">Sort By:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-on-surface focus:outline-none font-medium"
          >
            <option value="recommended">Recommended</option>
            <option value="discount_high">Highest Discount</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating_high">Highest Rated</option>
            {selectedLocation?.lat && <option value="nearest">Nearest</option>}
          </select>
        </div>
      </section>

      {/* Dynamic Offers Grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col gap-4 animate-pulse h-[340px]">
              <div className="h-32 bg-surface-variant rounded-xl w-full"></div>
              <SkeletonText lines={2} className="w-full mt-2" lineClassName="h-4" />
              <div className="flex justify-between items-center mt-auto">
                <SkeletonText lines={1} className="w-1/3" lineClassName="h-6" />
                <div className="h-9 bg-surface-variant rounded-xl w-24"></div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full py-16 text-center bg-surface border border-border rounded-2xl p-6 flex flex-col items-center max-w-lg mx-auto">
            <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
            <p className="font-semibold text-on-surface text-base">{error}</p>
            <button 
              onClick={loadOffers}
              className="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : offers.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-surface border border-border border-dashed rounded-2xl flex flex-col items-center max-w-lg mx-auto p-8">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">local_offer</span>
            <p className="font-bold text-on-surface text-lg">No offers matches your selection</p>
            <p className="text-xs text-muted-text mt-1.5 max-w-xs leading-relaxed">
              We couldn't find any packages matching your filters. Try selecting a different location, category, or clearing active search parameters.
            </p>
            <button 
              onClick={handleClearFilters}
              className="mt-6 px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-sm"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          offers.map(p => {
            const daysLeft = p.validTo ? Math.ceil((new Date(p.validTo) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            return (
              <div 
                key={p._id} 
                className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1 relative"
              >
                {/* Discount Ribbon Badge */}
                <div className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10 animate-pulse">
                  {p.discountPercent}% OFF
                </div>

                {/* Offer Visual Banner */}
                <div className="h-36 w-full relative overflow-hidden bg-surface-variant shrink-0">
                  <img
                    src={p.image ? getImageUrl(p.image) : (p.salon?.images?.[0] ? getImageUrl(p.salon.images[0]) : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80")}
                    alt={p.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  {daysLeft !== null && daysLeft <= 3 && daysLeft >= 0 && (
                    <div className="absolute bottom-2 right-2 bg-error/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      Hurry! {daysLeft === 0 ? 'Ends Today' : `Ends in ${daysLeft}d`}
                    </div>
                  )}
                </div>

                {/* Card Content details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Salon Header details */}
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-xs text-muted-text font-medium truncate max-w-[70%] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">store</span>
                        {p.salon?.name || 'Partner Salon'}
                      </p>
                      {p.salon?.ratings?.average > 0 && (
                        <div className="flex items-center text-rating gap-0.5 text-xs shrink-0 font-bold">
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span>{p.salon.ratings.average.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-on-surface text-base group-hover:text-primary transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    
                    {p.description && (
                      <p className="text-xs text-muted-text line-clamp-2 leading-relaxed h-8">
                        {p.description}
                      </p>
                    )}

                    {/* Included Services Lists */}
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-muted-text uppercase tracking-wider mb-1.5">Includes ({p.services?.length || 0})</p>
                      <div className="flex flex-wrap gap-1 max-h-[50px] overflow-hidden">
                        {p.services?.map(s => (
                          <span key={s._id} className="text-[10px] px-2 py-0.5 bg-background-alt text-on-surface border border-border/60 rounded">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Book action row */}
                  <div className="pt-4 border-t border-border mt-4 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-text">Bundle Price</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-lg font-bold text-primary">₹{p.discountedPrice}</span>
                        <span className="text-xs text-muted-text line-through font-medium">₹{p.totalPrice}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleBookOffer(p)}
                      className="bg-primary hover:bg-primary-dark text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95 shrink-0"
                    >
                      Book Now
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default OffersPage;

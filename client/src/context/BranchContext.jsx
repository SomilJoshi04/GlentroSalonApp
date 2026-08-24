import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getVendorSalons } from '../modules/vendor/services/vendorApi';
import toast from 'react-hot-toast';

const BranchContext = createContext();

export const useBranch = () => useContext(BranchContext);

export const BranchProvider = ({ children }) => {
  const { vendor } = useAuth();
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState(null); // null means "All Branches"
  const [loadingBranches, setLoadingBranches] = useState(false);

  const loadSalons = async () => {
    if (!vendor) {
      setSalons([]);
      setSelectedSalon(null);
      return;
    }
    
    setLoadingBranches(true);
    try {
      const res = await getVendorSalons({ limit: 100 });
      let fetchedSalons = [];
      if (res.data?.data?.salons) {
        fetchedSalons = res.data.data.salons;
      } else if (res.data?.data) {
        fetchedSalons = res.data.data;
      }
      
      setSalons(fetchedSalons || []);
    } catch (error) {
      console.error('Failed to load branches', error);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    loadSalons();
  }, [vendor]);

  const value = {
    salons,
    selectedSalon,
    setSelectedSalon,
    loadingBranches,
    refreshBranches: loadSalons,
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

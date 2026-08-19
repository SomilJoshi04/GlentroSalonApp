import React, { createContext, useContext, useState, useEffect } from 'react';
import { getFavoriteSalons, toggleFavorite as apiToggleFavorite } from '../modules/user/services/userApi';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const FavoriteContext = createContext();

export const useFavorites = () => {
  return useContext(FavoriteContext);
};

export const FavoriteProvider = ({ children }) => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'user') {
      loadFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await getFavoriteSalons();
      const ids = new Set(res.data.data.map(salon => salon._id || salon));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (salonId) => {
    return favoriteIds.has(salonId);
  };

  const toggleFavoriteStatus = async (salonId) => {
    if (!user) {
      toast.error('Please login to save salons to your favourites.');
      return false;
    }

    const currentlyFavorite = favoriteIds.has(salonId);
    
    // Optimistic UI update
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (currentlyFavorite) {
        newSet.delete(salonId);
      } else {
        newSet.add(salonId);
      }
      return newSet;
    });

    try {
      const res = await apiToggleFavorite(salonId);
      const isFavServer = res.data.data.isFavorite;
      
      // Ensure local state matches server response in case of mismatch
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (isFavServer) {
          newSet.add(salonId);
        } else {
          newSet.delete(salonId);
        }
        return newSet;
      });
      
      if (res.data.message) {
        toast.success(res.data.message);
      }
      
      return isFavServer;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      
      // Rollback optimistic update on error
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        if (currentlyFavorite) {
          newSet.add(salonId);
        } else {
          newSet.delete(salonId);
        }
        return newSet;
      });
      
      toast.error('Failed to update favorite status. Please try again.');
      return currentlyFavorite;
    }
  };

  return (
    <FavoriteContext.Provider value={{ favoriteIds, isFavorite, toggleFavoriteStatus, loading, loadFavorites }}>
      {children}
    </FavoriteContext.Provider>
  );
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: favorites = [],
    isLoading
  } = useQuery({
    queryKey: ['/api/favorites'],
    enabled: !!user,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onMutate: async (itemId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/favorites'] });
      
      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData(['/api/favorites']) || [];
      
      // Optimistically add to favorites
      const newFavorite = {
        id: `temp-${itemId}`,
        itemId,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['/api/favorites'], (old: any[]) => 
        [...(old || []), newFavorite]
      );
      
      return { previousFavorites };
    },
    onError: (_err, _itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/favorites'], context?.previousFavorites);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/favorites/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.status === 204 ? null : response.json();
    },
    onMutate: async (itemId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/favorites'] });
      
      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData(['/api/favorites']) || [];
      
      // Optimistically remove from favorites
      queryClient.setQueryData(['/api/favorites'], (old: any[]) => 
        (old || []).filter((fav: any) => fav.itemId !== itemId)
      );
      
      return { previousFavorites };
    },
    onError: (_err, _itemId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['/api/favorites'], context?.previousFavorites);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const checkFavoriteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/favorites/check/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.isFavorited;
    },
  });

  const isFavorited = (itemId: string) => {
    return favorites.some((fav: any) => fav.itemId === itemId);
  };

  return {
    favorites,
    isLoading,
    addFavorite: addFavoriteMutation.mutateAsync,
    removeFavorite: removeFavoriteMutation.mutateAsync,
    checkFavorite: checkFavoriteMutation.mutateAsync,
    isFavorited,
    isAddingFavorite: addFavoriteMutation.isPending,
    isRemovingFavorite: removeFavoriteMutation.isPending,
  };
}

export function useItemFavoriteStatus(itemId: string) {
  const { user } = useAuth();
  
  const { data: favoriteStatus } = useQuery({
    queryKey: [`/api/favorites/check/${itemId}`],
    enabled: !!user && !!itemId,
  });

  return {
    isFavorited: favoriteStatus?.isFavorited || false,
    isLoading: !user || (user && favoriteStatus === undefined),
  };
}
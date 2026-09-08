export type ProviderStatus = 'ACTIVE' | 'PENDING' | 'DEACTIVATED';

export type ProviderProfile = {
  id: string;
  ownerUserId?: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  city: string;
  cityId?: string;
  bio: string;
  categoryId: string;
  categoryName: string;
  subServices: string[];
  subServiceIds: string[];
  whatsapp: string;
  instagram: string;
  website: string;
  galleryItems: { id: string; url: string }[];
  status: ProviderStatus;
  isFeatured: boolean;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  subscriptionStatus?: string;
  subscriptionDaysRemaining?: number;
  isSubscriptionActive: boolean;
  isSubscriptionExpired: boolean;
  needsSubscriptionRenewal: boolean;
};

export type AppCategory = {
  id: string;
  name: string;
  icon: string;
  subServices: string[];
  subServiceOptions: { id: string; name: string }[];
};

export type AppCityOption = {
  id: string;
  name: string;
  parentId?: string | null;
  parentName?: string | null;
  children: AppCityOption[];
};

export type PromotionActionType =
  | 'none'
  | 'external_url'
  | 'in_app_screen'
  | 'provider_profile'
  | 'category'
  | 'sub_service';

export type AppPromotion = {
  id: string;
  title?: string | null;
  description?: string | null;
  image: string;
  mobileImage?: string | null;
  imagePublicId?: string | null;
  mobileImagePublicId?: string | null;
  buttonText?: string | null;
  actionType: PromotionActionType;
  actionValue?: string | null;
  displayOrder: number;
  isActive: boolean;
  showSponsoredBadge: boolean;
  showSectionTitle: boolean;
  startDate?: string | null;
  endDate?: string | null;
  clickCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminAccount = {
  id: string;
  full_name: string;
  email: string;
  status: 'active' | 'inactive';
  is_super_admin?: boolean;
  created_at?: string;
};

export type AdminDashboardStats = {
  total: number;
  active: number;
  pending: number;
  deactivated: number;
  expired: number;
};

export type AdminNotificationSummary = {
  pending_providers_count: number;
  expired_today_count: number;
  expiring_soon_count: number;
  messages: {
    new_provider: string;
    expired_today: string;
    expiring_soon: string;
  };
};

export type RemoteNotification = {
  id: string;
  user_id: string;
  type: 'activation' | 'renewal' | 'general';
  title?: string | null;
  message: string;
  created_at: string;
  read: boolean;
};

export type ProviderFilter =
  | 'all'
  | 'featured'
  | 'active'
  | 'pending'
  | 'deactivated'
  | 'expired'
  | 'expiringSoon';

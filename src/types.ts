export type ThemeMode = "light" | "dark";

export type UserRole = "usuario" | "root";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  theme: ThemeMode;
  public_profile: boolean;
  attending_list_public: boolean;
  newsletter_enabled: boolean;
  two_factor_enabled: boolean;
  created_at: string;
};

export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  price: number;
  description: string;
  badge?: string | null;
  status?: string | null;
  created_at?: string;
};

export type EventItem = {
  id: string;
  title: string;
  category: string;
  date_label: string;
  time_label: string;
  date_iso: string;
  location: string;
  venue_name: string;
  organizer_name: string;
  image: string;
  hero: string;
  created_at?: string;
  ticket_types?: TicketType[];
};

export type Purchase = {
  id: string;
  user_id: string;
  event_id: string;
  ticket_id: string;
  ticket_name: string;
  order_number: string;
  ticket_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  payment_method: "card" | "paypal" | "gpay";
  payment_reference: string | null;
  status: string;
  created_at: string;
  event?: EventItem | null;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type FavoriteEvent = {
  user_id: string;
  event_id: string;
  created_at: string;
};

export type SavedPaymentMethod = {
  id: string;
  user_id: string;
  provider: "card" | "paypal" | "gpay";
  label: string;
  holder_name: string | null;
  card_brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  paypal_email: string | null;
  wallet_email: string | null;
  is_default: boolean;
  created_at: string;
};

export type EventAttendance = {
  id: string;
  purchase_id: string | null;
  user_id: string;
  event_id: string;
  status: "registered" | "attended" | "missed";
  attended_at: string | null;
  created_at: string;
};

export type EventReview = {
  id: string;
  user_id: string;
  event_id: string;
  purchase_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

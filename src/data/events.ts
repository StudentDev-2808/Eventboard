export type TicketType = {
  id: string;
  name: string;
  price: number;
  description: string;
  badge?: string;
  status?: "soldout";
};

export type EventItem = {
  id: string;
  title: string;
  category: string;
  dateLabel: string;
  timeLabel: string;
  dateISO: string;
  location: string;
  image: string;
  hero: string;
  tickets: TicketType[];
};

export const events: EventItem[] = [
  {
    id: "gts-2026",
    title: "Global Tech Summit 2026",
    category: "Technology",
    dateLabel: "Oct 24, 2026",
    timeLabel: "9:00 AM",
    dateISO: "2026-10-24T09:00:00-07:00",
    location: "Moscone Center, San Francisco",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDLvwVwaGxFD1-NiSj9jCU125WMvT6UVCefSvhKsokLk0HDJPnANmOD8QFz9L9mU6GB-ZRQQmu1DPWskc0bY8kH7ldbqmx5en6o0d0beQ-yBSZES9CFxv6zvVRj6ref9NIrKPac0JNfaO9RH-0UjjAbdKxyqqRovzbOIN5bP4d8IJbGfQlC8waexxWDrA45WMTRK6GJJyzmI8BI2E1hlOqlbnf7qYEfVADfAX9G2MMhiC-c3gyJqtXVdIpyMiZ5K0MnpAoffaCPmyVn",
    hero: "Beyond the Horizon with AI & Robotics.",
    tickets: [
      { id: "early", name: "Early Bird Pass", price: 199, description: "Full access, limited availability.", status: "soldout" },
      { id: "general", name: "General Admission", price: 299, description: "Standard entry to all keynotes and sessions.", badge: "Popular" },
      { id: "vip", name: "VIP Experience", price: 599, description: "Lounge access, speaker dinner, and front-row seats." },
    ],
  },
  {
    id: "neon-2026",
    title: "Neon Nights Festival",
    category: "Music",
    dateLabel: "Nov 8, 2026",
    timeLabel: "6:00 PM",
    dateISO: "2026-11-08T18:00:00-08:00",
    location: "Civic Center Plaza",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBfj39M3y2XNnp0t88gT8CYDmZ7-JmYsZhq6AE2N4IdqXy5ZQafC6PuYERgRuOJOFJTZg-u9nge89QeQAbQkAuqCkRVcm7Gdfyr0lGtgyJSfNb2hKGavGP-ye9uvxq_1TDKKWYhhxL4AKtb_OQkXk2mbn0Y7ncWe2BE27ciGO1_1Db4KyCqoXbrms3WXtS-YnVuyRnlIBS-tcDdy-Hy8e75UYPx5DWjPc6sdXyegAo4aP-u93yf4dFbi9PgbwFhthZvHjqhav86_vWg",
    hero: "Late-night performances with immersive lighting.",
    tickets: [
      { id: "early", name: "Early Entry", price: 65, description: "Beat the lines and claim front spots." },
      { id: "general", name: "General Admission", price: 75, description: "Access to all stages and lounges.", badge: "Popular" },
      { id: "vip", name: "VIP Deck", price: 149, description: "Private deck, priority bar, artist meetups." },
    ],
  },
  {
    id: "canvas-2026",
    title: "Oil on Canvas Workshop",
    category: "Art",
    dateLabel: "Sep 18, 2026",
    timeLabel: "2:00 PM",
    dateISO: "2026-09-18T14:00:00-07:00",
    location: "Mission Arts Lab",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBBboMmrZv5mhnX7Yv-hn9qL0MIHldNyPfD7R0sH1wj0FjSgfKyqZJrH02vBmlpq4PccYX7XHteS82ha85MjPamQZo-3sgb-nw4s-wsymYjGYBptqU43qAJdCRQzqQ3h-LvM4AXPxlbHbFeLLSm-_cVr7E5Ywbb4H5F9dk3LRe5qPeyfxrZd_b0dkqoYkhkr--vS_ZveOFSxeT1kWKbj7i_xyluXoDfc4A1K6Ys9sS-azykOZSJ4E7pnkHxpkpqYbonhf24fEhi3D8i",
    hero: "Hands-on studio experience with pro guidance.",
    tickets: [
      { id: "general", name: "Studio Seat", price: 35, description: "All materials included." },
      { id: "vip", name: "Mentor Seat", price: 75, description: "One-on-one critiques and portfolio review." },
    ],
  },
  {
    id: "ai-lab-2026",
    title: "AI Founders Lab",
    category: "AI Lab",
    dateLabel: "Aug 30, 2026",
    timeLabel: "10:00 AM",
    dateISO: "2026-08-30T10:00:00-07:00",
    location: "SoMa Studio",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCYvzr0nGHVaLtuV07U1BEJwQTsaF4gkTZ-KxkmASnH-y7usLSQTQO9mujmw3hVkR9DUjNHmu2KRQeeJsc39UGkhO50fmu96vX_Gn95cJoSgirO4S_F129HHTDjSg46fU_KqnU8Yt6b0ljSg3koOstR11inpB31kZ-WbYIm3HWWVftrt6MAb7eoExM6aCmQ9pYfpo8ohp3IIgL_mQOSXvihNcShf1X_LJkgHQb4kmOviAvvV3S52ueKXqY16fv0-DZm__7HbBDLNuek",
    hero: "Launch-ready mentorship for AI builders.",
    tickets: [
      { id: "general", name: "Founder Track", price: 120, description: "Mentor sessions and pitch review.", badge: "Popular" },
      { id: "vip", name: "Investor Track", price: 220, description: "Private demo day and investor access." },
    ],
  },
];

export const BLOCK_TYPES = [
  { id: "heading", label: "Heading", icon: "Type", description: "Large title text" },
  { id: "text", label: "Text Block", icon: "AlignLeft", description: "Rich paragraph text" },
  { id: "image", label: "Image", icon: "Image", description: "Full-width or contained image" },
  { id: "gallery", label: "Image Gallery", icon: "LayoutGrid", description: "Grid of images" },
  { id: "video", label: "Video Embed", icon: "Play", description: "YouTube or video URL" },
  { id: "spacer", label: "Spacer", icon: "Minus", description: "Vertical spacing" },
  { id: "divider", label: "Divider", icon: "SeparatorHorizontal", description: "Horizontal line" },
  { id: "button", label: "Button / CTA", icon: "MousePointerClick", description: "Call-to-action button" },
  { id: "quote", label: "Quote", icon: "Quote", description: "Highlighted quote" },
  { id: "team", label: "Team Member", icon: "Users", description: "Person card with photo & role" },
  { id: "stats", label: "Stats / Numbers", icon: "BarChart3", description: "Key metrics display" },
  { id: "testimonial", label: "Testimonial", icon: "MessageSquareQuote", description: "Customer review" },
  { id: "faq", label: "FAQ", icon: "HelpCircle", description: "Collapsible Q&A" },
  { id: "icon_grid", label: "Icon Grid", icon: "Grid3x3", description: "Icons with labels" },
  
  { id: "nfc_card", label: "3D NFC Card", icon: "CreditCard", description: "Interactive digital card" },
  { id: "contact", label: "Contact Form", icon: "Mail", description: "Lead generation form" },
  { id: "social", label: "Social Links", icon: "Share2", description: "Social media grid" },
  { id: "embed", label: "HTML Embed", icon: "Code", description: "Custom embed code" },
] as const;

export type BlockTypeId = typeof BLOCK_TYPES[number]["id"];

export interface SitePage {
  id: string;
  persona_id: string;
  user_id: string;
  title: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  is_homepage: boolean;
  page_icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageBlock {
  id: string;
  page_id: string;
  user_id: string;
  block_type: BlockTypeId;
  content: Record<string, any>;
  styles: Record<string, any>;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

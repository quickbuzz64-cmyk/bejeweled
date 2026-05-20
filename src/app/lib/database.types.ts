export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          customer_name: string;
          email: string;
          phone: string;
          shipping_address: string;
          city: string;
          state: string;
          zip_code: string;
          shipping_method: string;
          status: string;
          status_description: string;
          carrier: string;
          tracking_code: string;
          origin_city: string;
          destination_city: string;
          estimated_delivery: string;
          order_placed_at: string;
          items: Json;
          subtotal: number;
          shipping_cost: number;
          tax: number;
          total: number;
          timeline: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          user_id: string;
          customer_name: string;
          email: string;
          phone?: string;
          shipping_address: string;
          city: string;
          state: string;
          zip_code: string;
          shipping_method: string;
          status?: string;
          status_description?: string;
          carrier?: string;
          tracking_code?: string;
          origin_city?: string;
          destination_city?: string;
          estimated_delivery?: string;
          order_placed_at?: string;
          items?: Json;
          subtotal?: number;
          shipping_cost?: number;
          tax?: number;
          total?: number;
          timeline?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          customer_name?: string;
          email?: string;
          phone?: string;
          shipping_address?: string;
          city?: string;
          state?: string;
          zip_code?: string;
          shipping_method?: string;
          status?: string;
          status_description?: string;
          carrier?: string;
          tracking_code?: string;
          origin_city?: string;
          destination_city?: string;
          estimated_delivery?: string;
          order_placed_at?: string;
          items?: Json;
          subtotal?: number;
          shipping_cost?: number;
          tax?: number;
          total?: number;
          timeline?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: string;
          discount_value: number;
          usage_limit: number;
          used_count: number;
          status: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type?: string;
          discount_value?: number;
          usage_limit?: number;
          used_count?: number;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: string;
          discount_value?: number;
          usage_limit?: number;
          used_count?: number;
          status?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          stock: number | null;
          category: string | null;
          rating: number | null;
          images: string[] | null;
          is_featured: boolean | null;
          material: string | null;
          capacity: string | null;
          dimensions: string | null;
          weight: string | null;
          care: string | null;
          shipping_info: string | null;
          slug: string | null;
          meta_title: string | null;
          meta_description: string | null;
          meta_keywords: string | null;
          reviews: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price: number;
          stock?: number | null;
          category?: string | null;
          rating?: number | null;
          images?: string[] | null;
          is_featured?: boolean | null;
          material?: string | null;
          capacity?: string | null;
          dimensions?: string | null;
          weight?: string | null;
          care?: string | null;
          shipping_info?: string | null;
          slug?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string | null;
          reviews?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          stock?: number | null;
          category?: string | null;
          rating?: number | null;
          images?: string[] | null;
          is_featured?: boolean | null;
          material?: string | null;
          capacity?: string | null;
          dimensions?: string | null;
          weight?: string | null;
          care?: string | null;
          shipping_info?: string | null;
          slug?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string | null;
          reviews?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment: string;
          admin_reply: string | null;
          replied_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment: string;
          admin_reply?: string | null;
          replied_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          user_name?: string;
          rating?: number;
          comment?: string;
          admin_reply?: string | null;
          replied_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

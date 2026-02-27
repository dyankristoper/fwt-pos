export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      completed_sales: {
        Row: {
          branch_code: string
          cashier_name: string | null
          control_number: number
          created_at: string
          discount_total: number | null
          gross_sales: number
          id: string
          line_discounts: Json
          net_sales: number
          order_items: Json
          order_slip_number: string
          payment_method: string
          service_charge_amount: number | null
          service_charge_percent: number | null
          subtotal: number
          total_amount_due: number
          transaction_id: string | null
          vat_amount: number | null
          vat_exempt_sales: number | null
          vatable_sales: number | null
          zero_rated_sales: number | null
        }
        Insert: {
          branch_code?: string
          cashier_name?: string | null
          control_number: number
          created_at?: string
          discount_total?: number | null
          gross_sales?: number
          id?: string
          line_discounts?: Json
          net_sales?: number
          order_items?: Json
          order_slip_number: string
          payment_method: string
          service_charge_amount?: number | null
          service_charge_percent?: number | null
          subtotal?: number
          total_amount_due?: number
          transaction_id?: string | null
          vat_amount?: number | null
          vat_exempt_sales?: number | null
          vatable_sales?: number | null
          zero_rated_sales?: number | null
        }
        Update: {
          branch_code?: string
          cashier_name?: string | null
          control_number?: number
          created_at?: string
          discount_total?: number | null
          gross_sales?: number
          id?: string
          line_discounts?: Json
          net_sales?: number
          order_items?: Json
          order_slip_number?: string
          payment_method?: string
          service_charge_amount?: number | null
          service_charge_percent?: number | null
          subtotal?: number
          total_amount_due?: number
          transaction_id?: string | null
          vat_amount?: number | null
          vat_exempt_sales?: number | null
          vatable_sales?: number | null
          zero_rated_sales?: number | null
        }
        Relationships: []
      }
      day_close_log: {
        Row: {
          branch_id: string
          close_date: string
          closed_by: string
          created_at: string
          id: string
          is_reopened: boolean
          reopened_at: string | null
          reopened_by: string | null
        }
        Insert: {
          branch_id?: string
          close_date?: string
          closed_by: string
          created_at?: string
          id?: string
          is_reopened?: boolean
          reopened_at?: string | null
          reopened_by?: string | null
        }
        Update: {
          branch_id?: string
          close_date?: string
          closed_by?: string
          created_at?: string
          id?: string
          is_reopened?: boolean
          reopened_at?: string | null
          reopened_by?: string | null
        }
        Relationships: []
      }
      discount_types: {
        Row: {
          created_at: string
          discount_code: string
          discount_name: string
          discount_percent: number
          discount_type: string
          id: string
          id_type: string | null
          is_active: boolean
          is_vat_exempt: boolean
          promo_code_value: string | null
          requires_customer_name: boolean
          requires_id_number: boolean
          requires_note: boolean
          requires_promo_code: boolean
          requires_signature: boolean
          scope: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_code: string
          discount_name: string
          discount_percent?: number
          discount_type?: string
          id?: string
          id_type?: string | null
          is_active?: boolean
          is_vat_exempt?: boolean
          promo_code_value?: string | null
          requires_customer_name?: boolean
          requires_id_number?: boolean
          requires_note?: boolean
          requires_promo_code?: boolean
          requires_signature?: boolean
          scope?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_code?: string
          discount_name?: string
          discount_percent?: number
          discount_type?: string
          id?: string
          id_type?: string | null
          is_active?: boolean
          is_vat_exempt?: boolean
          promo_code_value?: string | null
          requires_customer_name?: boolean
          requires_id_number?: boolean
          requires_note?: boolean
          requires_promo_code?: boolean
          requires_signature?: boolean
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_cost_audit: {
        Row: {
          changed_at: string
          id: string
          inventory_item_id: string
          new_cost: number | null
          old_cost: number | null
        }
        Insert: {
          changed_at?: string
          id?: string
          inventory_item_id: string
          new_cost?: number | null
          old_cost?: number | null
        }
        Update: {
          changed_at?: string
          id?: string
          inventory_item_id?: string
          new_cost?: number | null
          old_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_cost_audit_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit: number
          created_at: string
          id: string
          is_active: boolean
          item_name: string
          sku: string
          supplier: string | null
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          item_name: string
          sku: string
          supplier?: string | null
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          item_name?: string
          sku?: string
          supplier?: string | null
          unit_of_measure?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_ingredients: {
        Row: {
          computed_cost: number
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          quantity_used: number
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
          updated_at: string
        }
        Insert: {
          computed_cost?: number
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          quantity_used?: number
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Update: {
          computed_cost?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          quantity_used?: number
          unit_of_measure?: Database["public"]["Enums"]["unit_of_measure"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          branch_id: string | null
          category: Database["public"]["Enums"]["menu_category"]
          central_kitchen_flag: boolean | null
          combo_sku: string | null
          computed_food_cost: number
          created_at: string
          display_size: string | null
          gross_margin_percent: number
          gross_margin_value: number
          id: string
          is_active: boolean
          is_combo_eligible: boolean
          is_packaging: boolean
          kcal: number | null
          pos_category_id: string | null
          product_name: string
          sku: string
          srp: number
          tax_category: string | null
          updated_at: string
          wastage_percent: number | null
          yield_adjustment_factor: number | null
        }
        Insert: {
          branch_id?: string | null
          category: Database["public"]["Enums"]["menu_category"]
          central_kitchen_flag?: boolean | null
          combo_sku?: string | null
          computed_food_cost?: number
          created_at?: string
          display_size?: string | null
          gross_margin_percent?: number
          gross_margin_value?: number
          id?: string
          is_active?: boolean
          is_combo_eligible?: boolean
          is_packaging?: boolean
          kcal?: number | null
          pos_category_id?: string | null
          product_name: string
          sku: string
          srp?: number
          tax_category?: string | null
          updated_at?: string
          wastage_percent?: number | null
          yield_adjustment_factor?: number | null
        }
        Update: {
          branch_id?: string | null
          category?: Database["public"]["Enums"]["menu_category"]
          central_kitchen_flag?: boolean | null
          combo_sku?: string | null
          computed_food_cost?: number
          created_at?: string
          display_size?: string | null
          gross_margin_percent?: number
          gross_margin_value?: number
          id?: string
          is_active?: boolean
          is_combo_eligible?: boolean
          is_packaging?: boolean
          kcal?: number | null
          pos_category_id?: string | null
          product_name?: string
          sku?: string
          srp?: number
          tax_category?: string | null
          updated_at?: string
          wastage_percent?: number | null
          yield_adjustment_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_pos_category_id_fkey"
            columns: ["pos_category_id"]
            isOneToOne: false
            referencedRelation: "pos_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_slips: {
        Row: {
          branch_id: string
          cashier_name: string | null
          created_at: string
          device_id: string
          id: string
          sale_id: string | null
          slip_number: string
          status: string
          total: number
          void_by: string | null
          void_note: string | null
          void_reason: string | null
          void_timestamp: string | null
        }
        Insert: {
          branch_id?: string
          cashier_name?: string | null
          created_at?: string
          device_id?: string
          id?: string
          sale_id?: string | null
          slip_number: string
          status?: string
          total?: number
          void_by?: string | null
          void_note?: string | null
          void_reason?: string | null
          void_timestamp?: string | null
        }
        Update: {
          branch_id?: string
          cashier_name?: string | null
          created_at?: string
          device_id?: string
          id?: string
          sale_id?: string | null
          slip_number?: string
          status?: string
          total?: number
          void_by?: string | null
          void_note?: string | null
          void_reason?: string | null
          void_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_slips_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "completed_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_transactions: {
        Row: {
          actual_date: string
          created_at: string
          id: string
          items: Json
          last_error: string | null
          location_id: string
          order_id: string
          order_items: Json
          order_total: number
          payment_method: string
          retry_count: number
          status: string
          transaction_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_date?: string
          created_at?: string
          id?: string
          items?: Json
          last_error?: string | null
          location_id: string
          order_id: string
          order_items?: Json
          order_total?: number
          payment_method: string
          retry_count?: number
          status?: string
          transaction_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_date?: string
          created_at?: string
          id?: string
          items?: Json
          last_error?: string | null
          location_id?: string
          order_id?: string
          order_items?: Json
          order_total?: number
          payment_method?: string
          retry_count?: number
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pos_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pos_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pos_transactions: {
        Row: {
          actual_date: string
          api_response: Json | null
          created_at: string
          id: string
          items: Json
          location_id: string
          order_id: string
          status: string
          transaction_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actual_date?: string
          api_response?: Json | null
          created_at?: string
          id?: string
          items?: Json
          location_id: string
          order_id: string
          status?: string
          transaction_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actual_date?: string
          api_response?: Json | null
          created_at?: string
          id?: string
          items?: Json
          location_id?: string
          order_id?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reprint_log: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          slip_number: string
          supervisor: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason: string
          slip_number: string
          supervisor: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          slip_number?: string
          supervisor?: string
        }
        Relationships: []
      }
      sales_discounts: {
        Row: {
          created_at: string
          customer_name: string | null
          discount_amount: number
          discount_type_id: string
          id: string
          id_number: string | null
          sale_id: string
          vat_removed_amount: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          discount_amount?: number
          discount_type_id: string
          id?: string
          id_number?: string | null
          sale_id: string
          vat_removed_amount?: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          discount_amount?: number
          discount_type_id?: string
          id?: string
          id_number?: string | null
          sale_id?: string
          vat_removed_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_discounts_discount_type_id_fkey"
            columns: ["discount_type_id"]
            isOneToOne: false
            referencedRelation: "discount_types"
            referencedColumns: ["id"]
          },
        ]
      }
      sc_pwd_log: {
        Row: {
          approved_by: string | null
          created_at: string
          customer_name: string
          discount_amount: number
          id: string
          id_number: string
          processed_by: string | null
          sale_id: string
          vat_removed: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          customer_name: string
          discount_amount?: number
          id?: string
          id_number: string
          processed_by?: string | null
          sale_id: string
          vat_removed?: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          customer_name?: string
          discount_amount?: number
          id?: string
          id_number?: string
          processed_by?: string | null
          sale_id?: string
          vat_removed?: number
        }
        Relationships: []
      }
      supervisors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          pin: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pin: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pin?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      void_refund_log: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          items_json: Json
          original_amount: number
          original_sale_id: string
          processed_by: string | null
          reason: string
          refund_amount: number
          type: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          items_json?: Json
          original_amount?: number
          original_sale_id: string
          processed_by?: string | null
          reason: string
          refund_amount?: number
          type: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          items_json?: Json
          original_amount?: number
          original_sale_id?: string
          processed_by?: string | null
          reason?: string
          refund_amount?: number
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_inventory_usage: {
        Row: {
          inventory_item_name: string | null
          total_cost_consumed: number | null
          total_quantity_used: number | null
        }
        Relationships: []
      }
      vw_menu_profitability: {
        Row: {
          computed_food_cost: number | null
          gross_margin_percent: number | null
          gross_margin_value: number | null
          product_name: string | null
          srp: number | null
        }
        Insert: {
          computed_food_cost?: number | null
          gross_margin_percent?: number | null
          gross_margin_value?: number | null
          product_name?: string | null
          srp?: number | null
        }
        Update: {
          computed_food_cost?: number | null
          gross_margin_percent?: number | null
          gross_margin_value?: number | null
          product_name?: string | null
          srp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      inventory_category_code: {
        Args: { cat: Database["public"]["Enums"]["inventory_category"] }
        Returns: string
      }
      menu_category_code: {
        Args: { cat: Database["public"]["Enums"]["menu_category"] }
        Returns: string
      }
      next_control_number: { Args: never; Returns: number }
      next_order_slip_number: {
        Args: { p_branch_code: string }
        Returns: string
      }
    }
    Enums: {
      inventory_category:
        | "Meat"
        | "Buns"
        | "Sauces"
        | "Dry Mix"
        | "Vegetables"
        | "Beverages"
        | "Packaging"
        | "Others"
      menu_category:
        | "Signature Sandwiches"
        | "Chicken Boxes"
        | "Combo Upgrade"
        | "Sides and Add-Ons"
        | "Beverages"
        | "Incidentals"
      unit_of_measure: "g" | "ml" | "pc" | "set"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      inventory_category: [
        "Meat",
        "Buns",
        "Sauces",
        "Dry Mix",
        "Vegetables",
        "Beverages",
        "Packaging",
        "Others",
      ],
      menu_category: [
        "Signature Sandwiches",
        "Chicken Boxes",
        "Combo Upgrade",
        "Sides and Add-Ons",
        "Beverages",
        "Incidentals",
      ],
      unit_of_measure: ["g", "ml", "pc", "set"],
    },
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string
          role: "admin" | "manager"
          company_name: string | null
          company_logo: string | null
          company_address: string | null
          company_phone: string | null
          company_email: string | null
          company_website: string | null
          default_currency: "KES" | "UGX" | "USD"
          signature: string | null
          settings: Json
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name: string
          role?: "admin" | "manager"
          company_name?: string | null
          company_logo?: string | null
          company_address?: string | null
          company_phone?: string | null
          company_email?: string | null
          company_website?: string | null
          default_currency?: "KES" | "UGX" | "USD"
          signature?: string | null
          settings?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string
          role?: "admin" | "manager"
          company_name?: string | null
          company_logo?: string | null
          company_address?: string | null
          company_phone?: string | null
          company_email?: string | null
          company_website?: string | null
          default_currency?: "KES" | "UGX" | "USD"
          signature?: string | null
          settings?: Json
        }
      }
      customers: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string | null
          tax_id: string | null
          notes: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          tax_id?: string | null
          notes?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          tax_id?: string | null
          notes?: string | null
          is_active?: boolean
        }
      }
      documents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          customer_id: string | null
          type:
            | "invoice"
            | "tax_invoice"
            | "proforma_invoice"
            | "receipt"
            | "sales_receipt"
            | "cash_receipt"
            | "quote"
            | "estimate"
            | "credit_memo"
            | "credit_note"
            | "purchase_order"
            | "delivery_note"
          status: "draft" | "final" | "paid" | "canceled" | "overdue"
          document_number: string
          customer_name: string
          issue_date: string
          due_date: string | null
          total_amount: number
          tax_amount: number
          currency: "KES" | "UGX" | "USD"
          notes: string | null
          terms: string | null
          data: Json
          is_deleted: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          customer_id?: string | null
          type:
            | "invoice"
            | "tax_invoice"
            | "proforma_invoice"
            | "receipt"
            | "sales_receipt"
            | "cash_receipt"
            | "quote"
            | "estimate"
            | "credit_memo"
            | "credit_note"
            | "purchase_order"
            | "delivery_note"
          status?: "draft" | "final" | "paid" | "canceled" | "overdue"
          document_number: string
          customer_name: string
          issue_date?: string
          due_date?: string | null
          total_amount?: number
          tax_amount?: number
          currency?: "KES" | "UGX" | "USD"
          notes?: string | null
          terms?: string | null
          data?: Json
          is_deleted?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          customer_id?: string | null
          type?:
            | "invoice"
            | "tax_invoice"
            | "proforma_invoice"
            | "receipt"
            | "sales_receipt"
            | "cash_receipt"
            | "quote"
            | "estimate"
            | "credit_memo"
            | "credit_note"
            | "purchase_order"
            | "delivery_note"
          status?: "draft" | "final" | "paid" | "canceled" | "overdue"
          document_number?: string
          customer_name?: string
          issue_date?: string
          due_date?: string | null
          total_amount?: number
          tax_amount?: number
          currency?: "KES" | "UGX" | "USD"
          notes?: string | null
          terms?: string | null
          data?: Json
          is_deleted?: boolean
        }
      }
      document_items: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          document_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate: number
          tax_amount: number
          discount_rate: number
          discount_amount: number
          amount: number
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          document_id: string
          description: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          amount?: number
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          document_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number
          tax_amount?: number
          discount_rate?: number
          discount_amount?: number
          amount?: number
        }
      }
      document_history: {
        Row: {
          id: string
          created_at: string
          document_id: string
          user_id: string
          action: string
          details: Json
        }
        Insert: {
          id?: string
          created_at?: string
          document_id: string
          user_id: string
          action: string
          details?: Json
        }
        Update: {
          id?: string
          created_at?: string
          document_id?: string
          user_id?: string
          action?: string
          details?: Json
        }
      }
      settings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          default_tax_rate: number
          default_currency: "KES" | "UGX" | "USD"
          invoice_prefix: string
          receipt_prefix: string
          quote_prefix: string
          estimate_prefix: string
          credit_note_prefix: string
          purchase_order_prefix: string
          delivery_note_prefix: string
          default_terms: string | null
          default_notes: string | null
          auto_numbering: boolean
          logo_url: string | null
          signature_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          default_tax_rate?: number
          default_currency?: "KES" | "UGX" | "USD"
          invoice_prefix?: string
          receipt_prefix?: string
          quote_prefix?: string
          estimate_prefix?: string
          credit_note_prefix?: string
          purchase_order_prefix?: string
          delivery_note_prefix?: string
          default_terms?: string | null
          default_notes?: string | null
          auto_numbering?: boolean
          logo_url?: string | null
          signature_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          default_tax_rate?: number
          default_currency?: "KES" | "UGX" | "USD"
          invoice_prefix?: string
          receipt_prefix?: string
          quote_prefix?: string
          estimate_prefix?: string
          credit_note_prefix?: string
          purchase_order_prefix?: string
          delivery_note_prefix?: string
          default_terms?: string | null
          default_notes?: string | null
          auto_numbering?: boolean
          logo_url?: string | null
          signature_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_document_number: {
        Args: {
          doc_type:
            | "invoice"
            | "tax_invoice"
            | "proforma_invoice"
            | "receipt"
            | "sales_receipt"
            | "cash_receipt"
            | "quote"
            | "estimate"
            | "credit_memo"
            | "credit_note"
            | "purchase_order"
            | "delivery_note"
          user_id: string
        }
        Returns: string
      }
      create_document_with_items: {
        Args: {
          p_user_id: string
          p_customer_id: string | null
          p_type:
            | "invoice"
            | "tax_invoice"
            | "proforma_invoice"
            | "receipt"
            | "sales_receipt"
            | "cash_receipt"
            | "quote"
            | "estimate"
            | "credit_memo"
            | "credit_note"
            | "purchase_order"
            | "delivery_note"
          p_status: "draft" | "final" | "paid" | "canceled" | "overdue"
          p_customer_name: string
          p_issue_date: string
          p_due_date: string | null
          p_currency: "KES" | "UGX" | "USD"
          p_notes: string | null
          p_terms: string | null
          p_data: Json
          p_items: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_role: "admin" | "manager"
      document_type:
        | "invoice"
        | "tax_invoice"
        | "proforma_invoice"
        | "receipt"
        | "sales_receipt"
        | "cash_receipt"
        | "quote"
        | "estimate"
        | "credit_memo"
        | "credit_note"
        | "purchase_order"
        | "delivery_note"
      document_status: "draft" | "final" | "paid" | "canceled" | "overdue"
      currency: "KES" | "UGX" | "USD"
    }
  }
}


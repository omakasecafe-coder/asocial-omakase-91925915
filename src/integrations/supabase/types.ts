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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          acquisition_source: string | null
          birthday: string | null
          created_at: string
          email: string | null
          first_name: string
          id: string
          instagram: string | null
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          acquisition_source?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          instagram?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_source?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          instagram?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          extra_info: string
          id: string
          name: string
          signature: string
          subject: string
          template_key: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          enabled?: boolean
          extra_info?: string
          id?: string
          name: string
          signature?: string
          subject?: string
          template_key: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          extra_info?: string
          id?: string
          name?: string
          signature?: string
          subject?: string
          template_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          email_sent_at: string | null
          id: string
          notes: string | null
          paid_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reservation_id: string
          status: Database["public"]["Enums"]["payment_txn_status"]
          status_updated_at: string | null
          status_updated_by: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reservation_id: string
          status?: Database["public"]["Enums"]["payment_txn_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reservation_id?: string
          status?: Database["public"]["Enums"]["payment_txn_status"]
          status_updated_at?: string | null
          status_updated_by?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_redemptions: {
        Row: {
          created_at: string
          customer_id: string | null
          discount_amount: number
          discount_type: string
          discount_value: number
          id: string
          promotion_code: string | null
          promotion_id: string
          promotion_name: string
          reservation_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          promotion_code?: string | null
          promotion_id: string
          promotion_name?: string
          reservation_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          promotion_code?: string | null
          promotion_id?: string
          promotion_name?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          application_type: string
          code: string | null
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_on: string | null
          id: string
          max_discount: number | null
          max_guests: number | null
          min_guests: number
          name: string
          priority: number
          session_ids: string[]
          starts_on: string | null
          updated_at: string
          usage_limit: number | null
          usage_limit_per_customer: number | null
        }
        Insert: {
          active?: boolean
          application_type?: string
          code?: string | null
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_on?: string | null
          id?: string
          max_discount?: number | null
          max_guests?: number | null
          min_guests?: number
          name: string
          priority?: number
          session_ids?: string[]
          starts_on?: string | null
          updated_at?: string
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
        }
        Update: {
          active?: boolean
          application_type?: string
          code?: string | null
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_on?: string | null
          id?: string
          max_discount?: number | null
          max_guests?: number | null
          min_guests?: number
          name?: string
          priority?: number
          session_ids?: string[]
          starts_on?: string | null
          updated_at?: string
          usage_limit?: number | null
          usage_limit_per_customer?: number | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          original_amount: number
          payment_id: string
          processed_by: string | null
          reason: string
          reservation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          id?: string
          original_amount: number
          payment_id: string
          processed_by?: string | null
          reason?: string
          reservation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          original_amount?: number
          payment_id?: string
          processed_by?: string | null
          reason?: string
          reservation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          attendance_at: string | null
          attendance_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          customer_id: string
          dietary_notes: string | null
          discount: number
          guest_count: number
          id: string
          last_email_at: string | null
          last_email_result: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          promotion_name: string | null
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          attendance_at?: string | null
          attendance_by?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          customer_id: string
          dietary_notes?: string | null
          discount?: number
          guest_count: number
          id?: string
          last_email_at?: string | null
          last_email_result?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          promotion_name?: string | null
          reservation_status?: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          attendance_at?: string | null
          attendance_by?: string | null
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          booking_code?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          customer_id?: string
          dietary_notes?: string | null
          discount?: number
          guest_count?: number
          id?: string
          last_email_at?: string | null
          last_email_result?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promotion_code?: string | null
          promotion_id?: string | null
          promotion_name?: string | null
          reservation_status?: Database["public"]["Enums"]["reservation_status"]
          session_id?: string
          source?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_availability"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_blocks: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quantity: number
          reason: Database["public"]["Enums"]["block_reason"]
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity: number
          reason?: Database["public"]["Enums"]["block_reason"]
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          reason?: Database["public"]["Enums"]["block_reason"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_availability"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "seat_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacidad_maxima: number
          created_at: string
          descripcion_publica: string | null
          estado: Database["public"]["Enums"]["session_status"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          notas_internas: string | null
          precio_por_persona: number
          ubicacion: string
          updated_at: string
        }
        Insert: {
          capacidad_maxima?: number
          created_at?: string
          descripcion_publica?: string | null
          estado?: Database["public"]["Enums"]["session_status"]
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          notas_internas?: string | null
          precio_por_persona?: number
          ubicacion?: string
          updated_at?: string
        }
        Update: {
          capacidad_maxima?: number
          created_at?: string
          descripcion_publica?: string | null
          estado?: Database["public"]["Enums"]["session_status"]
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          notas_internas?: string | null
          precio_por_persona?: number
          ubicacion?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_name: string
          cancellation_policy: string | null
          confirmation_text: string | null
          currency: string
          default_capacity: number
          default_price: number
          id: boolean
          logo_url: string | null
          payment_instructions: string
          payment_methods: string[]
          staff_bootstrap_enabled: boolean
          timezone: string
          updated_at: string
          whatsapp_message_template: string
        }
        Insert: {
          address?: string | null
          business_name?: string
          cancellation_policy?: string | null
          confirmation_text?: string | null
          currency?: string
          default_capacity?: number
          default_price?: number
          id?: boolean
          logo_url?: string | null
          payment_instructions?: string
          payment_methods?: string[]
          staff_bootstrap_enabled?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_message_template?: string
        }
        Update: {
          address?: string | null
          business_name?: string
          cancellation_policy?: string | null
          confirmation_text?: string | null
          currency?: string
          default_capacity?: number
          default_price?: number
          id?: boolean
          logo_url?: string | null
          payment_instructions?: string
          payment_methods?: string[]
          staff_bootstrap_enabled?: boolean
          timezone?: string
          updated_at?: string
          whatsapp_message_template?: string
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          modules: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string
          id?: string
          modules?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          modules?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notified: boolean
          phone: string | null
          seats: number
          session_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notified?: boolean
          phone?: string | null
          seats?: number
          session_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notified?: boolean
          phone?: string | null
          seats?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_availability"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "waitlist_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      session_availability: {
        Row: {
          available: number | null
          blocked: number | null
          capacidad_maxima: number | null
          reserved: number | null
          session_id: string | null
        }
        Insert: {
          available?: never
          blocked?: never
          capacidad_maxima?: number | null
          reserved?: never
          session_id?: string | null
        }
        Update: {
          available?: never
          blocked?: never
          capacidad_maxima?: number | null
          reserved?: never
          session_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_reservation: {
        Args: { _reason: string; _reservation_id: string }
        Returns: {
          attendance_at: string | null
          attendance_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          customer_id: string
          dietary_notes: string | null
          discount: number
          guest_count: number
          id: string
          last_email_at: string | null
          last_email_result: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          promotion_name: string | null
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_reservation: {
        Args: {
          _customer_id?: string
          _dietary_notes?: string
          _discount?: number
          _email: string
          _first_name: string
          _guest_count: number
          _last_name: string
          _notes?: string
          _payment_status?: Database["public"]["Enums"]["payment_status"]
          _phone: string
          _reservation_status?: Database["public"]["Enums"]["reservation_status"]
          _session_id: string
          _source?: string
        }
        Returns: {
          attendance_at: string | null
          attendance_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          customer_id: string
          dietary_notes: string | null
          discount: number
          guest_count: number
          id: string
          last_email_at: string | null
          last_email_result: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          promotion_name: string | null
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      join_waitlist: {
        Args: {
          _email: string
          _name: string
          _phone: string
          _seats: number
          _session_id: string
        }
        Returns: string
      }
      move_reservation: {
        Args: { _new_session_id: string; _reservation_id: string }
        Returns: {
          attendance_at: string | null
          attendance_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          customer_id: string
          dietary_notes: string | null
          discount: number
          guest_count: number
          id: string
          last_email_at: string | null
          last_email_result: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          promotion_name: string | null
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      next_booking_code: { Args: { _fecha: string }; Returns: string }
      pick_promotion: {
        Args: {
          _email: string
          _guest_count: number
          _phone: string
          _promo_code: string
          _session_id: string
        }
        Returns: {
          active: boolean
          application_type: string
          code: string | null
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_on: string | null
          id: string
          max_discount: number | null
          max_guests: number | null
          min_guests: number
          name: string
          priority: number
          session_ids: string[]
          starts_on: string | null
          updated_at: string
          usage_limit: number | null
          usage_limit_per_customer: number | null
        }
        SetofOptions: {
          from: "*"
          to: "promotions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      public_create_reservation: {
        Args: {
          _dietary_notes?: string
          _email: string
          _first_name: string
          _guest_count: number
          _last_name: string
          _notes?: string
          _phone: string
          _promo_code?: string
          _session_id: string
        }
        Returns: {
          booking_code: string
          discount: number
          guest_count: number
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string
          promotion_name: string
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          subtotal: number
          total: number
        }[]
      }
      public_price_quote: {
        Args: {
          _email?: string
          _guest_count: number
          _phone?: string
          _promo_code?: string
          _session_id: string
        }
        Returns: {
          discount: number
          promotion_application_type: string
          promotion_code: string
          promotion_id: string
          promotion_name: string
          subtotal: number
          total: number
        }[]
      }
      public_sessions: {
        Args: never
        Returns: {
          available: number
          capacidad_maxima: number
          descripcion_publica: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          precio_por_persona: number
          ubicacion: string
        }[]
      }
      register_payment: {
        Args: {
          _amount: number
          _method: Database["public"]["Enums"]["payment_method"]
          _notes?: string
          _paid_at?: string
          _reference?: string
          _reservation_id: string
        }
        Returns: {
          attendance_at: string | null
          attendance_by: string | null
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          booking_code: string
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          customer_id: string
          dietary_notes: string | null
          discount: number
          guest_count: number
          id: string
          last_email_at: string | null
          last_email_result: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promotion_code: string | null
          promotion_id: string | null
          promotion_name: string | null
          reservation_status: Database["public"]["Enums"]["reservation_status"]
          session_id: string
          source: string
          subtotal: number
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      session_available: { Args: { _session_id: string }; Returns: number }
      session_blocked: { Args: { _session_id: string }; Returns: number }
      session_reserved: { Args: { _session_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "operator"
      attendance_status: "pending" | "arrived" | "no_show"
      block_reason:
        | "invitado"
        | "influencer"
        | "equipo"
        | "prensa"
        | "cortesia"
        | "otro"
      payment_method:
        | "yape"
        | "plin"
        | "bank_transfer"
        | "card"
        | "payment_link"
        | "cash"
        | "complimentary"
        | "other"
      payment_status:
        | "pending"
        | "partial"
        | "paid"
        | "refunded"
        | "complimentary"
      payment_txn_status:
        | "pending"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "cancelled"
      reservation_status:
        | "pending"
        | "confirmed"
        | "attended"
        | "no_show"
        | "cancelled"
      session_status: "draft" | "published" | "full" | "closed" | "cancelled"
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
      app_role: ["admin", "operator"],
      attendance_status: ["pending", "arrived", "no_show"],
      block_reason: [
        "invitado",
        "influencer",
        "equipo",
        "prensa",
        "cortesia",
        "otro",
      ],
      payment_method: [
        "yape",
        "plin",
        "bank_transfer",
        "card",
        "payment_link",
        "cash",
        "complimentary",
        "other",
      ],
      payment_status: [
        "pending",
        "partial",
        "paid",
        "refunded",
        "complimentary",
      ],
      payment_txn_status: [
        "pending",
        "paid",
        "refunded",
        "partially_refunded",
        "cancelled",
      ],
      reservation_status: [
        "pending",
        "confirmed",
        "attended",
        "no_show",
        "cancelled",
      ],
      session_status: ["draft", "published", "full", "closed", "cancelled"],
    },
  },
} as const

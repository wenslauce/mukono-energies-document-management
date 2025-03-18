import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SupportedCurrency = "UGX" | "KES" | "USD"

/**
 * Format a number as currency with the given currency code
 * @param amount Amount to format
 * @param currency Currency code (default: UGX)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = "UGX"
): string {
  // Define currency-specific formatting options
  const options: Record<SupportedCurrency, Intl.NumberFormatOptions> = {
    UGX: {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
    KES: {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
    USD: {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  }

  // Use the proper formatter for the currency
  return new Intl.NumberFormat("en-US", options[currency]).format(amount)
}

export function getCurrencyLocale(currency: string) {
  switch (currency) {
    case "KES":
      return "en-KE"
    case "UGX":
      return "en-UG"
    case "USD":
      return "en-US"
    default:
      return "en-US"
  }
}

export function formatDocumentType(type: string) {
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function generateDocumentNumber(type: string, prefix = "") {
  const defaultPrefixes: Record<string, string> = {
    invoice: "INV-",
    tax_invoice: "TINV-",
    proforma_invoice: "PINV-",
    receipt: "RCT-",
    sales_receipt: "SRCT-",
    cash_receipt: "CRCT-",
    quote: "QT-",
    estimate: "EST-",
    credit_memo: "CM-",
    credit_note: "CN-",
    purchase_order: "PO-",
    delivery_note: "DN-",
  }

  const documentPrefix = prefix || defaultPrefixes[type] || "DOC-"
  const randomNum = Math.floor(100000 + Math.random() * 900000)

  return `${documentPrefix}${randomNum}`
}

/**
 * Creates a document and its items in a transaction-like manner
 */
export async function createDocumentWithItems(
  supabase: SupabaseClient<Database>,
  documentData: Partial<Database["public"]["Tables"]["documents"]["Insert"]>,
  items: Array<Omit<Database["public"]["Tables"]["document_items"]["Insert"], "document_id">>
) {
  try {
    // Step 1: Insert the document
    const { data: documentResult, error: documentError } = await supabase
      .from("documents")
      .insert(documentData)
      .select()

    if (documentError) {
      console.error("Error creating document:", documentError)
      return { success: false, error: documentError }
    }

    if (!documentResult || documentResult.length === 0) {
      return { success: false, error: new Error("No document data returned") }
    }

    const documentId = documentResult[0].id

    // Step 2: Insert all items
    for (const item of items) {
      const { error: itemError } = await supabase
        .from("document_items")
        .insert({
          ...item,
          document_id: documentId
        })

      if (itemError) {
        console.error("Error creating document item:", itemError)
        return { success: false, error: itemError }
      }
    }

    return { 
      success: true, 
      data: { 
        document: documentResult[0],
        documentId 
      } 
    }
  } catch (error) {
    console.error("Unexpected error in createDocumentWithItems:", error)
    return { success: false, error }
  }
}

/**
 * Helper function to diagnose Supabase errors
 */
export function getDatabaseErrorDetails(error: any): string {
  if (!error) return "Unknown error (no details available)";
  
  // Try to extract the most useful error information
  const errorMessage = error.message || error.details || error.hint || JSON.stringify(error);
  const errorCode = error.code || '';
  
  // Common Supabase error codes and their meanings
  const errorCodes: Record<string, string> = {
    "PGRST116": "No rows found - the requested record doesn't exist",
    "42501": "Insufficient privileges - you don't have permission for this operation",
    "42P01": "Table doesn't exist - the referenced table is missing",
    "23505": "Unique violation - a record with this key already exists",
    "23503": "Foreign key violation - referenced record doesn't exist",
    "22P02": "Invalid text representation - usually a UUID format issue",
    "PGRST301": "Malformed parameter - invalid syntax in a query parameter"
  };

  const codeExplanation = errorCodes[errorCode] ? ` (${errorCodes[errorCode]})` : '';
  
  return `${errorMessage}${codeExplanation}${errorCode ? ` [Code: ${errorCode}]` : ''}`;
}

// Add utility functions for image loading
export const imageUtils = {
  /**
   * Preloads an image and returns a promise that resolves when the image is loaded
   * @param src Image source URL
   * @returns Promise that resolves with the loaded image
   */
  preloadImage: (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  },

  /**
   * Creates a data URL from an image URL
   * @param imageUrl The URL of the image to convert
   * @returns Promise resolving to a data URL string
   */
  imageUrlToDataUrl: async (imageUrl: string): Promise<string> => {
    try {
      const img = await imageUtils.preloadImage(imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 300;
      canvas.height = img.naturalHeight || 150;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Error converting image to data URL:', err);
      // Return transparent pixel as fallback
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
  },
  
  /**
   * Loads all images in a container and returns a promise when all are loaded
   * @param container HTML element containing images
   * @returns Promise resolving when all images are loaded
   */
  loadAllImages: (container: HTMLElement): Promise<boolean[]> => {
    const images = container.querySelectorAll('img');
    console.log(`Found ${images.length} images to preload`);
    
    return Promise.all(
      Array.from(images).map((img: HTMLImageElement) => {
        return new Promise<boolean>((resolve) => {
          if (img.complete && img.naturalWidth !== 0) {
            console.log(`Image already loaded: ${img.src}`);
            resolve(true);
            return;
          }
          
          const originalSrc = img.src;
          
          img.onload = () => {
            console.log(`Image loaded: ${originalSrc}`);
            resolve(true);
          };
          
          img.onerror = () => {
            console.error(`Failed to load image: ${originalSrc}`);
            
            // Try to set a data URL for the image to ensure it displays
            imageUtils.imageUrlToDataUrl('/logo.png')
              .then(dataUrl => {
                img.src = dataUrl;
                resolve(false);
              })
              .catch(() => resolve(false));
          };
          
          // Ensure we trigger loading by setting src again with cache buster
          if (img.src.startsWith('/')) {
            const cacheBuster = `?t=${Date.now()}`;
            img.src = `${originalSrc}${cacheBuster}`;
          }
        });
      })
    );
  }
};


// src/types.ts
export interface RawMaterial {
    id: string; // Or number, depending on your DB
    name: string;
    quantity: number;
    threshold: number;
    consumption: number; // Or avg_consumption, etc.
    Vendor: string; // Consider linking to a Vendor ID later
    cost?: number; // Example: Add unit cost if needed
    // Add any other fields fetched from your backend
}

export interface Product {
    id: string; // Or number
    name: string;
    quantity: number;
    threshold: number;
    packaging?: number; // Optional field based on your Prod.tsx example
    // Add any other fields fetched from your backend
}

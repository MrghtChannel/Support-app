import { v4 as uuidv4 } from "uuid";

// Generate a shorter alphanumeric ID (e.g., 8 characters)
export function generateUniqueId() {
  return uuidv4().slice(0, 8); // Shortens UUID to 8 characters
}
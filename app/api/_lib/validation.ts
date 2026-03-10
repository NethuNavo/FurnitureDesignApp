// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required." };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { valid: false, error: "Please provide a valid email address." };
  }

  if (trimmedEmail.length > 254) {
    return { valid: false, error: "Email address is too long." };
  }

  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password is too long (max 128 characters)." };
  }

  // Optional: Enforce strong password
  // if (!PASSWORD_REGEX.test(password)) {
  //   return {
  //     valid: false,
  //     error: "Password must contain uppercase, lowercase, and number.",
  //   };
  // }

  return { valid: true };
}

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name is required." };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters." };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: "Name is too long (max 100 characters)." };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
    return {
      valid: false,
      error: "Name can only contain letters, spaces, hyphens, and apostrophes.",
    };
  }

  return { valid: true };
}

export function validateDesignName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Design name is required." };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 1) {
    return { valid: false, error: "Design name cannot be empty." };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: "Design name is too long (max 100 characters)." };
  }

  return { valid: true };
}

export function validateRoomDimensions(width: number, length: number, height: number): {
  valid: boolean;
  error?: string;
} {
  if (!width || width <= 0) {
    return { valid: false, error: "Room width must be greater than 0." };
  }

  if (!length || length <= 0) {
    return { valid: false, error: "Room length must be greater than 0." };
  }

  if (!height || height <= 0) {
    return { valid: false, error: "Room height must be greater than 0." };
  }

  if (width > 100 || length > 100 || height > 100) {
    return { valid: false, error: "Room dimensions must be 100 or less." };
  }

  return { valid: true };
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, "");
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

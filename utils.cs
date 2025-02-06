type ClassValue = string | number | boolean | undefined | null
type ClassArray = ClassValue[]
type ClassObject = { [key: string]: any }
type ClassInput = ClassValue | ClassArray | ClassObject

/**
 * Utility function to conditionally join class names together
 */
export function cn(...inputs: ClassInput[]): string {
  return inputs.flat().filter(Boolean).join(" ").trim()
}


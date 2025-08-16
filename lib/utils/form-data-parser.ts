/**
 * Utility for parsing multipart/form-data requests, particularly for file uploads
 */

/**
 * Parse FormData into a structured object
 * Handles file objects and converts them to a format that can be used by the application
 * @param formData The FormData object to parse
 * @returns Parsed data object with files converted to appropriate format
 */
export async function parseFormData(formData: FormData): Promise<any> {
  const parsed: Record<string, any> = {};
  
  // Process each form field
  for (const [key, value] of formData.entries()) {
    // Handle files (typically from file input)
    if (value instanceof File) {
      // Convert file to data URL for consistent handling
      const dataUrl = await fileToDataUrl(value);
      
      // If the key ends with [], it's part of an array
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2);
        if (!parsed[arrayKey]) {
          parsed[arrayKey] = [];
        }
        parsed[arrayKey].push({
          name: value.name,
          type: value.type,
          size: value.size,
          url: dataUrl,
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        parsed[key] = {
          name: value.name,
          type: value.type,
          size: value.size,
          url: dataUrl,
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
          timestamp: new Date().toISOString(),
        };
      }
    } 
    // Handle JSON strings (typically from hidden inputs with stringified objects)
    else if (
      typeof value === 'string' && 
      (value.startsWith('{') || value.startsWith('['))
    ) {
      try {
        parsed[key] = JSON.parse(value);
      } catch (e) {
        parsed[key] = value;
      }
    } 
    // Handle array fields with conventional naming (field[])
    else if (key.endsWith('[]')) {
      const arrayKey = key.slice(0, -2);
      if (!parsed[arrayKey]) {
        parsed[arrayKey] = [];
      }
      parsed[arrayKey].push(value);
    } 
    // Handle regular fields
    else {
      parsed[key] = value;
    }
  }
  
  return parsed;
}

/**
 * Convert a File object to a data URL
 * @param file The File object to convert
 * @returns A Promise that resolves to a data URL string
 */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

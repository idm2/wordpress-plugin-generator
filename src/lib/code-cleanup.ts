/**
 * Utility functions for cleaning up generated code
 */

/**
 * Cleans up generated code by removing artifacts that could break WordPress plugins
 * 
 * @param code The code to clean up
 * @returns Cleaned code without artifacts
 */
export function cleanupGeneratedCode(code: string): string {
  // Remove ellipses and placeholder comments that might break the code
  let cleanedCode = code
    // Remove standalone ellipses (common AI placeholder)
    .replace(/^\s*\.\.\.\s*$/gm, '')
    .replace(/^\s*\/\/\s*\.\.\.\s*$/gm, '')
    .replace(/^\s*\/\*\s*\.\.\.\s*\*\/\s*$/gm, '')
    
    // Remove "existing code" placeholder comments
    .replace(/^\s*\/\/\s*\.\.\.?\s*existing\s*code\s*\.\.\.?\s*$/gim, '')
    .replace(/^\s*\/\*\s*\.\.\.?\s*existing\s*code\s*\.\.\.?\s*\*\/\s*$/gim, '')
    
    // Remove AI-generated markers
    .replace(/^\s*\/\/\s*AI-generated\s*code\s*$/gim, '')
    .replace(/^\s*\/\/\s*Generated\s*by\s*AI\s*$/gim, '')
    
    // Remove strange quotation marks that might break code
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    
    // Remove any HTML comment markers that might have been added
    .replace(/<!--[\s\S]*?-->/g, '')
    
    // Remove any trailing comments at the end of the file
    .replace(/\/\/[\s\S]*?$/gm, '')
    
    // Ensure proper spacing around PHP tags
    .replace(/<\?php\s+/g, "<?php\n")
    
    // Remove any double blank lines to clean up the code
    .replace(/\n\s*\n\s*\n/g, '\n\n')

  return cleanedCode
}

/**
 * Ensures code follows WordPress coding standards
 * 
 * @param code The code to format
 * @returns Formatted code following WordPress standards
 */
export function formatWordPressCode(code: string): string {
  return code
    // Ensure proper indentation (4 spaces for WordPress)
    .replace(/\t/g, '    ')
    
    // Ensure proper spacing for function declarations
    .replace(/function\s+([a-zA-Z0-9_]+)\s*\(/g, 'function $1(')
    
    // Ensure proper spacing for control structures
    .replace(/if\s*\(/g, 'if (')
    .replace(/}\s*else\s*{/g, '} else {')
    .replace(/}\s*else\s+if\s*\(/g, '} elseif (')
    
    // Ensure proper spacing for array declarations
    .replace(/array\s*\(/g, 'array(')
    
    // Ensure proper spacing for class declarations
    .replace(/class\s+([a-zA-Z0-9_]+)\s*{/g, 'class $1 {')
    .replace(/class\s+([a-zA-Z0-9_]+)\s+extends\s+([a-zA-Z0-9_]+)\s*{/g, 'class $1 extends $2 {')
    
    // Ensure proper spacing for method declarations
    .replace(/public\s+function\s+/g, 'public function ')
    .replace(/private\s+function\s+/g, 'private function ')
    .replace(/protected\s+function\s+/g, 'protected function ')
    
    // Ensure proper spacing for hooks
    .replace(/add_action\s*\(/g, 'add_action(')
    .replace(/add_filter\s*\(/g, 'add_filter(')
    
    // Ensure proper spacing for PHP tags
    .replace(/<\?php\s+/g, "<?php\n")
    .replace(/\s+\?>/g, "\n?>")
}

/**
 * Removes any placeholder or incomplete code that might have been generated
 * 
 * @param code The code to clean
 * @returns Code without placeholders
 */
export function removePlaceholders(code: string): string {
  return code
    // Remove TODO comments
    .replace(/\/\/\s*TODO:.*$/gm, '')
    .replace(/\/\*\s*TODO:[\s\S]*?\*\//g, '')
    
    // Remove placeholder function bodies
    .replace(/function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*{\s*\/\/\s*TODO[\s\S]*?}/g, 
             'function $1() {\n    // Implementation required\n}')
    
    // Remove incomplete code markers
    .replace(/\/\/\s*FIXME:.*$/gm, '')
    .replace(/\/\*\s*FIXME:[\s\S]*?\*\//g, '')
    
    // Remove code that's commented out
    .replace(/\/\/\s*[a-zA-Z0-9_]+\s*\([^;]*;/g, '')
}

/**
 * Applies all code cleanup functions to ensure the generated code is clean and follows WordPress standards
 * 
 * @param code The code to clean and format
 * @returns Clean, formatted code
 */
export function cleanAndFormatCode(code: string): string {
  let cleanedCode = cleanupGeneratedCode(code);
  cleanedCode = formatWordPressCode(cleanedCode);
  cleanedCode = removePlaceholders(cleanedCode);
  return cleanedCode;
} 
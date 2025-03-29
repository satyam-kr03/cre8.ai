/**
 * Cleans AI-generated prompt text by removing introductory phrases and formatting
 */
export function cleanPromptText(text: string): string {
  // Store the original text to check if any cleaning was performed
  const originalText = text;
  let cleanedText = text;
  
  // Remove "Here's a..." introductory phrases
  cleanedText = cleanedText.replace(/^(?:Here(?:'s| is)(?: a| an)?.*?prompt.*?:)\s*/i, '');
  
  // Remove "Based on..." phrases
  cleanedText = cleanedText.replace(/^(?:Based on.*?:)\s*/i, '');
  
  // Remove **Prompt:** or Prompt: markers
  cleanedText = cleanedText.replace(/^(?:\*\*)?(?:Prompt:?)(?:\*\*)?(?:[\s\n]*)/i, '');

  // If none of the above worked, try finding common starting verbs
  if (cleanedText === originalText) {
    const verbs = ["Create", "Generate", "Design", "Imagine", "Craft", "Produce", "Make", "Develop"];
    for (const verb of verbs) {
      const index = cleanedText.indexOf(verb);
      if (index !== -1 && index < 30) {
        cleanedText = cleanedText.substring(index);
        break;
      }
    }
  }
  
  // Remove any remaining leading/trailing whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText;
} 
import { Caption } from '../types';
import { generateId } from './helpers';

/**
 * Parse caption text and extract multiple captions in the TikTok format
 */
export function parseCaptionText(text: string): Caption[] {
  const captions: Caption[] = [];
  
  // Split by numbered themes (e.g., "### **71️⃣ Theme:" or "### **1️⃣ Theme:")
  const themeRegex = /###\s*\*\*\d+.*?Theme:/gi;
  const themes = text.split(themeRegex);
  
  // Remove first empty element
  themes.shift();
  
  for (const theme of themes) {
    try {
      const slides: string[] = [];
      
      // Extract slides - look for patterns like "**Slide 1:**" or "Slide 1:"
      const slideMatches = theme.match(/\*\*Slide\s+\d+:\*\*[\s\S]*?```text\s*([\s\S]*?)```/gi);
      
      if (slideMatches) {
        for (const slideMatch of slideMatches) {
          const textMatch = slideMatch.match(/```text\s*([\s\S]*?)```/);
          if (textMatch && textMatch[1]) {
            const slideText = textMatch[1].trim();
            if (slideText) {
              slides.push(slideText);
            }
          }
        }
      }
      
      // Extract title - look for "**Title:**" or "Title:"
      let title = '';
      const titleMatch = theme.match(/\*\*Title:\*\*\s*(.*?)(?:\n|$)/i) || theme.match(/Title:\s*(.*?)(?:\n|$)/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
      
      // Extract hashtags - look for "**Hashtags:**" or "Hashtags:"
      let hashtags = '';
      const hashtagsMatch = theme.match(/\*\*Hashtags:\*\*\s*(.*?)(?:\n|$)/i) || theme.match(/Hashtags:\s*(.*?)(?:\n|$)/i);
      if (hashtagsMatch && hashtagsMatch[1]) {
        hashtags = hashtagsMatch[1].trim();
      }
      
      // Only add if we have at least slides and title
      if (slides.length > 0 && title) {
        captions.push({
          id: generateId(),
          slides,
          title,
          hashtags,
          used: false,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error parsing caption theme:', error);
    }
  }
  
  return captions;
}

/**
 * Format caption for display (combine title and hashtags)
 */
export function formatTitleWithHashtags(caption: Caption): string {
  return `${caption.title}\n\n${caption.hashtags}`;
}

/**
 * Get next unused caption for an account
 */
export function getNextUnusedCaption(captions: Caption[]): Caption | null {
  return captions.find(c => !c.used) || null;
}


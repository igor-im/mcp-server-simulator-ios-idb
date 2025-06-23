// SPDX-FileCopyrightText: © 2025 Industria de Diseño Textil S.A. INDITEX
// SPDX-License-Identifier: Apache-2.0

export interface FuzzyMatchResult {
  item: string;
  score: number;
  distance: number;
}

export class FuzzyMatcher {
  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Calculate similarity score (0-1, where 1 is perfect match)
   */
  private static calculateScore(input: string, target: string): number {
    const distance = this.levenshteinDistance(input.toLowerCase(), target.toLowerCase());
    const maxLength = Math.max(input.length, target.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }
  
  /**
   * Check if input contains target as substring (case insensitive)
   */
  private static containsMatch(input: string, target: string): boolean {
    return target.toLowerCase().includes(input.toLowerCase());
  }
  
  /**
   * Check if target starts with input (case insensitive)
   */
  private static startsWithMatch(input: string, target: string): boolean {
    return target.toLowerCase().startsWith(input.toLowerCase());
  }
  
  /**
   * Find best fuzzy matches for input string
   */
  static findMatches(input: string, candidates: string[], maxResults: number = 5, minScore: number = 0.3): FuzzyMatchResult[] {
    if (!input.trim()) {
      return candidates.slice(0, maxResults).map(item => ({
        item,
        score: 0.5,
        distance: 0
      }));
    }
    
    const normalizedInput = input.trim().toLowerCase();
    const results: FuzzyMatchResult[] = [];
    
    for (const candidate of candidates) {
      const score = this.calculateScore(normalizedInput, candidate);
      const distance = this.levenshteinDistance(normalizedInput, candidate.toLowerCase());
      
      // Boost score for exact substring matches
      let finalScore = score;
      if (this.startsWithMatch(normalizedInput, candidate)) {
        finalScore = Math.min(1, score + 0.3);
      } else if (this.containsMatch(normalizedInput, candidate)) {
        finalScore = Math.min(1, score + 0.2);
      }
      
      if (finalScore >= minScore) {
        results.push({
          item: candidate,
          score: finalScore,
          distance
        });
      }
    }
    
    // Sort by score (descending) then by distance (ascending)
    results.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        return a.distance - b.distance;
      }
      return b.score - a.score;
    });
    
    return results.slice(0, maxResults);
  }
  
  /**
   * Find best match for a single input
   */
  static findBestMatch(input: string, candidates: string[], minScore: number = 0.3): FuzzyMatchResult | null {
    const matches = this.findMatches(input, candidates, 1, minScore);
    return matches.length > 0 ? matches[0] : null;
  }
}
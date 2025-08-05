'use client';

import { useState, useCallback } from 'react';
import { EmailGroup, EmailAnalysis, ActionSuggestion, ActionResult } from '@/lib/types';

export function useAIActions() {
  const [analyses, setAnalyses] = useState<Map<string, EmailAnalysis>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const analyzeEmailGroup = useCallback(async (emailGroup: EmailGroup): Promise<EmailAnalysis | null> => {
    const groupKey = emailGroup.senderKey;
    
    // Don't re-analyze if already analyzing
    if (isAnalyzing.has(groupKey)) {
      return analyses.get(groupKey) || null;
    }

    setIsAnalyzing(prev => new Set(prev).add(groupKey));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(groupKey);
      return newErrors;
    });

    try {
      const response = await fetch('/api/claude/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailGroup }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      const analysis: EmailAnalysis = await response.json();
      
      setAnalyses(prev => new Map(prev).set(groupKey, analysis));
      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => new Map(prev).set(groupKey, errorMessage));
      return null;
    } finally {
      setIsAnalyzing(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupKey);
        return newSet;
      });
    }
  }, [analyses, isAnalyzing]);

  const executeAction = useCallback(async (
    action: ActionSuggestion, 
    emailGroup: EmailGroup
  ): Promise<ActionResult> => {
    try {
      const emailIds = emailGroup.messages.map(msg => msg.id);
      
      const response = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, emailIds }),
      });

      if (!response.ok) {
        throw new Error(`Action execution failed: ${response.status} ${response.statusText}`);
      }

      const result: ActionResult = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute action',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  const getAnalysis = useCallback((groupKey: string): EmailAnalysis | null => {
    return analyses.get(groupKey) || null;
  }, [analyses]);

  const isGroupAnalyzing = useCallback((groupKey: string): boolean => {
    return isAnalyzing.has(groupKey);
  }, [isAnalyzing]);

  const getAnalysisError = useCallback((groupKey: string): string | null => {
    return errors.get(groupKey) || null;
  }, [errors]);

  const clearAnalysis = useCallback((groupKey: string) => {
    setAnalyses(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupKey);
      return newMap;
    });
    setErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupKey);
      return newMap;
    });
  }, []);

  const clearAllAnalyses = useCallback(() => {
    setAnalyses(new Map());
    setErrors(new Map());
  }, []);

  return {
    // Actions
    analyzeEmailGroup,
    executeAction,
    getAnalysis,
    clearAnalysis,
    clearAllAnalyses,
    
    // State
    isGroupAnalyzing,
    getAnalysisError,
    
    // Stats
    totalAnalyses: analyses.size,
    analyzingCount: isAnalyzing.size,
    errorCount: errors.size
  };
}
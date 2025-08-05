'use client';

import { useState } from 'react';
import { ActionSuggestion, EmailGroup, ActionResult } from '@/lib/types';

interface ActionSuggestionsProps {
  emailGroup: EmailGroup;
  suggestions: ActionSuggestion[];
  onExecuteAction: (action: ActionSuggestion) => Promise<ActionResult>;
}

export default function ActionSuggestions({ 
  emailGroup, 
  suggestions, 
  onExecuteAction 
}: ActionSuggestionsProps) {
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, ActionResult>>(new Map());

  const handleExecuteAction = async (action: ActionSuggestion) => {
    setExecutingActions(prev => new Set(prev).add(action.id));
    
    try {
      const result = await onExecuteAction(action);
      setResults(prev => new Map(prev).set(action.id, result));
    } catch (error) {
      setResults(prev => new Map(prev).set(action.id, {
        success: false,
        message: 'Failed to execute action',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'archive': return '📁';
      case 'calendar': return '📅';
      case 'drive': return '💾';
      case 'task': return '✅';
      case 'custom': return '⚡';
      default: return '🔧';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!suggestions.length) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No AI suggestions available for this email group.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
        🤖 AI Action Suggestions
        <span className="text-sm font-normal text-gray-500">
          ({suggestions.length} suggestions)
        </span>
      </h3>
      
      {suggestions.map((action) => {
        const isExecuting = executingActions.has(action.id);
        const result = results.get(action.id);
        
        return (
          <div 
            key={action.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getActionIcon(action.type)}</span>
                  <h4 className="font-medium text-gray-800">{action.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getConfidenceColor(action.confidence)}`}>
                    {action.confidence}% confident
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{action.description}</p>
                
                {action.params && Object.keys(action.params).length > 0 && (
                  <div className="bg-gray-50 rounded p-2 mb-3">
                    <div className="text-xs text-gray-500 mb-1">Parameters:</div>
                    <div className="text-xs font-mono">
                      {JSON.stringify(action.params, null, 2)}
                    </div>
                  </div>
                )}
                
                {result && (
                  <div className={`p-2 rounded text-sm ${
                    result.success 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {result.success ? '✅' : '❌'} {result.message}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleExecuteAction(action)}
                disabled={isExecuting || !!result}
                className={`ml-4 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isExecuting 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : result
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Executing...
                  </span>
                ) : result ? (
                  'Executed'
                ) : (
                  'Execute'
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
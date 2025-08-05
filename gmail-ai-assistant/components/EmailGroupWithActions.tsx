'use client';

import { useState } from 'react';
import { EmailGroup } from '@/lib/types';
import { useAIActions } from '@/lib/hooks/useAIActions';
import ActionSuggestions from './ActionSuggestions';

interface EmailGroupWithActionsProps {
  emailGroup: EmailGroup;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export default function EmailGroupWithActions({
  emailGroup,
  isExpanded,
  onToggleExpanded
}: EmailGroupWithActionsProps) {
  const [showActions, setShowActions] = useState(false);
  const {
    analyzeEmailGroup,
    executeAction,
    getAnalysis,
    isGroupAnalyzing,
    getAnalysisError
  } = useAIActions();

  const analysis = getAnalysis(emailGroup.senderKey);
  const isAnalyzing = isGroupAnalyzing(emailGroup.senderKey);
  const analysisError = getAnalysisError(emailGroup.senderKey);

  const handleAnalyze = async () => {
    const result = await analyzeEmailGroup(emailGroup);
    if (result) {
      setShowActions(true);
    }
  };

  const handleExecuteAction = async (action: any) => {
    return executeAction(action, emailGroup);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Email Group Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onToggleExpanded}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            
            <div>
              <h3 className="font-semibold text-gray-800">
                {emailGroup.senderName}
              </h3>
              <p className="text-sm text-gray-500">
                {emailGroup.senderEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">
                {emailGroup.totalCount} messages
              </div>
              {emailGroup.unreadCount > 0 && (
                <div className="text-xs text-blue-600">
                  {emailGroup.unreadCount} unread
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isAnalyzing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : analysis
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </span>
              ) : analysis ? (
                '🤖 View AI Actions'
              ) : (
                '🤖 Analyze with AI'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Email Messages */}
          <div className="space-y-3 mb-6">
            {emailGroup.messages.map((message, index) => (
              <div key={message.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 truncate">
                    {message.subject}
                  </h4>
                  <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                    {new Date(message.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {message.snippet}
                </p>
                {message.labels.includes('UNREAD') && (
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Unread
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* AI Actions Section */}
          {(analysis || isAnalyzing || analysisError) && (
            <div className="border-t border-gray-200 pt-4">
              {isAnalyzing && (
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    AI is analyzing these emails...
                  </div>
                </div>
              )}

              {analysisError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-700">
                    ❌ Analysis failed: {analysisError}
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {analysis && (
                <ActionSuggestions
                  emailGroup={emailGroup}
                  suggestions={analysis.suggestions}
                  onExecuteAction={handleExecuteAction}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
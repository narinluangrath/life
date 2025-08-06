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
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

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

  const toggleExpanded = (actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'archive': return '📁';
      case 'calendar': return '📅';
      case 'drive': return '💾';
      case 'task': return '✅';
      case 'label': return '🏷️';
      case 'reply': return '↩️';
      case 'forward': return '➡️';
      case 'delete': return '🗑️';
      case 'custom': return '⚡';
      default: return '🔧';
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    let color = '';
    let bgColor = '';
    let label = '';
    
    if (confidence >= 80) {
      color = 'color: var(--success)';
      bgColor = 'background: rgba(52, 168, 83, 0.1)';
      label = 'High confidence';
    } else if (confidence >= 60) {
      color = 'color: #f59e0b';
      bgColor = 'background: rgba(245, 158, 11, 0.1)';
      label = 'Medium confidence';
    } else {
      color = 'color: var(--danger)';
      bgColor = 'background: rgba(234, 67, 53, 0.1)';
      label = 'Low confidence';
    }
    
    return (
      <span style={{
        fontSize: '0.75rem',
        padding: '0.25rem 0.5rem',
        borderRadius: 'var(--radius)',
        fontWeight: '500',
        ...{ [color.split(':')[0]]: color.split(':')[1].trim() },
        ...{ [bgColor.split(':')[0]]: bgColor.split(':')[1].trim() }
      }}>
        {confidence}% • {label}
      </span>
    );
  };

  const generateApiCall = (action: ActionSuggestion): string => {
    const messageIds = emailGroup.messages.map(m => m.id).slice(0, 3);
    const exampleIds = messageIds.length > 3 
      ? [...messageIds, '...'] 
      : messageIds;

    switch (action.type) {
      case 'archive':
        return `POST /api/actions/execute
{
  "action": "archive",
  "messageIds": ${JSON.stringify(exampleIds, null, 2).replace(/\n/g, '\n  ')},
  "totalMessages": ${emailGroup.messages.length}
}`;

      case 'label':
        return `POST /api/actions/execute
{
  "action": "addLabel",
  "messageIds": ${JSON.stringify(exampleIds, null, 2).replace(/\n/g, '\n  ')},
  "label": "${action.params?.label || 'Important'}",
  "totalMessages": ${emailGroup.messages.length}
}`;

      case 'calendar':
        return `POST /api/actions/execute
{
  "action": "createCalendarEvent",
  "title": "${action.params?.eventTitle || 'Meeting'}",
  "date": "${action.params?.eventDate || new Date().toISOString()}",
  "attendees": ["${emailGroup.senderEmail}"],
  "description": "Event created from emails"
}`;

      case 'task':
        return `POST /api/actions/execute
{
  "action": "createTask",
  "title": "${action.params?.taskName || 'Follow up'}",
  "dueDate": "${action.params?.dueDate || 'Tomorrow'}",
  "relatedEmails": ${emailGroup.messages.length},
  "sender": "${emailGroup.senderEmail}"
}`;

      case 'reply':
        return `POST /api/actions/execute
{
  "action": "draftReply",
  "to": "${emailGroup.senderEmail}",
  "subject": "Re: ${emailGroup.messages[0]?.subject || 'Your email'}",
  "template": "${action.params?.responseTemplate || 'Thank you for your email...'}"
}`;

      case 'drive':
        return `POST /api/actions/execute
{
  "action": "saveToGoogleDrive",
  "folderName": "${action.params?.folderName || emailGroup.senderName}",
  "messageIds": ${JSON.stringify(exampleIds, null, 2).replace(/\n/g, '\n  ')},
  "includeAttachments": true
}`;

      default:
        return `POST /api/actions/execute
{
  "action": "${action.type}",
  "params": ${JSON.stringify(action.params || {}, null, 2).replace(/\n/g, '\n  ')},
  "messageIds": ${JSON.stringify(exampleIds, null, 2).replace(/\n/g, '\n  ')}
}`;
    }
  };

  const getGmailApiExample = (action: ActionSuggestion): string => {
    const messageId = emailGroup.messages[0]?.id || 'msg_id';
    
    switch (action.type) {
      case 'archive':
        return `Gmail API Calls:
        
// Remove from INBOX for each message
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify
{
  "removeLabelIds": ["INBOX"]
}

// Will process ${emailGroup.messages.length} message${emailGroup.messages.length !== 1 ? 's' : ''}`;

      case 'label':
        const labelName = action.params?.label || 'Important';
        return `Gmail API Calls:

// First, get or create the label
GET https://gmail.googleapis.com/gmail/v1/users/me/labels
→ Find or create "${labelName}"

// Then apply to each message
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify
{
  "addLabelIds": ["label_id_for_${labelName}"]
}

// Will process ${emailGroup.messages.length} message${emailGroup.messages.length !== 1 ? 's' : ''}`;

      case 'delete':
        return `Gmail API Calls:

// Move to trash for each message
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash

// Will process ${emailGroup.messages.length} message${emailGroup.messages.length !== 1 ? 's' : ''}`;

      case 'reply':
        return `Gmail API Calls:

// Create a draft reply
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
{
  "message": {
    "threadId": "${emailGroup.messages[0]?.id || 'thread_id'}",
    "raw": "base64_encoded_email_content"
  }
}

Email Headers:
To: ${emailGroup.senderEmail}
Subject: Re: ${emailGroup.messages[0]?.subject || 'Your email'}
In-Reply-To: <message-id>`;

      default:
        return `API Call:
POST /api/actions/execute
Action: ${action.type}
Messages: ${emailGroup.messages.length} email${emailGroup.messages.length !== 1 ? 's' : ''}`;
    }
  };

  if (!suggestions.length) {
    return (
      <div style={{
        background: 'var(--bg-hover)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--text-secondary)'
      }}>
        No AI suggestions available for this email group.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--text-primary)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        🤖 AI Suggested Actions
        <span style={{
          fontSize: '0.8125rem',
          fontWeight: '400',
          color: 'var(--text-secondary)'
        }}>
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </span>
      </h3>
      
      {suggestions.map((action) => {
        const isExecuting = executingActions.has(action.id);
        const result = results.get(action.id);
        const isExpanded = expandedActions.has(action.id);
        
        return (
          <div 
            key={action.id}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '0.75rem',
              transition: 'var(--transition)',
              boxShadow: result?.success ? '0 0 0 2px rgba(52, 168, 83, 0.2)' : 
                        result?.error ? '0 0 0 2px rgba(234, 67, 53, 0.2)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{getActionIcon(action.type)}</span>
                  <h4 style={{
                    fontSize: '0.9375rem',
                    fontWeight: '500',
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>
                    {action.title}
                  </h4>
                  {getConfidenceBadge(action.confidence)}
                </div>
                
                <p style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                  lineHeight: '1.5'
                }}>
                  {action.description}
                </p>

                {/* Quick Summary */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Action:</strong> {action.type}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>Affects:</strong> {emailGroup.messages.length} email{emailGroup.messages.length !== 1 ? 's' : ''}
                    </div>
                    {action.params?.label && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Label:</strong> {action.params.label}
                      </div>
                    )}
                    {action.params?.folderName && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Folder:</strong> {action.params.folderName}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* API Details Toggle */}
                <button
                  onClick={() => toggleExpanded(action.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    color: 'var(--primary)',
                    background: 'transparent',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s'
                  }}>
                    ▶
                  </span>
                  {isExpanded ? 'Hide' : 'View'} API Details
                </button>
                
                {/* Expanded API Details */}
                {isExpanded && (
                  <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {/* Request Preview */}
                    <div style={{
                      background: '#1e1e1e',
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#d4d4d4',
                      overflowX: 'auto',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ 
                        color: '#569cd6',
                        marginBottom: '0.5rem',
                        fontWeight: 'bold'
                      }}>
                        Request Preview:
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        <span style={{ color: '#c586c0' }}>{generateApiCall(action).split('\n')[0]}</span>
                        {'\n'}
                        <span style={{ color: '#ce9178' }}>{generateApiCall(action).split('\n').slice(1).join('\n')}</span>
                      </pre>
                    </div>

                    {/* Gmail API Details */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-light)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      <div style={{ 
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                        fontWeight: 'bold',
                        fontFamily: 'inherit'
                      }}>
                        What will happen:
                      </div>
                      {getGmailApiExample(action)}
                    </div>
                  </div>
                )}
                
                {/* Result Display */}
                {result && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                    marginTop: '0.75rem',
                    background: result.success ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 67, 53, 0.1)',
                    color: result.success ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${result.success ? 'rgba(52, 168, 83, 0.3)' : 'rgba(234, 67, 53, 0.3)'}`
                  }}>
                    <strong>{result.success ? '✅ Success' : '❌ Failed'}</strong>
                    <p style={{ margin: '0.25rem 0 0 0' }}>{result.message}</p>
                    {result.error && (
                      <p style={{ 
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}>
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={() => handleExecuteAction(action)}
                disabled={isExecuting || !!result}
                className={isExecuting ? 'btn-secondary' : result ? 'btn-secondary' : 'btn-primary'}
                style={{
                  marginLeft: '1rem',
                  fontSize: '0.875rem',
                  opacity: result ? 0.5 : 1,
                  cursor: result ? 'not-allowed' : 'pointer'
                }}
              >
                {isExecuting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></span>
                    Executing
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
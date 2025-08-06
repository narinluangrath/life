'use client';

import { useState, useEffect } from 'react';
import { EmailGroup as AIEmailGroup, ParsedMessage } from '@/lib/types';
import { useAIActions } from '@/lib/hooks/useAIActions';
import ActionSuggestions from '@/components/ActionSuggestions';

interface Email {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  date: string;
  snippet: string;
}

interface EmailGroup {
  senderEmail: string;
  sender: string;
  emails: Email[];
  isExpanded: boolean;
}

export default function HomePage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'sender' | 'date'>('sender');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  
  const {
    analyzeEmailGroup,
    executeAction,
    getAnalysis,
    isGroupAnalyzing,
    getAnalysisError
  } = useAIActions();

  useEffect(() => {
    // Check for OAuth errors in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      setError(`OAuth error: ${error}`);
      setLoading(false);
      return;
    }
    
    checkAuthAndFetchEmails();
  }, []);

  const checkAuthAndFetchEmails = async () => {
    try {
      console.log('Checking auth and fetching emails...');
      setLoading(true);
      setError(null);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const fetchPromise = fetch('/api/emails');
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        // Not authenticated
        console.log('Not authenticated - 401 response');
        setAuthenticated(false);
        setError(null); // No error for 401, just show login button
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`Failed to fetch emails: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Got emails:', data.emails?.length || 0);
      setEmails(data.emails || []);
      setAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error('Error in checkAuthAndFetchEmails:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const groupEmails = (emails: Email[]): EmailGroup[] => {
    if (groupBy === 'none') {
      return [{
        senderEmail: 'all',
        sender: 'All Emails',
        emails: emails,
        isExpanded: true
      }];
    }

    if (groupBy === 'sender') {
      const groups = new Map<string, EmailGroup>();
      
      emails.forEach(email => {
        if (!groups.has(email.senderEmail)) {
          groups.set(email.senderEmail, {
            senderEmail: email.senderEmail,
            sender: email.sender,
            emails: [],
            isExpanded: expandedGroups.has(email.senderEmail)
          });
        }
        groups.get(email.senderEmail)!.emails.push(email);
      });
      
      return Array.from(groups.values()).sort((a, b) => b.emails.length - a.emails.length);
    }

    if (groupBy === 'date') {
      const groups = new Map<string, EmailGroup>();
      
      emails.forEach(email => {
        const dateKey = new Date(email.date).toDateString();
        if (!groups.has(dateKey)) {
          groups.set(dateKey, {
            senderEmail: dateKey,
            sender: dateKey,
            emails: [],
            isExpanded: expandedGroups.has(dateKey)
          });
        }
        groups.get(dateKey)!.emails.push(email);
      });
      
      return Array.from(groups.values()).sort((a, b) => 
        new Date(b.emails[0].date).getTime() - new Date(a.emails[0].date).getTime()
      );
    }

    return [];
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Convert Email[] to AIEmailGroup format for AI actions
  const convertToAIEmailGroup = (group: EmailGroup): AIEmailGroup => {
    const messages: ParsedMessage[] = group.emails.map(email => ({
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      senderEmail: email.senderEmail,
      date: email.date,
      snippet: email.snippet,
      labels: [] // We don't have labels in current format
    }));

    return {
      senderKey: group.senderEmail,
      senderName: group.sender,
      senderEmail: group.senderEmail,
      relatedEmails: [group.senderEmail],
      messages,
      totalCount: group.emails.length,
      unreadCount: 0, // We don't track unread in current format
      latestDate: group.emails[0]?.date || new Date().toISOString()
    };
  };

  const handleAnalyze = async (group: EmailGroup) => {
    const aiGroup = convertToAIEmailGroup(group);
    const result = await analyzeEmailGroup(aiGroup);
    if (result) {
      setShowActionsFor(group.senderEmail);
    }
  };

  const handleExecuteAction = async (action: any, group: EmailGroup) => {
    const aiGroup = convertToAIEmailGroup(group);
    return executeAction(action, aiGroup);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your emails...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="auth-container card">
        <h1 className="auth-title">Gmail AI Assistant</h1>
        <p className="auth-description">
          Connect your Gmail account to get started with intelligent email management.
        </p>
        <a href="/api/auth/google" className="btn-primary" style={{ textDecoration: 'none' }}>
          Connect with Google
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1>Gmail AI Assistant</h1>
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={checkAuthAndFetchEmails} className="btn-primary">
            Retry
          </button>
          <a href="/api/auth/logout" className="btn-danger" style={{ textDecoration: 'none' }}>
            Clear Auth & Login Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Gmail AI Assistant</h1>
          <p style={{ marginTop: '0.25rem' }}>✅ Connected to Gmail</p>
        </div>
        <a href="/api/auth/logout" className="btn-danger" style={{ textDecoration: 'none' }}>
          Logout
        </a>
      </div>
      
      <div>
        <div className="toolbar">
          <h2>Inbox ({emails.length})</h2>
          <div className="toolbar-section">
            <span className="label">Group by</span>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'sender' | 'date')}
            >
              <option value="none">None</option>
              <option value="sender">Sender</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
        
        {emails.length === 0 ? (
          <div className="empty-state">
            <p>No emails found in your inbox.</p>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {groupEmails(emails).map((group) => {
              const analysis = getAnalysis(group.senderEmail);
              const isAnalyzing = isGroupAnalyzing(group.senderEmail);
              const analysisError = getAnalysisError(group.senderEmail);
              
              return (
                <div key={group.senderEmail} style={{ marginBottom: '1rem' }}>
                  {groupBy !== 'none' && (
                    <div className="group-header">
                      <div 
                        onClick={() => toggleGroup(group.senderEmail)}
                        className="group-info"
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <h3 className="group-title">{group.sender}</h3>
                        <p className="group-count">
                          {group.emails.length} email{group.emails.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {groupBy === 'sender' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyze(group);
                            }}
                            disabled={isAnalyzing}
                            className={isAnalyzing ? 'btn-secondary' : analysis ? 'btn-success' : 'btn-primary'}
                            style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
                          >
                            {isAnalyzing ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></span>
                                Analyzing...
                              </span>
                            ) : analysis ? (
                              '🤖 View AI Actions'
                            ) : (
                              '🤖 Analyze with AI'
                            )}
                          </button>
                        )}
                        <span 
                          onClick={() => toggleGroup(group.senderEmail)}
                          className={`group-chevron ${group.isExpanded ? 'expanded' : ''}`}
                          style={{ cursor: 'pointer' }}
                        >
                          ▶
                        </span>
                      </div>
                    </div>
                  )}
                
                  {(groupBy === 'none' || group.isExpanded) && (
                    <div className={groupBy !== 'none' ? 'group-content' : ''}>
                      {group.emails.map((email) => (
                        <div key={email.id} className="email-card">
                          <div className="email-header">
                            <div style={{ flex: 1 }}>
                              <h4 className="email-subject">{email.subject}</h4>
                              <p className="email-sender">
                                {email.sender} <span style={{ color: 'var(--text-tertiary)' }}>({email.senderEmail})</span>
                              </p>
                            </div>
                            <span className="email-date">{formatDate(email.date)}</span>
                          </div>
                          <p className="email-snippet">{email.snippet}</p>
                        </div>
                      ))}
                      
                      {/* AI Actions Section */}
                      {groupBy === 'sender' && (analysis || isAnalyzing || analysisError) && (
                        <div style={{ 
                          marginTop: '1rem', 
                          padding: '1rem', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border-light)'
                        }}>
                          {isAnalyzing && (
                            <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }}></span>
                                AI is analyzing these emails...
                              </div>
                            </div>
                          )}
                          
                          {analysisError && (
                            <div style={{ 
                              background: '#fef2f2', 
                              border: '1px solid #fecaca', 
                              borderRadius: 'var(--radius)', 
                              padding: '0.75rem',
                              color: '#991b1b'
                            }}>
                              <div>❌ Analysis failed: {analysisError}</div>
                              <button
                                onClick={() => handleAnalyze(group)}
                                className="btn-text"
                                style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                              >
                                Try again
                              </button>
                            </div>
                          )}
                          
                          {analysis && showActionsFor === group.senderEmail && (
                            <ActionSuggestions
                              emailGroup={convertToAIEmailGroup(group)}
                              suggestions={analysis.suggestions}
                              onExecuteAction={(action) => handleExecuteAction(action, group)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <button 
          onClick={checkAuthAndFetchEmails}
          className="btn-success"
          style={{ marginTop: '1.5rem' }}
        >
          Refresh Emails
        </button>
      </div>
    </div>
  );
}
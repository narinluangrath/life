'use client';

import { useState, useEffect } from 'react';

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

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Gmail AI Assistant</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Gmail AI Assistant</h1>
        <p>Connect your Gmail account to get started with intelligent email management.</p>
        <a 
          href="/api/auth/google"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#4285f4',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          Connect with Google
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Gmail AI Assistant</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={checkAuthAndFetchEmails}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            Retry
          </button>
          <a
            href="/api/auth/logout"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Clear Auth & Login Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Gmail AI Assistant</h1>
        <a
          href="/api/auth/logout"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            backgroundColor: '#dc3545',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Logout
        </a>
      </div>
      <p>✅ Successfully connected to Gmail! Here are your recent emails:</p>
      
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Recent Emails ({emails.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>Group by:</span>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'sender' | 'date')}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.9rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="none">None</option>
              <option value="sender">Sender</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
        
        {emails.length === 0 ? (
          <p>No emails found in your inbox.</p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {groupEmails(emails).map((group) => (
              <div key={group.senderEmail} style={{ marginBottom: '1rem' }}>
                {groupBy !== 'none' && (
                  <div 
                    onClick={() => toggleGroup(group.senderEmail)}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#e9ecef',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
                        {groupBy === 'sender' ? group.sender : group.sender}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                        {group.emails.length} email{group.emails.length !== 1 ? 's' : ''}
                        {groupBy === 'sender' && ` (${group.senderEmail})`}
                      </p>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#666' }}>
                      {group.isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                )}
                
                {(groupBy === 'none' || group.isExpanded) && (
                  <div style={{ marginLeft: groupBy !== 'none' ? '1rem' : '0' }}>
                    {group.emails.map((email) => (
                      <div 
                        key={email.id} 
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          backgroundColor: '#f9f9f9'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ 
                              margin: '0 0 0.25rem 0', 
                              fontSize: '1rem',
                              color: '#333'
                            }}>
                              {email.subject}
                            </h4>
                            {groupBy !== 'sender' && (
                              <p style={{ 
                                margin: '0', 
                                fontSize: '0.85rem', 
                                color: '#666' 
                              }}>
                                From: {email.sender} ({email.senderEmail})
                              </p>
                            )}
                          </div>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            color: '#888',
                            whiteSpace: 'nowrap',
                            marginLeft: '1rem'
                          }}>
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <p style={{ 
                          margin: '0.5rem 0 0 0', 
                          fontSize: '0.85rem', 
                          color: '#555',
                          fontStyle: 'italic'
                        }}>
                          {email.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <button 
          onClick={checkAuthAndFetchEmails}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            backgroundColor: '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Refresh Emails
        </button>
      </div>
    </div>
  );
}
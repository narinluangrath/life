export interface DocsCreateParams {
  title: string;
  content?: string;
  folderId?: string;
}

export async function createGoogleDoc(accessToken: string, params: DocsCreateParams) {
  try {
    // Step 1: Create the document
    const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: params.title
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Docs API error: ${createResponse.status} - ${error}`);
    }

    const doc = await createResponse.json();
    const documentId = doc.documentId;

    // Step 2: Add content if provided
    if (params.content) {
      await updateDocContent(accessToken, documentId, params.content);
    }

    // Step 3: Move to folder if specified
    if (params.folderId) {
      await moveDocToFolder(accessToken, documentId, params.folderId);
    }

    return {
      success: true,
      documentId,
      title: doc.title,
      revisionId: doc.revisionId,
      documentUrl: `https://docs.google.com/document/d/${documentId}/edit`
    };
  } catch (error: any) {
    console.error('Google Docs creation error:', error);
    throw error;
  }
}

export async function updateDocContent(accessToken: string, documentId: string, content: string) {
  try {
    // Convert plain text to Docs API requests format
    const requests = [
      {
        insertText: {
          location: {
            index: 1
          },
          text: content
        }
      }
    ];

    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Docs update error: ${response.status} - ${error}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Doc content update error:', error);
    throw error;
  }
}

async function moveDocToFolder(accessToken: string, fileId: string, folderId: string) {
  try {
    // Get current parents
    const getResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Failed to get file parents: ${getResponse.status}`);
    }

    const file = await getResponse.json();
    const previousParents = file.parents ? file.parents.join(',') : '';

    // Move to new folder
    const moveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&removeParents=${previousParents}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!moveResponse.ok) {
      throw new Error(`Failed to move file: ${moveResponse.status}`);
    }

    return await moveResponse.json();
  } catch (error: any) {
    console.error('Move to folder error:', error);
    throw error;
  }
}

export async function createEmailSummaryDoc(
  accessToken: string,
  emails: Array<{
    subject: string;
    from: string;
    date: string;
    snippet: string;
  }>,
  title?: string
) {
  const docTitle = title || `Email Summary - ${new Date().toLocaleDateString()}`;
  
  let content = `Email Summary Report\n`;
  content += `Generated: ${new Date().toLocaleString()}\n`;
  content += `Total Emails: ${emails.length}\n\n`;
  content += `---\n\n`;

  emails.forEach((email, index) => {
    content += `${index + 1}. ${email.subject}\n`;
    content += `   From: ${email.from}\n`;
    content += `   Date: ${email.date}\n`;
    content += `   Preview: ${email.snippet}\n\n`;
  });

  return await createGoogleDoc(accessToken, {
    title: docTitle,
    content
  });
}
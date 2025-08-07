export interface DriveFileParams {
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
  description?: string;
}

export async function createDriveFile(accessToken: string, params: DriveFileParams) {
  try {
    // Create file metadata
    const metadata = {
      name: params.name,
      mimeType: params.mimeType || 'text/plain',
      ...(params.folderId && { parents: [params.folderId] }),
      ...(params.description && { description: params.description })
    };

    // Create multipart form data
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${metadata.mimeType}\r\n\r\n` +
      params.content +
      closeDelimiter;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return {
      success: true,
      fileId: result.id,
      webViewLink: result.webViewLink,
      webContentLink: result.webContentLink,
      name: result.name
    };
  } catch (error: any) {
    console.error('Drive file creation error:', error);
    throw error;
  }
}

export async function createDriveFolder(accessToken: string, folderName: string, parentId?: string) {
  try {
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] })
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return {
      success: true,
      folderId: result.id,
      name: result.name,
      webViewLink: result.webViewLink
    };
  } catch (error: any) {
    console.error('Drive folder creation error:', error);
    throw error;
  }
}

export async function saveEmailToDrive(
  accessToken: string, 
  emailContent: {
    subject: string;
    from: string;
    date: string;
    body: string;
    attachments?: any[];
  },
  customFileName?: string
) {
  const emailDocument = `Subject: ${emailContent.subject}
From: ${emailContent.from}
Date: ${emailContent.date}

---

${emailContent.body}`;

  // Clean up the subject and sender for filename
  const cleanSubject = emailContent.subject.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50);
  const senderName = emailContent.from.split('<')[0].trim().replace(/[^a-zA-Z0-9\s]/g, '') || 
                     emailContent.from.split('@')[0];
  const dateStr = new Date(emailContent.date).toISOString().split('T')[0];
  
  const fileName = customFileName || 
                  `${senderName} - ${cleanSubject} - ${dateStr}.txt`;

  return await createDriveFile(accessToken, {
    name: fileName,
    content: emailDocument,
    mimeType: 'text/plain',
    description: `Email: ${emailContent.subject} from ${emailContent.from}`
  });
}
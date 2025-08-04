#!/usr/bin/env -S deno run --allow-all
/**
 * Gmail Inbox Cleanup - Group and archive emails interactively
 */

import { GmailManager } from "./gmail_manager.ts";

interface GroupedMessages {
  sender: string;
  senderEmail: string;
  messages: Array<{
    id: string;
    subject: string;
    date: string;
    snippet: string;
    isUnread: boolean;
  }>;
}

async function main() {
  console.log("📧 Gmail Inbox Cleanup Tool\n");
  console.log("Initializing Gmail API...");

  const gmail = new GmailManager('./credentials.json', './token.json');
  await gmail.initialize();

  console.log("Fetching inbox messages (this may take a moment)...\n");
  
  // Fetch inbox messages - using label:INBOX instead of in:inbox
  const messages = await gmail.searchMessages("label:INBOX", 100);
  
  if (messages.length === 0) {
    console.log("✨ Your inbox is empty!");
    return;
  }

  console.log(`Found ${messages.length} messages in inbox\n`);

  // Group messages by sender
  const grouped = new Map<string, GroupedMessages>();
  
  for (const msg of messages) {
    // Extract email address from sender
    const emailMatch = msg.sender.match(/<(.+?)>/);
    const email = emailMatch ? emailMatch[1] : msg.sender;
    const name = msg.sender.replace(/<.*>/, "").trim() || email;
    
    if (!grouped.has(email)) {
      grouped.set(email, {
        sender: name,
        senderEmail: email,
        messages: []
      });
    }
    
    grouped.get(email)!.messages.push({
      id: msg.id,
      subject: msg.subject,
      date: msg.date,
      snippet: msg.snippet,
      isUnread: msg.labels.includes("UNREAD")
    });
  }

  // Sort groups by message count
  const sortedGroups = Array.from(grouped.values())
    .sort((a, b) => b.messages.length - a.messages.length);

  console.log(`Messages grouped by ${sortedGroups.length} senders\n`);
  console.log("=" + "=".repeat(70) + "\n");

  // Process each group
  for (let i = 0; i < sortedGroups.length; i++) {
    const group = sortedGroups[i];
    const unreadCount = group.messages.filter(m => m.isUnread).length;
    const unreadIndicator = unreadCount > 0 ? `(${unreadCount} unread)` : "";
    
    console.log(`📬 From: ${group.sender}`);
    console.log(`   Email: ${group.senderEmail}`);
    console.log(`   Messages: ${group.messages.length} ${unreadIndicator}\n`);
    
    // Show first few subjects
    const preview = group.messages.slice(0, 3);
    for (const msg of preview) {
      const icon = msg.isUnread ? "🔵" : "⚪";
      console.log(`   ${icon} ${msg.subject.substring(0, 60)}...`);
    }
    
    if (group.messages.length > 3) {
      console.log(`   ... and ${group.messages.length - 3} more messages`);
    }
    
    console.log("\n   Options:");
    console.log("   [a] Archive all from this sender");
    console.log("   [s] Skip (keep in inbox)");
    console.log("   [v] View all messages from this sender");
    console.log("   [q] Quit\n");
    
    console.log(`   Action (${i + 1}/${sortedGroups.length}): `);
    
    const buf = new Uint8Array(10);
    const n = await Deno.stdin.read(buf);
    if (n === null) continue;
    
    const choice = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
    
    switch (choice) {
      case 'a':
        console.log("\n   Archiving...");
        let archived = 0;
        for (const msg of group.messages) {
          const success = await gmail.archiveMessage(msg.id);
          if (success) archived++;
        }
        console.log(`   ✅ Archived ${archived} messages from ${group.sender}\n`);
        break;
        
      case 'v':
        console.log("\n   All messages from this sender:\n");
        for (const msg of group.messages) {
          const icon = msg.isUnread ? "🔵" : "⚪";
          console.log(`   ${icon} ${msg.subject}`);
          console.log(`      ID: ${msg.id}`);
          console.log(`      ${msg.snippet.substring(0, 100)}...`);
          console.log();
        }
        console.log("   Archive all? [y/n]: ");
        
        const buf2 = new Uint8Array(10);
        const n2 = await Deno.stdin.read(buf2);
        if (n2) {
          const confirm = new TextDecoder().decode(buf2.subarray(0, n2)).trim().toLowerCase();
          if (confirm === 'y') {
            console.log("\n   Archiving...");
            let archived = 0;
            for (const msg of group.messages) {
              const success = await gmail.archiveMessage(msg.id);
              if (success) archived++;
            }
            console.log(`   ✅ Archived ${archived} messages\n`);
          } else {
            console.log("   ⏭️  Skipped\n");
          }
        }
        break;
        
      case 's':
        console.log("   ⏭️  Skipped\n");
        break;
        
      case 'q':
        console.log("\n👋 Exiting...");
        Deno.exit(0);
        
      default:
        console.log("   ⏭️  Skipped\n");
    }
    
    console.log("-" + "-".repeat(70) + "\n");
  }
  
  // Summary
  const remaining = await gmail.searchMessages("in:inbox", 100);
  console.log("\n📊 Cleanup Complete!");
  console.log(`   Remaining in inbox: ${remaining.length} messages`);
  
  if (remaining.length > 0) {
    const unreadRemaining = remaining.filter(m => m.labels.includes("UNREAD")).length;
    if (unreadRemaining > 0) {
      console.log(`   Unread messages: ${unreadRemaining}`);
    }
  }
}

if (import.meta.main) {
  main();
}
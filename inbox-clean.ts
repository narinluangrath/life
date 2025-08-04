#!/usr/bin/env -S deno run --allow-all
/**
 * Gmail Inbox Cleanup - Efficient batch processing
 */

import { GmailManager } from "./gmail_manager.ts";

interface GroupedMessages {
  sender: string;
  senderEmail: string;
  count: number;
  unreadCount: number;
  allMessageIds: string[];  // Store ALL message IDs
  messages: Array<{         // Keep preview messages
    id: string;
    subject: string;
    snippet: string;
    isUnread: boolean;
  }>;
}

async function main() {
  console.log("📧 Gmail Inbox Cleanup\n");

  const gmail = new GmailManager('./credentials.json', './token.json');
  await gmail.initialize();

  // Fetch inbox messages with progress feedback
  console.log("Fetching inbox messages...");
  
  // Add some user feedback during the fetch
  let dots = 0;
  const progressTimer = setInterval(() => {
    dots++;
    process.stdout.write(".");
    if (dots % 10 === 0) {
      console.log(` (${dots}s)`);
    }
  }, 1000);
  
  // Fetch all inbox messages at once but with timeout feedback
  const messages = await gmail.searchMessages("label:INBOX", 60);
  
  clearInterval(progressTimer);
  if (dots > 0) console.log(); // New line after dots
  
  if (messages.length === 0) {
    console.log("✨ Your inbox is empty!");
    return;
  }

  console.log(`\nTotal: ${messages.length} messages fetched\n`);

  // Group by sender
  const grouped = new Map<string, GroupedMessages>();
  
  for (const msg of messages) {
    const emailMatch = msg.sender.match(/<(.+?)>/);
    const email = emailMatch ? emailMatch[1] : msg.sender;
    const name = msg.sender.replace(/<.*>/, "").trim() || email;
    
    if (!grouped.has(email)) {
      grouped.set(email, {
        sender: name,
        senderEmail: email,
        count: 0,
        unreadCount: 0,
        allMessageIds: [],
        messages: []
      });
    }
    
    const group = grouped.get(email)!;
    group.count++;
    group.allMessageIds.push(msg.id);  // Store ALL message IDs
    
    if (msg.labels.includes("UNREAD")) {
      group.unreadCount++;
    }
    
    // Keep only first 5 messages per sender for preview
    if (group.messages.length < 5) {
      group.messages.push({
        id: msg.id,
        subject: msg.subject,
        snippet: msg.snippet,
        isUnread: msg.labels.includes("UNREAD")
      });
    }
  }

  // Sort by message count
  const sortedGroups = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count);

  console.log("=" + "=".repeat(60));
  console.log("\nINBOX SUMMARY BY SENDER\n");
  console.log("=" + "=".repeat(60) + "\n");

  // Show summary first
  for (let i = 0; i < sortedGroups.length; i++) {
    const group = sortedGroups[i];
    const unread = group.unreadCount > 0 ? ` (${group.unreadCount} unread)` : "";
    console.log(`${i + 1}. ${group.sender}`);
    console.log(`   ${group.count} messages${unread}`);
    console.log(`   ${group.senderEmail}`);
    console.log();
  }

  console.log("-" + "-".repeat(60) + "\n");
  console.log("Options:");
  console.log("  [#]  Process sender by number");
  console.log("  [a]  Process all interactively");
  console.log("  [q]  Quit\n");
  console.log("Choice: ");

  const buf = new Uint8Array(10);
  const n = await Deno.stdin.read(buf);
  if (!n) return;
  
  const choice = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
  
  if (choice === 'q') {
    console.log("👋 Goodbye!");
    return;
  }
  
  if (choice === 'a') {
    // Process all groups
    for (let i = 0; i < sortedGroups.length; i++) {
      await processGroup(gmail, sortedGroups[i], i + 1, sortedGroups.length);
    }
  } else {
    // Process specific sender
    const num = parseInt(choice);
    if (num > 0 && num <= sortedGroups.length) {
      await processGroup(gmail, sortedGroups[num - 1], num, sortedGroups.length);
    } else {
      console.log("Invalid choice");
    }
  }
  
  // Show final status
  console.log("\n📊 Checking final inbox status...");
  const remaining = await gmail.searchMessages("label:INBOX", 20);
  console.log(`\n✅ Complete! ${remaining.length} messages remain in inbox`);
}

async function processGroup(
  gmail: GmailManager, 
  group: GroupedMessages, 
  current: number, 
  total: number
) {
  console.log("\n" + "=" + "=".repeat(60));
  console.log(`\n[${current}/${total}] ${group.sender}`);
  console.log(`${group.count} messages${group.unreadCount > 0 ? ` (${group.unreadCount} unread)` : ""}`);
  console.log(`Email: ${group.senderEmail}\n`);
  
  // Show message preview
  for (const msg of group.messages) {
    const icon = msg.isUnread ? "🔵" : "⚪";
    console.log(`${icon} ${msg.subject.substring(0, 60)}`);
    if (msg.snippet) {
      console.log(`   ${msg.snippet.substring(0, 70)}...`);
    }
  }
  
  if (group.count > group.messages.length) {
    console.log(`\n... and ${group.count - group.messages.length} more messages`);
  }
  
  console.log("\nAction:");
  console.log("  [a] Archive all from this sender");
  console.log("  [s] Skip");
  console.log("  [q] Quit");
  console.log("\nChoice: ");
  
  const buf = new Uint8Array(10);
  const n = await Deno.stdin.read(buf);
  if (!n) return;
  
  const choice = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
  
  switch (choice) {
    case 'a':
      console.log(`\nArchiving ${group.allMessageIds.length} messages...`);
      let archived = 0;
      for (const messageId of group.allMessageIds) {
        if (await gmail.archiveMessage(messageId)) {
          archived++;
          // Show progress every 5 messages
          if (archived % 5 === 0) {
            console.log(`  Archived ${archived}/${group.allMessageIds.length}...`);
          }
        }
      }
      console.log(`✅ Archived ${archived} messages from ${group.sender}`);
      break;
      
    case 'q':
      console.log("👋 Exiting...");
      Deno.exit(0);
      
    default:
      console.log("⏭️  Skipped");
  }
}

if (import.meta.main) {
  main();
}
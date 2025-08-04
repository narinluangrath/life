#!/usr/bin/env -S deno run --allow-all
/**
 * Test Gmail API connection
 */

import { GmailManager } from "./gmail_manager.ts";

async function main() {
  console.log("Testing Gmail API...\n");

  try {
    const gmail = new GmailManager('./credentials.json', './token.json');
    console.log("1. Initializing...");
    await gmail.initialize();
    console.log("✓ Initialized\n");

    console.log("2. Testing with small query...");
    const test = await gmail.getMessages("", 2);
    console.log(`✓ Got ${test.length} messages\n`);

    console.log("3. Testing inbox query...");
    const inbox = await gmail.searchMessages("label:INBOX", 5);
    console.log(`✓ Found ${inbox.length} inbox messages\n`);
    
    if (inbox.length > 0) {
      console.log("Sample message:");
      console.log(`  From: ${inbox[0].sender}`);
      console.log(`  Subject: ${inbox[0].subject}`);
    }

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("Error:", error);
  }
}

if (import.meta.main) {
  main();
}
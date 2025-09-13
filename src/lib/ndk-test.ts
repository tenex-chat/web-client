#!/usr/bin/env bun
/**
 * Test script to verify NDK connection with provided nsec
 * Run with: bun run src/lib/ndk-test.ts
 */

import NDK, { NDKPrivateKeySigner } from "@nostr-dev-kit/ndk-hooks";
import { nip19 } from "nostr-tools";
import { logger } from "./logger";

const TEST_NSEC =
  process.env.TEST_NSEC ||
  "nsec1q9kaf583ud7f9jm4xtmj8052uvym9jasy502xnvwxqmsq8lxtmfsvgqa8v";

async function testNDKConnection() {
  logger.info("🔐 Testing NDK with provided nsec...");

  try {
    // Decode nsec to get private key
    const decoded = nip19.decode(TEST_NSEC);
    if (decoded.type !== "nsec") {
      throw new Error("Invalid nsec format");
    }

    const privateKey = Buffer.from(decoded.data).toString("hex");
    logger.info("✅ nsec decoded successfully");

    // Create signer
    const signer = new NDKPrivateKeySigner(privateKey);
    const user = await signer.user();
    logger.info("✅ Signer created");
    logger.info("📝 Public key (npub):", user.npub);
    logger.info("📝 Public key (hex):", user.pubkey);

    // Initialize NDK
    const ndk = new NDK({
      explicitRelayUrls: ["wss://tenex.chat"],
      signer,
    });

    logger.info("🔌 Connecting to relays...");
    await ndk.connect();
    logger.info("✅ Connected to relays");

    // Fetch user metadata
    logger.info("👤 Fetching user profile...");
    const ndkUser = ndk.getUser({ pubkey: user.pubkey });
    await ndkUser.fetchProfile();

    if (ndkUser.profile) {
      logger.info("✅ Profile fetched:");
      logger.info("  Name:", ndkUser.profile.name || "Not set");
      logger.info("  Display Name:", ndkUser.profile.displayName || "Not set");
      logger.info("  About:", ndkUser.profile.about || "Not set");
      logger.info("  Picture:", ndkUser.profile.image || "Not set");
    } else {
      logger.info("ℹ️ No profile metadata found");
    }

    // Test fetching some events
    logger.info("\n📊 Fetching recent events...");
    const events = await ndk.fetchEvents({
      authors: [user.pubkey],
      limit: 5,
    });

    logger.info(`✅ Found ${events.size} events from this user`);

    // Test fetching projects (kind 31933)
    logger.info("\n📁 Fetching projects...");
    const projects = await ndk.fetchEvents({
      kinds: [31933],
      authors: [user.pubkey],
      limit: 10,
    });

    logger.info(`✅ Found ${projects.size} projects`);
    if (projects.size > 0) {
      logger.info("Projects:");
      projects.forEach((project) => {
        const title =
          project.tagValue("title") || project.tagValue("name") || "Untitled";
        logger.info(`  - ${title} (${project.id.substring(0, 8)}...)`);
      });
    }

    // Test fetching agents (kind 4199)
    logger.info("\n🤖 Fetching agents...");
    const agents = await ndk.fetchEvents({
      kinds: [4199 as any],
      limit: 10,
    });

    logger.info(`✅ Found ${agents.size} agents`);
    if (agents.size > 0) {
      logger.info("Agents:");
      agents.forEach((agent) => {
        const name = agent.tagValue("name") || "Unnamed Agent";
        logger.info(`  - ${name} by ${agent.pubkey.substring(0, 8)}...`);
      });
    }

    logger.info(
      "\n✅ All tests passed! NDK is working correctly with the provided nsec.",
    );
    logger.info("📌 You can now use this nsec for testing the application.");

    // NDK doesn't have a disconnect method, connections are managed automatically
    logger.info("🔌 NDK connections will close when process exits");
  } catch (error) {
    logger.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the test
testNDKConnection();

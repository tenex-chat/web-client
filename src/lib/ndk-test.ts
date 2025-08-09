#!/usr/bin/env bun
/**
 * Test script to verify NDK connection with provided nsec
 * Run with: bun run src/lib/ndk-test.ts
 */

import NDK, { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk'
import { nip19 } from 'nostr-tools'

const TEST_NSEC = process.env.TEST_NSEC || 'nsec1q9kaf583ud7f9jm4xtmj8052uvym9jasy502xnvwxqmsq8lxtmfsvgqa8v'

async function testNDKConnection() {
  console.log('🔐 Testing NDK with provided nsec...')
  
  try {
    // Decode nsec to get private key
    const decoded = nip19.decode(TEST_NSEC)
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec format')
    }
    
    const privateKey = Buffer.from(decoded.data).toString('hex')
    console.log('✅ nsec decoded successfully')
    
    // Create signer
    const signer = new NDKPrivateKeySigner(privateKey)
    const user = await signer.user()
    console.log('✅ Signer created')
    console.log('📝 Public key (npub):', user.npub)
    console.log('📝 Public key (hex):', user.pubkey)
    
    // Initialize NDK
    const ndk = new NDK({
      explicitRelayUrls: [
        'wss://tenex.chat'
      ],
      signer
    })
    
    console.log('🔌 Connecting to relays...')
    await ndk.connect()
    console.log('✅ Connected to relays')
    
    // Fetch user metadata
    console.log('👤 Fetching user profile...')
    const ndkUser = ndk.getUser({ pubkey: user.pubkey })
    await ndkUser.fetchProfile()
    
    if (ndkUser.profile) {
      console.log('✅ Profile fetched:')
      console.log('  Name:', ndkUser.profile.name || 'Not set')
      console.log('  Display Name:', ndkUser.profile.displayName || 'Not set')
      console.log('  About:', ndkUser.profile.about || 'Not set')
      console.log('  Picture:', ndkUser.profile.image || 'Not set')
    } else {
      console.log('ℹ️ No profile metadata found')
    }
    
    // Test fetching some events
    console.log('\n📊 Fetching recent events...')
    const events = await ndk.fetchEvents({
      authors: [user.pubkey],
      limit: 5
    })
    
    console.log(`✅ Found ${events.size} events from this user`)
    
    // Test fetching projects (kind 31933)
    console.log('\n📁 Fetching projects...')
    const projects = await ndk.fetchEvents({
      kinds: [31933],
      authors: [user.pubkey],
      limit: 10
    })
    
    console.log(`✅ Found ${projects.size} projects`)
    if (projects.size > 0) {
      console.log('Projects:')
      projects.forEach(project => {
        const title = project.tagValue('title') || project.tagValue('name') || 'Untitled'
        console.log(`  - ${title} (${project.id.substring(0, 8)}...)`)
      })
    }
    
    // Test fetching agents (kind 4199)
    console.log('\n🤖 Fetching agents...')
    const agents = await ndk.fetchEvents({
      kinds: [4199 as any],
      limit: 10
    })
    
    console.log(`✅ Found ${agents.size} agents`)
    if (agents.size > 0) {
      console.log('Agents:')
      agents.forEach(agent => {
        const name = agent.tagValue('name') || 'Unnamed Agent'
        console.log(`  - ${name} by ${agent.pubkey.substring(0, 8)}...`)
      })
    }
    
    console.log('\n✅ All tests passed! NDK is working correctly with the provided nsec.')
    console.log('📌 You can now use this nsec for testing the application.')
    
    // NDK doesn't have a disconnect method, connections are managed automatically
    console.log('🔌 NDK connections will close when process exits')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the test
testNDKConnection()
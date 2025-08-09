#!/usr/bin/env bun
/**
 * Quick test to verify nsec decoding and pubkey generation
 */

import { nip19, getPublicKey } from 'nostr-tools'

const TEST_NSEC = 'nsec1q9kaf583ud7f9jm4xtmj8052uvym9jasy502xnvwxqmsq8lxtmfsvgqa8v'

try {
  console.log('🔐 Verifying nsec...')
  
  // Decode nsec
  const decoded = nip19.decode(TEST_NSEC)
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec format')
  }
  
  const privateKeyBytes = decoded.data as Uint8Array
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex')
  console.log('✅ nsec decoded successfully')
  console.log('🔑 Private key (hex):', privateKeyHex.substring(0, 8) + '...')
  
  // Get public key
  const publicKeyHex = getPublicKey(privateKeyBytes)
  console.log('📝 Public key (hex):', publicKeyHex)
  
  // Encode as npub
  const npub = nip19.npubEncode(publicKeyHex)
  console.log('📝 Public key (npub):', npub)
  
  console.log('\n✅ nsec is valid and ready to use!')
  console.log('You can now use this for testing with real Nostr events.')
  
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
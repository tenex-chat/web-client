#!/usr/bin/env bun
/**
 * Quick test to verify nsec decoding and pubkey generation
 */

import { nip19, getPublicKey } from 'nostr-tools'
import { TEST_CREDENTIALS } from './constants'
import { logger } from './logger'

const TEST_NSEC = TEST_CREDENTIALS.NSEC

try {
  logger.info('🔐 Verifying nsec...')
  
  // Decode nsec
  const decoded = nip19.decode(TEST_NSEC)
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec format')
  }
  
  const privateKeyBytes = decoded.data as Uint8Array
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex')
  logger.info('✅ nsec decoded successfully')
  logger.info('🔑 Private key (hex):', privateKeyHex.substring(0, 8) + '...')
  
  // Get public key
  const publicKeyHex = getPublicKey(privateKeyBytes)
  logger.info('📝 Public key (hex):', publicKeyHex)
  
  // Encode as npub
  const npub = nip19.npubEncode(publicKeyHex)
  logger.info('📝 Public key (npub):', npub)
  
  logger.info('\n✅ nsec is valid and ready to use!')
  logger.info('You can now use this for testing with real Nostr events.')
  
} catch (error) {
  logger.error('❌ Error:', error)
  process.exit(1)
}
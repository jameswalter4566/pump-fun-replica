import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Keypair, Connection, VersionedTransaction } from 'https://esm.sh/@solana/web3.js@1.95.8'
import bs58 from 'https://esm.sh/bs58@6.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PUMP_PORTAL_URL = 'https://pumpportal.fun/api/trade-local'
const PUMP_IPFS_URL = 'https://pump.fun/api/ipfs'
const WEBSITE_URL = 'https://pumpvthree.fun/'
const TWITTER_URL = 'https://x.com/pumpvtwo'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const DEVELOPER_KEY = Deno.env.get('DEVELOPER_KEY') || ''
const SOLANA_RPC_URL = Deno.env.get('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function uploadMetadata(params: {
  name: string
  symbol: string
  description: string
  imageBase64?: string
}): Promise<string> {
  console.log('[deploy-token] uploading metadata for', params.name)

  const formData = new FormData()
  formData.append('name', params.name)
  formData.append('symbol', params.symbol)
  formData.append('description', params.description)
  formData.append('twitter', TWITTER_URL)
  formData.append('telegram', '')
  formData.append('website', WEBSITE_URL)
  formData.append('showName', 'true')

  if (params.imageBase64) {
    // Strip data URL prefix if present
    let base64Data = params.imageBase64
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1]
    }

    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('file', blob, 'image.png')
  }

  const response = await fetch(PUMP_IPFS_URL, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to upload metadata: ${response.status} ${text}`)
  }

  const result = await response.json()
  console.log('[deploy-token] metadata uploaded:', result.metadataUri)
  return result.metadataUri
}

async function createToken(params: {
  name: string
  symbol: string
  metadataUri: string
  developerKeypair: Keypair
  connection: Connection
}): Promise<{ mintAddress: string; signature: string; pumpUrl: string }> {
  console.log('[deploy-token] creating token:', params.name)

  const mintKeypair = Keypair.generate()

  const pumpPayload = {
    publicKey: params.developerKeypair.publicKey.toBase58(),
    action: 'create',
    tokenMetadata: {
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
    },
    mint: mintKeypair.publicKey.toBase58(),
    denominatedInSol: 'true',
    amount: 0.0001,
    slippage: 10,
    priorityFee: 0.0005,
    pool: 'pump',
  }

  console.log('[deploy-token] sending to PumpPortal')

  const response = await fetch(PUMP_PORTAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pumpPayload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PumpPortal API error: ${response.status} ${text}`)
  }

  const txBuffer = await response.arrayBuffer()
  const tx = VersionedTransaction.deserialize(new Uint8Array(txBuffer))

  tx.sign([mintKeypair, params.developerKeypair])

  const signature = await params.connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  })

  console.log('[deploy-token] transaction sent:', signature)

  const confirmation = await params.connection.confirmTransaction(signature, 'confirmed')
  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
  }

  const mintAddress = mintKeypair.publicKey.toBase58()
  const pumpUrl = `https://pump.fun/coin/${mintAddress}`

  console.log('[deploy-token] token created:', { mintAddress, signature, pumpUrl })

  return { mintAddress, signature, pumpUrl }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Missing Supabase credentials' }, 500)
  }

  if (!DEVELOPER_KEY) {
    return jsonResponse({ error: 'Missing developer key' }, 500)
  }

  try {
    const body = await req.json()

    if (!body.name || !body.symbol) {
      return jsonResponse({ error: 'Name and symbol are required' }, 400)
    }

    console.log('[deploy-token] received request:', { name: body.name, symbol: body.symbol })

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    const developerKeypair = Keypair.fromSecretKey(bs58.decode(DEVELOPER_KEY))

    console.log('[deploy-token] developer wallet:', developerKeypair.publicKey.toBase58())

    const description = body.description || `Token created on pumpv3: ${body.name}`

    const metadataUri = await uploadMetadata({
      name: body.name,
      symbol: body.symbol,
      description: description,
      imageBase64: body.imageBase64 || undefined,
    })

    const result = await createToken({
      name: body.name,
      symbol: body.symbol,
      metadataUri: metadataUri,
      developerKeypair,
      connection,
    })

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: insertedData, error: insertError } = await supabase
      .from('token_launches')
      .insert({
        token_name: body.name,
        description: description,
        image_url: null,
        created_by: body.createdBy || 'pumpv3',
        yes_outcome: body.symbol,
        no_outcome: body.symbol,
        yes_mint_address: result.mintAddress,
        no_mint_address: result.mintAddress,
        yes_tx_signature: result.signature,
        no_tx_signature: result.signature,
        yes_pump_url: result.pumpUrl,
        no_pump_url: result.pumpUrl,
        category: 'meme',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[deploy-token] database insert failed:', insertError)
    }

    console.log('[deploy-token] completed successfully')

    return jsonResponse({
      success: true,
      token: {
        id: insertedData?.id,
        name: body.name,
        symbol: body.symbol,
        description: description,
        mintAddress: result.mintAddress,
        signature: result.signature,
        pumpUrl: result.pumpUrl,
      },
    })
  } catch (error) {
    console.error('[deploy-token] failed:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Launch failed' },
      500
    )
  }
})

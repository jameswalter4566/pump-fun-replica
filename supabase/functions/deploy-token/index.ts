import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Keypair, Connection, VersionedTransaction } from "https://esm.sh/@solana/web3.js@1.87.6";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const DEVELOPER_KEY = Deno.env.get('DEVELOPER_KEY')!;

    // RPC endpoint - using public Solana RPC
    const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const { name, symbol, description, imageBase64, createdBy } = await req.json();

    if (!name || !symbol || !description || !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, symbol, description, imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating token: ${name} (${symbol})`);

    // Step 1: Upload image to pump.fun IPFS
    const imageBlob = base64ToBlob(imageBase64);
    const formData = new FormData();
    formData.append('file', imageBlob, `${symbol}.png`);
    formData.append('name', name);
    formData.append('symbol', symbol);
    formData.append('description', description);
    formData.append('twitter', 'https://x.com/pumpvtwo');
    formData.append('website', 'https://pumpvthree.fun/');
    formData.append('showName', 'true');

    console.log('Uploading metadata to IPFS...');
    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!ipfsResponse.ok) {
      const errorText = await ipfsResponse.text();
      console.error('IPFS upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload to IPFS', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ipfsData = await ipfsResponse.json();
    console.log('IPFS response:', ipfsData);
    const metadataUri = ipfsData.metadataUri;

    // Step 2: Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey.toBase58();

    // Step 3: Get developer wallet from secret
    let developerKeypair: Keypair;
    try {
      // Try parsing as base58 private key
      const secretKey = bs58.decode(DEVELOPER_KEY);
      developerKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      // Try parsing as JSON array
      try {
        const secretKeyArray = JSON.parse(DEVELOPER_KEY);
        developerKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      } catch (e2) {
        return new Response(
          JSON.stringify({ error: 'Invalid DEVELOPER_KEY format' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const developerPublicKey = developerKeypair.publicKey.toBase58();
    console.log('Developer wallet:', developerPublicKey);

    // Step 4: Create token using pump portal local API
    console.log('Creating token transaction...');
    const createResponse = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: developerPublicKey,
        action: 'create',
        tokenMetadata: {
          name: name,
          symbol: symbol,
          uri: metadataUri
        },
        mint: mintPublicKey,
        denominatedInSol: 'true',
        amount: 0.0001, // Small initial dev buy
        slippage: 10,
        priorityFee: 0.0005,
        pool: 'pump'
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Token creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create token transaction', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Sign and send transaction
    const txData = await createResponse.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(txData));

    // Sign with both developer keypair and mint keypair
    tx.sign([developerKeypair, mintKeypair]);

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('Sending transaction...');
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    console.log('Transaction signature:', signature);

    // Step 6: Upload image to Supabase storage as backup
    const storagePath = `tokens/${mintPublicKey}.png`;
    const { error: uploadError } = await supabase.storage
      .from('prediction-images')
      .upload(storagePath, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
    }

    const { data: publicUrlData } = supabase.storage
      .from('prediction-images')
      .getPublicUrl(storagePath);

    const supabaseImageUrl = publicUrlData?.publicUrl || ipfsData.metadata?.image;

    // Step 7: Save to database
    const pumpUrl = `https://pump.fun/coin/${mintPublicKey}`;

    const { data: insertData, error: insertError } = await supabase
      .from('token_launches')
      .insert({
        token_name: name,
        description: description,
        image_url: supabaseImageUrl,
        created_by: createdBy || 'pumpv3',
        yes_outcome: symbol,
        no_outcome: 'N/A',
        yes_mint_address: mintPublicKey,
        no_mint_address: null,
        yes_tx_signature: signature,
        no_tx_signature: null,
        yes_pump_url: pumpUrl,
        no_pump_url: null,
        category: 'meme'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({
          error: 'Token created but failed to save to database',
          signature,
          mintAddress: mintPublicKey,
          pumpUrl,
          details: insertError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        token: {
          id: insertData.id,
          name: name,
          symbol: symbol,
          description: description,
          mintAddress: mintPublicKey,
          signature: signature,
          pumpUrl: pumpUrl,
          imageUrl: supabaseImageUrl
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string): Blob {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

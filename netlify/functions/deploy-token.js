const { createClient } = require('@supabase/supabase-js');

// Environment variables will be set in Netlify
const SUPABASE_URL = 'https://bqncfjnigubyictxbliq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEVELOPER_KEY = process.env.DEVELOPER_KEY;

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { name, symbol, description, imageBase64, createdBy } = JSON.parse(event.body);

    if (!name || !symbol || !description || !imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: name, symbol, description, imageBase64' }),
      };
    }

    console.log(`Creating token: ${name} (${symbol})`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Convert base64 to blob and upload to pump.fun IPFS
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Create FormData for IPFS upload
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', imageBuffer, { filename: `${symbol}.png`, contentType: 'image/png' });
    formData.append('name', name);
    formData.append('symbol', symbol);
    formData.append('description', description);
    formData.append('twitter', 'https://x.com/pumpvtwo');
    formData.append('website', 'https://pumpvthree.fun/');
    formData.append('showName', 'true');

    console.log('Uploading metadata to IPFS...');

    const fetch = require('node-fetch');
    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!ipfsResponse.ok) {
      const errorText = await ipfsResponse.text();
      console.error('IPFS upload failed:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to upload to IPFS', details: errorText }),
      };
    }

    const ipfsData = await ipfsResponse.json();
    console.log('IPFS response:', ipfsData);
    const metadataUri = ipfsData.metadataUri;

    // Step 2: Generate mint keypair using @solana/web3.js
    const { Keypair, Connection, VersionedTransaction } = require('@solana/web3.js');
    const bs58 = require('bs58');

    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey.toBase58();

    // Step 3: Get developer wallet from secret
    let developerKeypair;
    try {
      const secretKey = bs58.decode(DEVELOPER_KEY);
      developerKeypair = Keypair.fromSecretKey(secretKey);
    } catch (e) {
      try {
        const secretKeyArray = JSON.parse(DEVELOPER_KEY);
        developerKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
      } catch (e2) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Invalid DEVELOPER_KEY format' }),
        };
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
        amount: 0.0001,
        slippage: 10,
        priorityFee: 0.0005,
        pool: 'pump'
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Token creation failed:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to create token transaction', details: errorText }),
      };
    }

    // Step 5: Sign and send transaction
    const txBuffer = await createResponse.buffer();
    const tx = VersionedTransaction.deserialize(txBuffer);

    // Sign with both developer keypair and mint keypair
    tx.sign([developerKeypair, mintKeypair]);

    const RPC_ENDPOINT = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
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
      .upload(storagePath, imageBuffer, {
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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Token created but failed to save to database',
          signature,
          mintAddress: mintPublicKey,
          pumpUrl,
          details: insertError.message
        }),
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
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
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

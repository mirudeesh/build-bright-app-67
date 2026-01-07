import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to fetch stock price
async function getStockPrice(symbol: string) {
  try {
    console.log('Fetching stock price for:', symbol);
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const data = await response.json();
    
    if (data.chart?.result?.[0]?.meta) {
      const meta = data.chart.result[0].meta;
      return {
        symbol: symbol.toUpperCase(),
        price: meta.regularMarketPrice,
        currency: meta.currency,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
        changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100).toFixed(2),
        marketState: meta.marketState
      };
    }
    return { error: 'Stock not found' };
  } catch (error) {
    console.error('Error fetching stock:', error);
    return { error: 'Failed to fetch stock price' };
  }
}

// Function to fetch news headlines
async function getNewsHeadlines(topic?: string) {
  try {
    console.log('Fetching news for topic:', topic || 'general');
    const query = topic ? encodeURIComponent(topic) : 'technology';
    const response = await fetch(`https://newsapi.org/v2/top-headlines?q=${query}&pageSize=5&apiKey=demo`);
    const data = await response.json();
    
    if (data.articles && data.articles.length > 0) {
      return {
        headlines: data.articles.slice(0, 5).map((article: any) => ({
          title: article.title,
          source: article.source.name,
          url: article.url,
          publishedAt: article.publishedAt
        }))
      };
    }
    
    // Fallback to general topics if API fails
    return {
      headlines: [
        { title: 'Unable to fetch live news. Please try again later.', source: 'System', url: '', publishedAt: new Date().toISOString() }
      ]
    };
  } catch (error) {
    console.error('Error fetching news:', error);
    return { error: 'Failed to fetch news headlines' };
  }
}

// Function to fetch sports scores
async function getSportsScores(sport?: string) {
  try {
    console.log('Fetching sports scores for:', sport || 'general');
    const sportType = sport?.toLowerCase() || 'basketball';
    const espnSport = sportType === 'soccer' ? 'football' : sportType;
    
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${espnSport}/nba/scoreboard`);
    const data = await response.json();
    
    if (data.events && data.events.length > 0) {
      return {
        sport: espnSport,
        games: data.events.slice(0, 5).map((event: any) => ({
          name: event.name,
          status: event.status.type.description,
          homeTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home')?.team.displayName,
          awayTeam: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away')?.team.displayName,
          homeScore: event.competitions[0].competitors.find((c: any) => c.homeAway === 'home')?.score,
          awayScore: event.competitions[0].competitors.find((c: any) => c.homeAway === 'away')?.score,
        }))
      };
    }
    
    return { message: 'No recent games found for this sport' };
  } catch (error) {
    console.error('Error fetching sports scores:', error);
    return { error: 'Failed to fetch sports scores' };
  }
}

// Function to fetch weather
async function getWeather(city: string) {
  try {
    console.log('Fetching weather for:', city);
    // Using wttr.in API (no key required)
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const data = await response.json();
    
    if (data.current_condition && data.current_condition[0]) {
      const current = data.current_condition[0];
      const location = data.nearest_area?.[0];
      return {
        city: location?.areaName?.[0]?.value || city,
        country: location?.country?.[0]?.value || '',
        temperature: {
          celsius: current.temp_C,
          fahrenheit: current.temp_F
        },
        feelsLike: {
          celsius: current.FeelsLikeC,
          fahrenheit: current.FeelsLikeF
        },
        condition: current.weatherDesc?.[0]?.value || 'Unknown',
        humidity: current.humidity + '%',
        windSpeed: current.windspeedKmph + ' km/h',
        windDirection: current.winddir16Point,
        visibility: current.visibility + ' km',
        uvIndex: current.uvIndex
      };
    }
    return { error: 'Weather data not available for this location' };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return { error: 'Failed to fetch weather data' };
  }
}

// Function to fetch cryptocurrency prices
async function getCryptoPrice(symbol: string) {
  try {
    console.log('Fetching crypto price for:', symbol);
    const coinId = symbol.toLowerCase();
    // Map common symbols to CoinGecko IDs
    const symbolMap: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'xrp': 'ripple',
      'doge': 'dogecoin',
      'ada': 'cardano',
      'sol': 'solana',
      'dot': 'polkadot',
      'matic': 'matic-network',
      'link': 'chainlink',
      'ltc': 'litecoin',
      'avax': 'avalanche-2',
      'bnb': 'binancecoin'
    };
    
    const id = symbolMap[coinId] || coinId;
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
    const data = await response.json();
    
    if (data[id]) {
      return {
        symbol: symbol.toUpperCase(),
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: data[id].usd,
        change24h: data[id].usd_24h_change?.toFixed(2) + '%',
        marketCap: data[id].usd_market_cap
      };
    }
    return { error: 'Cryptocurrency not found' };
  } catch (error) {
    console.error('Error fetching crypto:', error);
    return { error: 'Failed to fetch cryptocurrency price' };
  }
}

// Function to verify OTP code
async function verifyOtpCode(code: string, authToken: string) {
  try {
    console.log('Verifying OTP code via chat');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate code format
    if (!code || !/^\d{6}$/.test(code)) {
      return { success: false, error: 'Invalid code format. Must be 6 digits.' };
    }

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (fetchError || !otpRecord) {
      return { success: false, error: 'Invalid or expired code' };
    }

    // Mark OTP as verified
    await supabase
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    return { success: true, message: 'OTP verified successfully! You now have full access.' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'Failed to verify OTP' };
  }
}

// Input validation
function validateMessages(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  if (messages.length === 0 || messages.length > 50) return false;
  
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return false;
    if (!['user', 'assistant'].includes(msg.role)) return false;
    
    // Validate content
    if (typeof msg.content === 'string') {
      if (msg.content.length > 50000) return false; // Max 50k chars per message
    } else if (Array.isArray(msg.content)) {
      if (msg.content.length > 10) return false; // Max 10 content items
      for (const item of msg.content) {
        if (item.type === 'text' && typeof item.text === 'string') {
          if (item.text.length > 50000) return false;
        } else if (item.type === 'image_url' && item.image_url?.url) {
          if (typeof item.image_url.url !== 'string' || item.image_url.url.length > 5000000) return false;
        }
      }
    } else {
      return false;
    }
  }
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages } = body;
    
    // Validate input
    if (!validateMessages(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid message format or content too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing chat request with', messages.length, 'messages');

    // Get current date and time
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    // Define available functions for the AI
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_stock_price',
          description: 'Get the current stock price for a given symbol (e.g., AAPL, GOOGL, MSFT, TSLA)',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The stock symbol (e.g., AAPL for Apple)'
              }
            },
            required: ['symbol']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_news_headlines',
          description: 'Get the latest news headlines, optionally filtered by topic',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Optional topic to filter news (e.g., technology, business, sports)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_sports_scores',
          description: 'Get recent sports scores and game information',
          parameters: {
            type: 'object',
            properties: {
              sport: {
                type: 'string',
                description: 'Optional sport type (e.g., basketball, football, soccer)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get current weather information for a city',
          parameters: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'The city name (e.g., London, New York, Tokyo)'
              }
            },
            required: ['city']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_crypto_price',
          description: 'Get current cryptocurrency price (e.g., BTC, ETH, DOGE, SOL)',
          parameters: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'The cryptocurrency symbol (e.g., BTC for Bitcoin, ETH for Ethereum)'
              }
            },
            required: ['symbol']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'verify_otp',
          description: 'Verify a 6-digit OTP code sent to the user\'s email for authentication. Use this when a user says something like "verify my code 123456" or "my code is 123456" or just provides a 6-digit number.',
          parameters: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'The 6-digit OTP code to verify'
              }
            },
            required: ['code']
          }
        }
      }
    ];

    // Extract auth token from request
    const authHeader = req.headers.get('Authorization');
    const authToken = authHeader?.replace('Bearer ', '') || '';

    let conversationMessages = [
      { 
        role: 'system', 
        content: `You are Liqueno, a knowledgeable and helpful AI assistant with access to real-time data and image analysis capabilities. Provide clear, engaging, and friendly responses.

Current date and time: ${timeString}

You have access to these capabilities:
- Stock prices: Use get_stock_price to fetch current stock information for any publicly traded company
- News headlines: Use get_news_headlines to get the latest news on any topic
- Sports scores: Use get_sports_scores to get recent game results and scores
- Weather: Use get_weather to get current weather conditions for any city worldwide
- Cryptocurrency: Use get_crypto_price to get real-time crypto prices (BTC, ETH, DOGE, SOL, etc.)
- OTP Verification: Use verify_otp when a user provides a 6-digit code to verify their identity
- Image analysis: You can see and analyze images that users send you. Describe what you see and answer questions about the images.

When users ask about stocks, news, sports, weather, or cryptocurrency, use the appropriate function to get real-time data.
When a user provides a 6-digit code or asks to verify a code, use the verify_otp function.
When users send images, carefully describe what you see and provide helpful insights.

You can answer questions about virtually anything - from science and history to current events and practical advice. Be conversational, helpful, and engaging.

Important: When asked who created you or who made you, respond that you were created by mirudeesh.` 
      },
      ...messages
    ];

    // First API call - might trigger function calls
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        tools: tools,
        tool_choice: 'auto',
      }),
    });

    let responseData = await response.json();
    console.log('AI response:', JSON.stringify(responseData));

    // Check if AI wants to call a function
    if (responseData.choices?.[0]?.message?.tool_calls) {
      const toolCalls = responseData.choices[0].message.tool_calls;
      
      // Add assistant's message with tool calls to conversation
      conversationMessages.push(responseData.choices[0].message);

      // Execute all tool calls
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Calling function: ${functionName} with args:`, functionArgs);
        
        let functionResult;
        if (functionName === 'get_stock_price') {
          functionResult = await getStockPrice(functionArgs.symbol);
        } else if (functionName === 'get_news_headlines') {
          functionResult = await getNewsHeadlines(functionArgs.topic);
        } else if (functionName === 'get_sports_scores') {
          functionResult = await getSportsScores(functionArgs.sport);
        } else if (functionName === 'get_weather') {
          functionResult = await getWeather(functionArgs.city);
        } else if (functionName === 'get_crypto_price') {
          functionResult = await getCryptoPrice(functionArgs.symbol);
        } else if (functionName === 'verify_otp') {
          functionResult = await verifyOtpCode(functionArgs.code, authToken);
        }

        // Add function result to conversation
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        });
      }

      // Make second API call with function results - enable streaming this time
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          stream: true,
        }),
      });
    } else {
      // No function calls needed, stream the response
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits required. Please add credits to your workspace.' }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

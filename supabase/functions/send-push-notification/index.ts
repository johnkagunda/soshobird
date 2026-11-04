import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Supabase webhook sends { type, table, schema, record, old_record }
    const record = payload?.record;
    if (!record) {
      return new Response('No record in payload', { status: 400 });
    }

    const { user_id, actor_id, type: notifType, post_id } = record;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 1. Get recipient's push token
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('id', user_id)
      .single();

    if (recipientError || !recipient?.push_token) {
      console.log('No push token for user', user_id);
      return new Response('No push token', { status: 200 });
    }

    const pushToken: string = recipient.push_token;

    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.log('Invalid push token format:', pushToken);
      return new Response('Invalid push token', { status: 200 });
    }

    // 2. Get actor name
    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', actor_id)
      .single();

    const actorName = actor?.full_name || actor?.username || 'Someone';

    // 3. Build title + message
    let notifTitle = '';
    let notifBody = '';

    if (notifType === 'follow') {
      notifTitle = 'New follower';
      notifBody = `${actorName} started following you`;
    } else if (notifType === 'post') {
      notifTitle = `${actorName} posted`;
      if (post_id) {
        const { data: post } = await supabase
          .from('posts')
          .select('content')
          .eq('id', post_id)
          .single();
        notifBody = post?.content?.slice(0, 100) ?? 'Check out the new post';
      } else {
        notifBody = 'Check out the new post';
      }
    }

    if (!notifTitle) {
      return new Response('Unknown notification type', { status: 200 });
    }

    // 4. Send via Expo Push API
    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: notifTitle,
        body: notifBody,
        sound: 'default',
        priority: 'high',
        channelId: 'myNotificationChannel',
        data: { type: notifType, post_id: post_id ?? null, actor_id },
      }),
    });

    const pushResult = await pushResponse.json();
    console.log('Expo push result:', JSON.stringify(pushResult));

    return new Response(JSON.stringify({ success: true, result: pushResult }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

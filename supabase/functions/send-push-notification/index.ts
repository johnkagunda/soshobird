/**
 * Supabase Edge Function: send-push-notification
 *
 * Triggered by a Supabase Database Webhook on INSERT into public.notifications.
 * Looks up the recipient's Expo push token from their profile and sends
 * a system-level push notification via Expo's Push API.
 *
 * This delivers notifications even when the app is closed or backgrounded.
 *
 * Deploy:
 *   supabase functions deploy send-push-notification
 *
 * Database Webhook (set up in Supabase Dashboard):
 *   Table:  public.notifications
 *   Event:  INSERT
 *   Method: POST
 *   URL:    https://<project-ref>.supabase.co/functions/v1/send-push-notification
 *   Headers: Authorization: Bearer <service_role_key>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    // Supabase webhook sends { type, table, schema, record, old_record }
    const record = body?.record;
    if (!record) {
      return new Response('No record in payload', { status: 400 });
    }

    const { user_id, actor_id, type: notifType, post_id } = record;

    // Create a Supabase admin client (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 1. Get the recipient's push token
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

    // Validate it's a real Expo push token
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.log('Invalid push token format:', pushToken);
      return new Response('Invalid push token', { status: 200 });
    }

    // 2. Get actor name for the notification message
    const { data: actor } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', actor_id)
      .single();

    const actorName = actor?.full_name || actor?.username || 'Someone';

    // 3. Build notification title + body
    let title = '';
    let body = '';

    if (notifType === 'follow') {
      title = 'New follower';
      body = `${actorName} started following you`;
    } else if (notifType === 'post') {
      title = `${actorName} posted`;
      if (post_id) {
        const { data: post } = await supabase
          .from('posts')
          .select('content')
          .eq('id', post_id)
          .single();
        body = post?.content?.slice(0, 100) ?? 'Check out the new post';
      } else {
        body = 'Check out the new post';
      }
    }

    if (!title) {
      return new Response('Unknown notification type', { status: 200 });
    }

    // 4. Send push notification via Expo Push API
    const pushPayload = {
      to: pushToken,
      title,
      body,
      sound: 'default',
      priority: 'high',
      channelId: 'myNotificationChannel', // must match the channel created in the app
      data: {
        type: notifType,
        post_id: post_id ?? null,
        actor_id,
      },
    };

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(pushPayload),
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

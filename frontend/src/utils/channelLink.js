// Route to the real (public) channel a video belongs to — never the signed-in user's own channel.
export function channelPath(source) {
  const ref = source?.channel_id || source?.channelId || source?.id
    || (String(source?.channel_handle || '').startsWith('@') ? source.channel_handle : '')
    || source?.channel_name || source?.channelTitle || source?.name || ''
  return ref ? `/channel/${encodeURIComponent(ref)}` : '/channel'
}

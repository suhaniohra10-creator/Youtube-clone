function hashId(value) {
  return Array.from(String(value || 'video')).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 11)
}

function pick(list, salt) {
  return list[Math.abs(salt) % list.length]
}

function topicOf(video) {
  const text = `${video?.category || ''} ${video?.title || ''} ${video?.channel_name || ''}`.toLowerCase()
  if (/(music|song|lyric|singer|album|mashup|official video|audio)/.test(text)) return 'music'
  if (/(tutorial|python|code|programming|tech|machine|how to|review|unbox)/.test(text)) return 'tech'
  if (/(movie|trailer|cinema|film|scene)/.test(text)) return 'movies'
  if (/(standup|comedy|funny|roast|meme)/.test(text)) return 'comedy'
  if (/(vlog|travel|food|recipe|day in)/.test(text)) return 'vlog'
  if (/(game|gameplay|minecraft|gta|valorant|fgc)/.test(text)) return 'gaming'
  return 'general'
}

function stamp(video, salt) {
  const total = Math.max(45, Number(video?.duration_seconds) || 240)
  const at = 8 + (Math.abs(salt) % Math.max(total - 12, 20))
  return `${Math.floor(at / 60)}:${String(at % 60).padStart(2, '0')}`
}

const PEOPLE = [
  ['Kabir M.', 'kabir.cuts'], ['Zoya', 'zoya.late.uploads'], ['Rehan', 'rehanonyt'],
  ['Inaaya', 'inaaya.plays'], ['Vivaan', 'vivaansnacks'], ['Sana R.', 'sana.rewinds'],
  ['night bus', 'nightbusfm'], ['Myra', 'myra.notes'], ['Ritvik', 'ritvik.loop'],
  ['Aanya', 'aanya.watches'], ['old playlist', 'oldplaylist_'], ['Tara', 'tara.comments'],
  ['Darsh', 'darsh.hifi'], ['Pari', 'pari.queue'], ['2am brain', 'twoambrain'],
  ['Ira', 'ira.takes'], ['Atharv', 'atharv.dev'], ['Navya', 'navyaclips'],
  ['Harsh', 'harsh.mix'], ['Anvi', 'anvi.subs'], ['Kunal', 'kunal.frame'],
  ['Diya', 'diya.kitchen'], ['Samar', 'samar.watch'], ['Rhea', 'rhea.thread'],
  ['Arnav', 'arnav.daily'], ['Mira', 'mira.scrolls'], ['Neel', 'neel.unfiltered'],
  ['Pooja', 'pooja.recommends'], ['Ishan', 'ishan.loops'], ['Meera K.', 'meerak.yt'],
]

const AGES = [
  '4 minutes ago', '19 minutes ago', '41 minutes ago', '2 hours ago', '5 hours ago',
  '8 hours ago', '14 hours ago', '1 day ago', '2 days ago', '4 days ago', '6 days ago',
  '1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago',
]

function linesFor(video, salt) {
  const title = (video?.title || 'this video').replace(/\s+/g, ' ').trim()
  const channel = video?.channel_name || 'this channel'
  const short = title.length > 48 ? `${title.slice(0, 45).trim()}…` : title
  const time = stamp(video, salt)
  const topic = topicOf(video)
  const shared = [
    `who else clicked just because of the thumbnail 😭`,
    `algorithm actually cooked recommending this`,
    `watching this at 1am like I have nowhere to be tomorrow`,
    `okay I was only going to watch 2 minutes…`,
    `how does this only have these views??`,
    `came here from homepage and stayed till the end`,
    `this is the kind of upload I wish showed up more`,
    `replayed ${time} like 6 times already`,
    `the part at ${time} is stuck in my head`,
    `can we talk about ${time} though`,
    `not me watching this on repeat while doing literally nothing else`,
    `subscribed before the video even ended ngl`,
    `first time seeing ${channel} and I’m already going through the channel`,
    `this aged better than I expected`,
    `why is nobody talking about ${time}`,
    `me trying to act like I discovered this first`,
    `lowkey better than half the stuff on my timeline today`,
    `I sent this to my group chat with no context`,
    `wait the ending?? I was not ready`,
    `quality is actually insane for a random click`,
  ]
  const byTopic = {
    music: [
      `this song did not have to go this hard`,
      `lyrics at ${time} felt personal ngl`,
      `straight into the playlist, no skip`,
      `the mix is clean. headphones recommended.`,
      `been looking for this track for weeks`,
      `vocals + that beat at ${time} = unfair`,
    ],
    tech: [
      `paused at ${time} and actually tried it. it works.`,
      `this explained it better than a 40 minute tutorial`,
      `saving this for later, I know I’ll need it`,
      `clear, no fluff. more of this please.`,
      `the demo at ${time} is the part that clicked for me`,
    ],
    movies: [
      `that shot at ${time} looks expensive`,
      `trailer had no right being this good`,
      `need a full scene breakdown after this`,
      `cinema. that’s it. that’s the comment.`,
    ],
    comedy: [
      `I replayed ${time} way too many times 💀`,
      `why is this funnier the second time`,
      `sent this to someone who wasn’t ready`,
      `the timing on this is criminal`,
    ],
    vlog: [
      `the vibe in this is so calm I forgot I was stressed`,
      `need a full day-in-the-life after this`,
      `food shots look illegal at ${time}`,
    ],
    gaming: [
      `the clutch at ${time} 🔥`,
      `I felt that play through my screen`,
      `queueing this up for the next session`,
    ],
    general: [
      `didn’t think I’d care and now I’m invested`,
      `"${short}" is exactly what I needed tonight`,
      `${channel} really doesn’t miss`,
    ],
  }
  return [...shared, ...(byTopic[topic] || byTopic.general)]
}

function replyLines(video, salt) {
  const time = stamp(video, salt + 9)
  return [
    `same, ${time} is the clip`,
    `glad I’m not the only one who noticed`,
    `this comment needs more likes`,
    `came looking for this exact comment`,
    `true. watched it twice after reading this`,
    `lol I thought I was the only one`,
  ]
}

export function commentsForVideo(video) {
  const id = String(video?.id || video?.videoId || 'default')
  const seed = hashId(id)
  const pool = linesFor(video, seed)
  const count = 8 + (seed % 7)
  const used = new Set()
  const comments = []
  for (let index = 0; index < count; index += 1) {
    const salt = seed + index * 97 + count * 13
    let text = pick(pool, salt)
    let spin = 0
    while (used.has(text) && spin < pool.length) {
      spin += 1
      text = pick(pool, salt + spin * 17)
    }
    used.add(text)
    const person = pick(PEOPLE, salt + 3)
    const likes = [0, 0, 2, 6, 14, 31, 88, 142, 407, 1204][Math.abs(salt) % 10]
    const comment = {
      id: `${id}-c${index}-${(salt >>> 0).toString(16)}`,
      name: person[0],
      handle: person[1],
      avatar: `https://i.pravatar.cc/96?u=${encodeURIComponent(`${id}-${person[1]}`)}`,
      text,
      age: pick(AGES, salt + 5),
      likes,
      replies: [],
    }
    if (index % 4 === 2) {
      const replyPerson = pick(PEOPLE, salt + 21)
      comment.replies = [{
        id: `${comment.id}-r`,
        name: replyPerson[0],
        handle: replyPerson[1],
        avatar: `https://i.pravatar.cc/96?u=${encodeURIComponent(`${id}-r-${replyPerson[1]}`)}`,
        text: pick(replyLines(video, salt), salt),
        age: pick(AGES, salt + 8),
        likes: Math.abs(salt) % 18,
      }]
    }
    comments.push(comment)
  }
  return comments.sort((left, right) => (right.likes || 0) - (left.likes || 0))
}

export function loadComments(videoId, video) {
  const generated = commentsForVideo(video || { id: videoId })
  try {
    const stored = JSON.parse(localStorage.getItem(`yt-comments-${videoId}`))
    const mine = Array.isArray(stored) ? stored.filter((item) => item?.name === 'You') : []
    return [...mine, ...generated]
  } catch {
    return generated
  }
}

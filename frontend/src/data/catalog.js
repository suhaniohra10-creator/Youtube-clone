import { SAMPLE_PREVIEWS } from '../config'
import { formatClock } from '../utils/video'
import FEED from './feedData.json'

// IDs whose YouTube thumbnails no longer exist (they rendered as grey placeholders)
const BROKEN_IDS = new Set(['s8UW2Tw_7JM', 'k1D02Q5yF_Y', 'yVb0L8J87g8', '8O3v7d_8g5M', 'u7_wZ46j0xM', 'r7qovpFAGZg', '60g0Z_y91j4', 'd3w9yG123xA', 'W2W59B9y_p8', 'o3npeU3Qf5s', 'hP4L_PZ9jM8', 'mbz7gYk6xU8', 'x7w8q2dF0yY', 'wXhthnyfyzo', '4xP_2o6q28Y', 'B88e6Q9Y1_0', 'Bey4XXJAqS8', 'i6b6x0Z_oJw', '1ZYbU8JGBdQ', 'wpncYg10Xf4'])

const ENTRIES = [
  ['TcMBFSGVi1c', 'India\'s GHOST Village | How 80,000 People Vanished in Kuldhara? | Dhruv Rathee', 'Movies', 'Dhruv Rathee', '14M', '3 months ago', 1407, 4200000, 'Exploring the real history and mystery behind Kuldhara ghost village in Rajasthan.'],
  ['Ke90Tje7VS0', '7 Income Sources You’re Probably Ignoring | Raj Shamani', 'Tech', 'Raj Shamani Highlights', '2.4M', '1 month ago', 1134, 210000, 'Top 7 profitable income sources and business models you can start building this year.'],
  ['s8UW2Tw_7JM', 'Our New Biggest Hall 🤩 ...नया फर्श तैयार हो गया | Studio Renovation | Part-9', 'Comedy', 'MR. INDIAN HACKER', '2.9M', '12 hours ago', 970, 890000, 'Finalizing the ground floor setup and testing our biggest studio space yet!'],
  ['0e3GPea1Tyg', '$1 vs $500,000 Plane Ticket! - Extreme Luxury Travel Experience', 'Entertainment', 'MrBeast', '312M', '1 year ago', 1234, 14000000, 'We compared the cheapest plane ticket in the world to a half million dollar private luxury jet!'],
  ['M576WGiDBdQ', 'Building a Full Stack Web Application from Scratch (2026 Edition)', 'Tech', 'Traversy Media', '640K', '2 weeks ago', 3912, 48000, 'Learn modern web development with a complete hands-on project from frontend to backend.'],
  ['kJQP7kiw5Fk', 'Luis Fonsi - Despacito ft. Daddy Yankee (Official Music Video)', 'Music', 'Luis Fonsi', '8.4B', '8 years ago', 282, 54000000, 'The official music video for the global Latin pop hit that defined a decade of trending playlists.'],
  ['L_LUpnjgPso', 'Apple Vision Pro Review: Tomorrow\'s Tech Today!', 'Tech', 'Marques Brownlee', '8.9M', '4 months ago', 1238, 540000, 'After 3 months of daily use, here is everything you need to know about Apple Vision Pro.'],
  ['OPf0YbXqDm0', 'Mark Ronson - Uptown Funk ft. Bruno Mars (Official Video)', 'Music', 'Mark Ronson', '5.1B', '11 years ago', 272, 21000000, 'A brass-heavy funk anthem still circulating in 2026 hit music mixes and party playlists.'],
  ['k1D02Q5yF_Y', 'iPhone 16 Pro Max: What Nobody Tells You After 30 Days', 'Tech', 'Mrwhosetheboss', '6.4M', '2 weeks ago', 945, 380000, 'The cameras, battery life, and AI features tested to the absolute limit.'],
  ['JGwWNGJdvx8', 'Ed Sheeran - Shape of You (Official Music Video)', 'Music', 'Ed Sheeran', '6.3B', '9 years ago', 264, 33000000, 'Ed Sheeran’s dance-pop single with the original official video and live performance cuts.'],
  ['yVb0L8J87g8', 'M4 MacBook Pro Review: The Beast Unleashed!', 'Tech', 'Dave2D', '2.1M', '1 month ago', 612, 140000, 'M4 Max performance numbers, thermal throttling tests, and display comparison.'],
  ['YQHsXMglC9A', 'Adele - Hello (Official Music Video)', 'Music', 'Adele', '3.4B', '10 years ago', 366, 27000000, 'A cinematic ballad from 25 — still a staple of trending vocal and piano playlists.'],
  ['8O3v7d_8g5M', 'Building a PC in 2026 - Complete Step by Step Beginner Guide', 'Tech', 'Linus Tech Tips', '4.7M', '3 months ago', 1845, 290000, 'Everything you need to know to build your own gaming or editing rig from parts.'],
  ['09R8_2nJtjg', 'Maroon 5 - Sugar (Official Music Video)', 'Music', 'Maroon 5', '4.1B', '11 years ago', 302, 15000000, 'Wedding-crashing pop energy from Maroon 5, looping across today’s hit music roundups.'],
  ['u7_wZ46j0xM', 'The Real Reason AI is Taking Over Everything', 'Tech', 'Veritasium', '7.3M', '1 month ago', 1420, 490000, 'How scaling laws and neural networks reached human-level reasoning capabilities.'],
  ['8g18jFHCLXk', 'Dune | Official Trailer', 'Movies', 'Warner Bros. Pictures', '48M', '5 years ago', 186, 890000, 'Denis Villeneuve’s official Dune trailer: desert, spice, and IMAX-scale cinema craft.'],
  ['sBws8MSXN7A', 'How The Universe Will End (in 4K Ultra HD)', 'Science', 'Kurzgesagt – In a Nutshell', '22M', '2 years ago', 712, 1300000, 'Three distinct scenarios for the ultimate fate of all matter, stars, and time.'],
  ['YoHD9XEInc0', 'Interstellar Official Trailer', 'Movies', 'Warner Bros. Pictures', '41M', '12 years ago', 148, 760000, 'Christopher Nolan’s space epic trailer — Hans Zimmer swells included.'],
  ['r7qovpFAGZg', 'I Spent 7 Days In Solitary Confinement Without Sunlight', 'Entertainment', 'MrBeast', '240M', '8 months ago', 1280, 11000000, 'Testing human endurance and sanity inside a completely white isolated chamber.'],
  ['uYPbbksJxIg', 'Oppenheimer | Official Trailer', 'Movies', 'Universal Pictures', '69M', '3 years ago', 180, 1200000, 'The official Oppenheimer trailer: IMAX film, practical effects, and awards-season gravity.'],
  ['ZXsQAXx_ao0', '7 Days Stranded In A Desert With Only A Backpack', 'Entertainment', 'MrBeast', '180M', '5 months ago', 1195, 8900000, 'Surviving in 115°F heat dunes with minimal supplies alongside friends.'],
  ['2OEL4P1Rz04', 'Hanuman Chalisa - Full (Hanuman Chalisa)', 'Spirituality', 'T-Series Bhakti Sagar', '3.1B', '11 years ago', 720, 18000000, 'A beloved Hanuman Chalisa recording for morning prayer, bhajan, and family aarti.'],
  ['e-ORhEE9VVg', 'Minecraft: 100 Days in Hardcore Survival World', 'Gaming', 'Luke TheNotable', '45M', '2 years ago', 2410, 2100000, 'I spent 100 in-game days building an impenetrable kingdom in Hardcore difficulty.'],
  ['inpok4MKVLM', '5-Minute Meditation You Can Do Anywhere', 'Spirituality', 'Calm Mind', '3.8M', '8 months ago', 318, 92000, 'A short guided meditation with breathwork you can repeat between meetings.'],
  ['60g0Z_y91j4', 'Grand Theft Auto VI - Official Trailer 1 Breakdown & Easter Eggs', 'Gaming', 'IGN', '19M', '10 months ago', 940, 890000, 'Every single hidden frame, character detail, and Vice City location analyzed.'],
  ['aircAruvnKk', 'But what is a neural network? | Deep learning chapter 1', 'Tech', '3Blue1Brown', '16M', '8 years ago', 1140, 430000, 'Grant Sanderson visualizes how neural nets actually compute — essential ML intuition.'],
  ['7TavVZMewpY', 'Elden Ring: Shadow of the Erdtree - Complete Lore & Bosses Guide', 'Gaming', 'VaatiVidya', '4.2M', '3 months ago', 2180, 240000, 'The complete story of Miquella, the Realm of Shadow, and every secret boss fight.'],
  ['rfscVS0vtbw', 'Python for Beginners - Full Course (2026 roadmap)', 'Tech', 'freeCodeCamp.org', '48M', '5 years ago', 15420, 980000, 'A full Python programming course covering syntax, data structures, and beginner projects.'],
  ['d3w9yG123xA', 'VALORANT Champions Grand Finals - Top 20 Insane Clutch Plays', 'Gaming', 'VALORANT Champions Tour', '2.8M', '2 weeks ago', 1340, 170000, 'The most thrilling tournament moments and ace rounds from the world championship.'],
  ['W2W59B9y_p8', 'Fortnite Chapter 6 - Everything New & Map Secrets Explained', 'Gaming', 'Ali-A', '1.9M', '4 days ago', 780, 110000, 'Exploring the new island biome, weapons, mythics, and battle pass rewards.'],
  ['9bZkp7q19f0', 'PSY - GANGNAM STYLE(강남스타일) M/V Official', 'Music', 'officialpsy', '5.2B', '12 years ago', 253, 29000000, 'The record-breaking global dance hit that crossed over 5 billion views.'],
  ['fJ9rUzIMcZQ', 'Queen - Bohemian Rhapsody (Official Video Remastered 4K)', 'Music', 'Queen Official', '1.7B', '15 years ago', 359, 13000000, 'Freddie Mercury and Queen’s timeless operatic rock masterpiece in 4K.'],
  ['aJOTlE1K90k', 'Maroon 5 - Girls Like You ft. Cardi B (Official Music Video)', 'Music', 'Maroon 5', '3.5B', '6 years ago', 270, 22000000, 'Featuring guest appearances by iconic women across music, film, and culture.'],
  ['CevxZvSJLk8', 'Katy Perry - Roar (Official 4K Music Video)', 'Music', 'Katy Perry', '4.0B', '10 years ago', 270, 18000000, 'The official music video for Roar from Katy Perry\'s chart-topping album PRISM.'],
  ['RgKAFK5djSk', 'Wiz Khalifa - See You Again ft. Charlie Puth [Official Video]', 'Music', 'Wiz Khalifa', '6.2B', '9 years ago', 237, 43000000, 'Dedicated to Paul Walker from Furious 7, one of the most streamed songs in history.'],
  ['nfWlot6h_JM', 'Taylor Swift - Shake It Off (Official Music Video)', 'Music', 'Taylor Swift', '3.4B', '9 years ago', 242, 17000000, 'Lead single from 1989 celebrating dance styles and infectious pop rhythm.'],
  ['hT_nvWreIhg', 'Gordon Ramsay Makes His Favorite 10 Minute Weeknight Pasta', 'Cooking', 'Gordon Ramsay', '18M', '1 year ago', 640, 920000, 'Quick, fresh, and bursting with flavor using simple pantry ingredients.'],
  ['o3npeU3Qf5s', 'Indian Street Food Tour - 24 Hours Non-Stop Eating in Old Delhi', 'Travel', 'Mark Wiens', '12M', '1 year ago', 1890, 680000, 'From Chandni Chowk parathas to famous kebabs and rich seasonal sweets!'],
  ['fNk_zzaMoSs', 'Why Cities Are Built Where They Are (Geographic Strategy)', 'Science', 'Wendover Productions', '4.8M', '2 years ago', 890, 240000, 'The hidden geography of rivers, harbors, mountain passes, and ancient trade.'],
  ['hP4L_PZ9jM8', 'The Insane Engineering of the James Webb Space Telescope', 'Science', 'Real Engineering', '9.1M', '1 year ago', 1520, 520000, 'How folding mirrors and sunshields deployed 1 million miles out in space.'],
  ['0fKBhvDjuy0', 'What Really Happens at the Bottom of the Mariana Trench?', 'Science', 'Bright Side', '28M', '3 years ago', 780, 1400000, 'Extreme pressure, mysterious creatures, and pitch-black ocean trenches.'],
  ['mbz7gYk6xU8', 'How Formula 1 Engines Rev to 15,000 RPM & Make 1000 HP', 'Tech', 'Engineering Explained', '3.4M', '8 months ago', 810, 190000, 'Turbochargers, MGU-H, pneumatic valves, and thermal efficiency dissected.'],
  ['X9otDixAtFw', 'How Japan Builds The Most Earthquake-Proof Skyscrapers', 'Tech', 'The B1M', '5.1M', '5 months ago', 940, 280000, 'Tuned mass dampers, base isolators, and engineering resilient megalopolises.'],
  ['V-_O7nl0Ii0', 'How Cargo Ships Pass Through The Massive Panama Canal Locks', 'Tech', 'Practical Engineering', '8.6M', '2 years ago', 1030, 420000, 'Gravity-fed lock chambers lifting 100,000-ton container vessels across oceans.'],
  ['cbKkB3POqaY', '20 Min Intense Full Body HIIT Workout - No Equipment Needed', 'Fitness', 'Pamela Reif', '52M', '3 years ago', 1200, 2400000, 'Burn calories and build core strength at home with high tempo music tracks.'],
  ['gC_L9qAHVJ8', 'Top 10 Most Impossible Goals in Football History (HD)', 'Sports', 'FIFA', '34M', '1 year ago', 640, 1600000, 'Unbelievable volleys, bicycle kicks, and solo runs that shocked the world.'],
  ['x7w8q2dF0yY', 'How to Train For Your First 42km Marathon (Zero to Finish)', 'Fitness', 'The Running Channel', '1.6M', '9 months ago', 1120, 98000, 'Pacing strategies, nutrition, hydration, and building weekly base mileage.'],
  ['wXhthnyfyzo', 'Day in the Life of a Senior Software Engineer in Tokyo, Japan', 'Lifestyle', 'Kenta Programming', '3.9M', '7 months ago', 920, 210000, 'Morning commute in Shibuya, standup meetings, coding, and ramen after work.'],
  ['zSWdZVtXT7E', 'Himalayan High Altitude Trekking: Crossing 18,000ft Passes 4K', 'Travel', 'National Geographic', '11M', '1 year ago', 2640, 750000, 'Cinematic documentary traversing the rugged peaks and sherpa villages of Nepal.'],
  ['Jn09UdSb3aA', 'Elon Musk on Mars Colonization, Starship & Humanoid Robots', 'Podcasts', 'Joe Rogan Experience', '18M', '11 months ago', 7200, 1100000, 'A 3-hour deep conversation on reusable rockets, multi-planetary life, and AI.'],
  ['4xP_2o6q28Y', 'Sam Altman: OpenAI, GPT-5 Architecture & The Road to AGI', 'Podcasts', 'Lex Fridman Podcast', '5.7M', '4 months ago', 6120, 340000, 'Discussing compute clusters, synthetic data, safety, and agentic autonomy.'],
  ['B88e6Q9Y1_0', 'Stock Market & Compounding Masterclass for Complete Beginners', 'Finance', 'Zerodha Varsity', '2.1M', '3 weeks ago', 2850, 180000, 'How index funds, equities, and time-in-the-market build lasting generational wealth.'],
  ['LXb3EKWsInQ', 'Costa Rica in 4K 60fps HDR - Rainforests, Volcanoes & Wildlife', 'Travel', 'Jacob + Katie Schwarz', '88M', '4 years ago', 315, 3400000, 'Breathtaking Ultra HD nature documentary filmed with RED digital cinema cameras.'],
  ['Bey4XXJAqS8', 'Peru 8K HDR - Machu Picchu, Sacred Valley & Ancient Incan Empire', 'Travel', 'Mystery World', '15M', '2 years ago', 480, 680000, 'Explore the towering Andes mountains, cloud forests, and stone masonry marvels.'],
  ['1La4QzGeaaQ', 'Switzerland 4K - Scenic Relaxation Film with Peaceful Piano Music', 'Travel', 'Scenic Relaxation', '42M', '3 years ago', 3600, 1800000, 'Zermatt, Lauterbrunnen, Lake Geneva, and snow-capped alpine panoramas.'],
  ['vX2vsvdq8nw', 'Norway 4K - Land of Fjords, Aurora Borealis & Majestic Waterfalls', 'Travel', 'Wild Earth', '24M', '2 years ago', 1840, 940000, 'Fly over Geirangerfjord, Lofoten Islands, and magical midnight sun landscapes.'],
  ['i6b6x0Z_oJw', 'Tokyo Cyberpunk City Night Walk in Rain 4K 60fps HDR Binaural', 'Travel', 'Nomadic Ambience', '9.4M', '1 year ago', 4200, 520000, 'Immersive spatial audio walking through Shinjuku neon alleys and rain reflections.'],
  ['d9MyW72ELq0', 'Avatar: The Way of Water | Official Teaser Trailer', 'Movies', '20th Century Studios', '154M', '2 years ago', 98, 2800000, 'James Cameron returns to Pandora with breathtaking underwater visual effects.'],
  ['Way9Dexny3w', 'Spider-Man: Across the Spider-Verse - Official Trailer 2', 'Movies', 'Sony Pictures Entertainment', '64M', '1 year ago', 142, 1900000, 'Miles Morales catapults across the Multiverse to encounter a team of Spider-People.'],
  ['1ZYbU8JGBdQ', '15 Minute Morning Yoga for Energy, Alignment & Flexibility', 'Spirituality', 'Yoga With Adriene', '14M', '2 years ago', 900, 590000, 'Gentle morning yoga flow to wake up the spine, breathe deeply, and feel refreshed.'],
  ['wpncYg10Xf4', 'Deep Sleep Delta Waves Meditation Music - 8 Hours Continuous', 'Spirituality', 'Meditation Relax Music', '76M', '4 years ago', 28800, 2200000, 'Calming binaural frequencies designed for deep restorative sleep and stress relief.'],
  ['bMknfKXIFA8', 'React 19 & Next.js Full Tutorial - Zero to Production Ready', 'Tech', 'freeCodeCamp.org', '3.2M', '1 month ago', 14200, 260000, 'Master modern server actions, compiler optimizations, hooks, and routing.'],
]

const SHORT_ENTRIES = [
  ['2Vv-BfVoq4g', 'life journey (2018-2023) of sourav joshi ...', 'Comedy', 'Sourav Joshi Vlogs', '34M views', '2 days ago', 58, 890000, 'A look back at 5 years of nonstop daily vlogging and memories.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
  ['hT_nvWreIhg', 'That One Attention Seeker 😅 | #shorts | ...', 'Comedy', 'Fun Factory', '28M views', '5 days ago', 47, 640000, 'Every friend group has that one person who always steals the camera.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'],
  ['fLexgOxsZu0', 'Shoot Bts 😝 Vs Final result 🤩 ...', 'Tech', 'Creative Studio', '91M views', '1 day ago', 45, 28000, 'Behind the scenes filmmaking vs the final cinematic result.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'],
  ['lXMskKTw3Bc', 'piyush aura 9999+ 😎🔥 ...', 'Comedy', 'Piyush Gaming', '5.6M views', '3 days ago', 60, 41000, 'Unstoppable gamer moments and funny clips.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'],
  ['kXYiU_JCYtU', 'Hidden Actors 😱 ...', 'Movies', 'Cinema Secrets', '14M views', '6 days ago', 32, 76000, 'Did you know who secretly played this famous movie character?', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'],
  ['short_6', 'When the physics simulation breaks 🤯 #shorts', 'Gaming', 'GameGlitcher', '8.9M views', '1 day ago', 34, 120000, 'Crazy in-game ragdoll physics that had the whole chat laughing.', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80'],
  ['short_7', 'Satisfying Wood Carving in 30 Seconds ✨ #shorts', 'Tech', 'CraftMaster', '42M views', '4 days ago', 30, 940000, 'Watch a block of walnut turn into a miniature sculpture.', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80'],
  ['short_8', 'How Fast Can You Solve This Puzzle? 🧠 #shorts', 'Entertainment', 'BrainTeasers', '19M views', '2 days ago', 45, 310000, 'Only 1% of people get the second riddle right on the first try!', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'],
  ['short_9', 'Street Food Chef with Insane Speed 🔥 #shorts', 'Travel', 'FoodLover', '67M views', '3 days ago', 52, 1800000, 'Cooking 20 orders in under 2 minutes with incredible wok skills.', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'],
  ['short_10', 'Never Make This Mistake in Code! 💻 #shorts', 'Tech', 'DevTips', '5.1M views', '1 week ago', 58, 85000, 'Avoid this common performance pitfall in modern JavaScript.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80'],
]

function toVideo(entry, index, isShort = false) {
  const [id, title, category, channel_name, views, age, duration_seconds, likes, description, poster] = entry
  return {
    id,
    title,
    category,
    channel_name,
    views,
    age,
    duration_seconds,
    likes,
    dislikes: 36 + index * 17,
    description,
    is_short: isShort,
    duration: isShort ? `${duration_seconds}s` : formatClock(duration_seconds),
    thumbnail_url: poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel_avatar: `https://i.pravatar.cc/96?img=${(index % 70) + 1}`,
    video_url: `https://www.youtube.com/watch?v=${id}`,
    preview_url: SAMPLE_PREVIEWS[index % SAMPLE_PREVIEWS.length],
  }
}

const FEED_ENTRIES = FEED
  .filter((row) => !ENTRIES.some((entry) => entry[0] === row[0]))
  .map((row) => [...row.slice(0, 8), `${row[1]} — ${row[3]}`, ''])
const VALID_ENTRIES = [...ENTRIES.filter((entry) => !BROKEN_IDS.has(entry[0])), ...FEED_ENTRIES]

export const rawMocks = VALID_ENTRIES.map((entry, index) => toVideo(entry, index))
export const shortMocks = SHORT_ENTRIES.map((entry, index) => toVideo(entry, index, true))


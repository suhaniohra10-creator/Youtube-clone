function avatar(name, image) {
  if (image) return `https://i.pravatar.cc/160?img=${image}`
  return `https://i.pravatar.cc/160?u=${encodeURIComponent(name)}`
}

export const CHANNEL_SECTIONS = [
  {
    id: 'beauty',
    title: 'Beauty & Fashion',
    channels: [
      ['Beardbrand', '2.14M', 12],
      ['Mindy McKnight', '5.71M', 20],
      ['Cassandra Bankson', '2.45M', 32],
      ['I-D', '1.28M', 45],
      ['Tammy\'s Ageless Beauty', '407K', 48],
      ['VICKYLOGAN', '537K', 5],
      ['Yolanda Beck', '342K', 9],
      ['Cambria Joy', '779K', 24],
      ['Christina Harris', '788K', 27],
      ['Dev DeAngelis', '4.65M', 36],
    ],
  },
  {
    id: 'comedy',
    title: 'Comedy',
    channels: [
      ['Zakir Khan', '8.4M', 15],
      ['Trevor Noah', '11M', 33],
      ['Vir Das', '3.2M', 41],
      ['Russell Peters', '6.1M', 18],
      ['Hasan Minhaj', '4.8M', 7],
      ['Kenny Sebastian', '1.9M', 22],
      ['Abhishek Upmanyu', '2.7M', 29],
      ['Netflix Is A Joke', '9.5M', 11],
    ],
  },
  {
    id: 'music',
    title: 'Music',
    channels: [
      ['T-Series', '278M', 8],
      ['Ed Sheeran', '56M', 14],
      ['Arijit Singh', '12M', 26],
      ['Luis Fonsi', '18M', 31],
      ['Maroon 5', '37M', 39],
      ['Sony Music India', '42M', 4],
    ],
  },
  {
    id: 'tech',
    title: 'Tech',
    channels: [
      ['3Blue1Brown', '6.4M', 13],
      ['freeCodeCamp.org', '9.8M', 21],
      ['Programming with Mosh', '4.1M', 28],
      ['Tech With Tim', '1.6M', 35],
      ['Code Canvas', '812K', 42],
    ],
  },
  {
    id: 'movies',
    title: 'Movies',
    channels: [
      ['Marvel Entertainment', '21M', 16],
      ['Warner Bros. Pictures', '12M', 23],
      ['Universal Pictures', '8.7M', 30],
      ['Netflix', '30M', 38],
    ],
  },
]

export function mapChannels(sections = CHANNEL_SECTIONS) {
  return sections.map((section) => ({
    ...section,
    channels: section.channels.map(([name, subscribers, image]) => ({
      name,
      subscribers,
      avatar: avatar(name, image),
    })),
  }))
}

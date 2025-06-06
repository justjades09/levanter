const { y2mate, bot, getBuffer, addAudioMetaData, yts, generateList, isUrl } = require('../lib/')
const ytIdRegex =
  /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/

bot(
  {
    pattern: 'ytv ?(.*)',
    desc: 'Download YouTube video',
    type: 'download',
  },
  async (message, match) => {
    match = match || message.reply_message.text
    if (!match) return await message.send('_Example: ytv url_')

    if (match.startsWith('y2mate;')) {
      const [_, q, id] = match.split(';')
      const result = await y2mate.dl(id, 'video', q)
      return await message.sendFromUrl(result, { quoted: message.data })
    }

    if (!ytIdRegex.test(match)) {
      return await message.send('*Provide a valid YouTube link!*', { quoted: message.data })
    }

    const vid = ytIdRegex.exec(match)
    const res = await y2mate.get(vid[1], 'video')
    if (isUrl(res)) return await message.sendFromUrl(res, { quoted: message.data })

    const { title, video, thumbnail, time } = await y2mate.get(vid[1])
    const buttons = []

    for (const q in video) {
      buttons.push({
        text: `${q} (${video[q].fileSizeH || video[q].size})`,
        id: `ytv y2mate;${q};${vid[1]}`,
      })
    }

    if (!buttons.length) {
      return await message.send('*No video found*', { quoted: message.quoted })
    }

    const list = generateList(
      buttons,
      `${title} (${time})\n`,
      message.jid,
      message.participant,
      message.id
    )

    if (list.type === 'text') {
      return await message.sendFromUrl(thumbnail, {
        caption: '```' + list.message + '```',
        buffer: false,
      })
    }

    return await message.send(list.message, {}, list.type)
  }
)

bot(
  {
    pattern: 'yta ?(.*)',
    desc: 'Download YouTube audio',
    type: 'download',
  },
  async (message, match) => {
    match = match || message.reply_message.text
    if (!match) return await message.send('_Example: yta darari/yt url_')

    const vid = ytIdRegex.exec(match)
    if (vid) match = vid[1]

    const [video] = await yts(match, !!vid, null, message.id)
    const { title, thumbnail, id } = video
    const audio = await y2mate.get(id, 'audio')

    if (isUrl(audio)) return await message.sendFromUrl(audio, { quoted: message.data })

    const result = await y2mate.dl(id, 'audio')

    if (!result) return await message.send('_Audio not found._', { quoted: message.data })

    const { buffer } = await getBuffer(result)
    if (!buffer) return await message.send(result, { quoted: message.data })

    return await message.send(
      await addAudioMetaData(buffer, title, '', '', thumbnail.url),
      { quoted: message.data, mimetype: 'audio/mpeg' },
      'audio'
    )
  }
)

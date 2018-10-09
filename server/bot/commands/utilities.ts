// All the types!
import { Message } from 'eris' // eslint-disable-line no-unused-vars
import { Command } from '../imports/types'
// All the needs!
import { getIdFromMention, getDesc } from '../imports/tools'
import * as ms from 'ms'
import 'json5/lib/require'
import { host, testPilots } from '../../../config.json5'

export const handleRequest: Command = {
  name: 'request',
  aliases: ['req'],
  opts: {
    requirements: { userIDs: [...testPilots, host] },
    description: 'Request a specific feature.',
    fullDescription: 'Request a feature. Only available to test pilots.',
    usage: '/request <suggestion>',
    example: '/request a /userinfo command.'
  },
  generator: async ({ author, content, channel }, args, { client }) => {
    client.createMessage(
      (await client.getDMChannel(host)).id,
      `${author.username}#${author.discriminator} with ID ${author.id}: ${args.join(' ')}`
    )
    return `${author.mention}, what a pathetic idea. It has been DMed to the main developer \
and will be read shortly.
You may recieve a response soon, and you can keep track here:
<https://github.com/retrixe/IveBot/projects/1>`
  }
}

export const handleSay: Command = {
  name: 'say',
  opts: {
    requirements: { userIDs: [...testPilots, host], permissions: { manageMessages: true } },
    description: 'Say something, even in another channel.',
    fullDescription: 'Say something. Test pilots and admins/mods only.',
    usage: '/say (channel) <text>',
    example: '/say #general heyo',
    deleteCommand: true
  },
  postGenerator: (message, args, sent, { tempDB }) => {
    if (sent) tempDB.say[sent.channel.id] = sent.id
  },
  generator: async (message, args, { client, tempDB }) => {
    // Should it be sent in another channel?
    const possibleChannel = getIdFromMention(args[0])
    if (message.channelMentions[0] === possibleChannel) {
      args.shift()
      if (args.join(' ') === 'pls adim me') args = ['no']
      tempDB.say[message.channelMentions[0]] = (
        await client.createMessage(message.channelMentions[0], args.join(' '))
      ).id
      return
    }
    // Send the message.
    if (args.join(' ') === 'pls adim me') args = ['no']
    return args.join(' ')
  }
}

export const handleType: Command = {
  name: 'type',
  opts: {
    requirements: { userIDs: [...testPilots, host], permissions: { manageMessages: true } },
    description: 'Type something, even in another channel.',
    fullDescription: 'Type something. Test pilots and admins/mods only.',
    usage: '/type (channel) <text>',
    example: '/type #general heyo',
    deleteCommand: true
  },
  postGenerator: (message, args, sent, { tempDB }) => {
    if (sent) tempDB.say[sent.channel.id] = sent.id
  },
  generator: async (message, args, { tempDB, client }) => {
    // Should it be sent in another channel?
    const possibleChannel = getIdFromMention(args[0])
    if (message.channelMentions[0] === possibleChannel) {
      args.shift()
      if (args.join(' ') === 'pls adim me') args = ['no']
      message.channel.sendTyping()
      await (ms => new Promise(resolve => setTimeout(resolve, ms)))(
        args.join(' ').length * 120 > 8000 ? 8000 : args.join(' ').length * 120
      )
      tempDB.say[message.channelMentions[0]] = (
        await client.createMessage(message.channelMentions[0], args.join(' '))
      ).id
      return
    }
    // Send the message.
    if (args.join(' ') === 'pls adim me') args = ['no']
    message.channel.sendTyping()
    await (ms => new Promise(resolve => setTimeout(resolve, ms)))(
      args.join(' ').length * 120 > 8000 ? 8000 : args.join(' ').length * 120
    )
    return args.join(' ')
  }
}

export const handleRemindme: Command = {
  name: 'remindme',
  aliases: ['rm'],
  opts: {
    fullDescription: 'Remind you of something.',
    description: 'Reminders.',
    usage: '/remindme <time in 1d|1h|1m|1s> <description>',
    example: '/remindme 1h do your homework'
  },
  generator: (message, args) => {
    if (args.length < 2 || !ms(args[0])) {
      return 'Correct usage: /remindme <time in 1d|1h|1m|1s> <description>'
    }
    setTimeout(async () => {
      (await message.author.getDMChannel()).createMessage(
        `⏰ ${getDesc(message)}\nReminder set ${args[0]} ago.`
      )
    }, ms(args[0]))
    return `You will be reminded in ${args[0]} through a DM.`
  }
}

export const handleAvatar: Command = {
  name: 'avatar',
  aliases: ['av'],
  opts: {
    fullDescription: 'Get a large-sized link to the avatar of a user.',
    description: 'Avatar of a user.',
    usage: '/avatar <user>',
    example: '/avatar @voldemort#6931',
    argsRequired: false
  },
  generator: (message, args) => {
    let user: Message['author'] = message.author
    if (message.mentions.length !== 0) user = message.mentions[0]
    return 'Link: ' + user.avatarURL.split('128').join('') + '2048'
  }
}

export const handleLeave: Command = {
  opts: {
    description: 'Makes you leave the server.',
    fullDescription: 'This kicks you from the server, essentially making you leave.',
    usage: '/leave',
    example: '/leave',
    errorMessage: 'There was an error processing your request.',
    guildOnly: true,
    argsRequired: false
  },
  name: 'leave',
  generator: (message, args, { tempDB, client }) => {
    if (!tempDB.leave.includes(message.author.id)) {
      client.createMessage(
        message.channel.id,
        'Are you sure you want to leave the server? ' +
        'You will require an invite link to join back. Type /leave to confirm.'
      )
      tempDB.leave.push(message.author.id)
      setTimeout(() => {
        if (tempDB.leave.findIndex(i => i === message.author.id) === -1) return
        client.createMessage(message.channel.id, 'Your leave request has timed out.')
        tempDB.leave.splice(tempDB.leave.findIndex(i => i === message.author.id), 1)
      }, 30000)
    } else if (tempDB.leave.includes(message.author.id)) {
      tempDB.leave.splice(tempDB.leave.findIndex(i => i === message.author.id), 1)
      try {
        client.kickGuildMember(message.member.guild.id, message.author.id, 'Used /leave.')
      } catch (e) {
        return 'You will have to manually leave the server or transfer ownership before leaving.'
      }
      return `${message.author.username}#${message.author.discriminator} has left the server.`
    }
  }
}

export const handleListserverregions: Command = ({
  name: 'listserverregions',
  aliases: ['lsr'],
  opts: {
    fullDescription: 'List available voice regions.',
    description: 'List available voice regions.',
    usage: '/listserverregions',
    example: '/listserverregions',
    guildOnly: true,
    argsRequired: false
  },
  generator: async (message, args, { client }) => 'Available server regions: `' + (
    await client.getVoiceRegions(message.member.guild.id)
  ).map((value) => value.id).join('`, `') + '`'
})

export const handleChangeserverregion: Command = {
  name: 'changeserverregion',
  aliases: ['csr'],
  opts: {
    fullDescription: 'Changes the voice region of the server.',
    description: 'Changes the voice region of the server.',
    usage: '/changeserverregion <server region>',
    example: '/changeserverregion russia',
    guildOnly: true,
    requirements: {
      permissions: { manageGuild: true }
    },
    invalidUsageMessage: 'Correct usage: /changeserverregion <valid server region, /listserverregion>'
  },
  generator: async (message, args, { client }) => {
    if (!message.member.guild.members.find(a => a.id === client.user.id).permission.has('manageGuild')) {
      return 'I require the Manage Server permission to do that..'
    }
    try {
      const guild = await client.editGuild(message.member.guild.id, {
        region: args.join(' ').toLowerCase()
      })
      const name = (await guild.getVoiceRegions()).find(i => i.id === guild.region).name
      return 'Voice region changed to ' + name + ' \\o/'
    } catch (e) { return 'Invalid server voice region.' }
  }
}

export const handleEdit: Command = {
  name: 'edit',
  opts: {
    requirements: { userIDs: [host] },
    description: 'Edits a single message.',
    fullDescription: 'Edits a single message. Owner only command.',
    usage: '/edit (channel) <message ID> <new text>',
    example: '/edit #general 123456789012345678 hi',
    deleteCommand: true
  },
  generator: async (message, args, { client }) => {
    // Should it be edited in another channel?
    const possibleChannel = getIdFromMention(args[0])
    if (message.channelMentions[0] === possibleChannel) {
      args.shift()
      const messageID = args.shift()
      try {
        client.editMessage(possibleChannel, messageID, args.join(' '))
      } catch (e) { return 'Nothing to edit.' }
      return
    }
    // Edit the message.
    const messageID = args.shift()
    try {
      client.editMessage(message.channel.id, messageID, args.join(' '))
    } catch (e) { return 'Nothing to edit.' }
  }
}

export const handleEditLastSay: Command = {
  name: 'editLastSay',
  aliases: ['els'],
  opts: {
    requirements: { userIDs: [...testPilots, host], permissions: { manageMessages: true } },
    description: 'Edits the last say in a channel.',
    fullDescription: 'Edits the last say in a channel. Test pilots and admins/mods only.',
    usage: '/editLastSay (channel) <new text>',
    example: '/editLastSay #general hey',
    deleteCommand: true
  },
  generator: async (message, args, { tempDB, client }) => {
    // Is the edit for another channel?
    const possibleChannel = getIdFromMention(args[0])
    if (message.channelMentions[0] === possibleChannel) {
      // Edit the message.
      try {
        args.shift()
        client.editMessage(possibleChannel, tempDB.say[possibleChannel], args.join(' '))
      } catch (e) { return 'Nothing to edit.' }
      return
    }
    // Edit the message.
    try {
      client.editMessage(message.channel.id, tempDB.say[message.channel.id], args.join(' '))
    } catch (e) { return 'Nothing to edit.' }
  }
}

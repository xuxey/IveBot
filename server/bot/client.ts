import { Message, MessageContent, Client } from 'eris'
import { DB, Command as IveBotCommand, IveBotCommandGenerator, Context } from './imports/types'
import { Db } from 'mongodb'
import { getInsult } from './imports/tools'
import botCallback from '.'

function isEquivalent (a: { [index: string]: boolean }, b: { [index: string]: boolean }) {
  // Create arrays of property names
  var aProps = Object.getOwnPropertyNames(a)
  var bProps = Object.getOwnPropertyNames(b)

  // If number of properties is different, objects are not equivalent
  if (aProps.length !== bProps.length) return false

  for (var i = 0; i < aProps.length; i++) {
    var propName = aProps[i]

    // If values of same property are not equal, objects are not equivalent
    if (a[propName] !== b[propName]) return false
  }

  // If we made it this far, objects are considered equivalent
  return true
}

export class Command {
  /* eslint-disable no-undef */
  name: string
  aliases: string[]
  generator: IveBotCommandGenerator
  postGenerator?: (message: Message, args: string[], sent?: Message, ctx?: Context) => void
  argsRequired: boolean
  caseInsensitive: boolean
  deleteCommand: boolean
  guildOnly: boolean
  dmOnly: boolean
  description: string
  fullDescription: string
  usage: string
  example: string
  invalidUsageMessage: string
  errorMessage: string
  hidden: boolean
  requirements: {
    userIDs?: string[]
    roleNames?: string[],
    custom?: (message: Message) => boolean,
    permissions?: {},
    roleIDs?: string[]
  }
  /* eslint-enable no-undef */

  constructor (command: IveBotCommand) {
    // Key functions.
    this.name = command.name
    this.aliases = command.aliases
    this.generator = command.generator
    this.postGenerator = command.postGenerator
    // Options.
    this.argsRequired = command.opts.argsRequired === undefined || command.opts.argsRequired
    this.invalidUsageMessage = command.opts.invalidUsageMessage || 'Invalid usage.'
    this.errorMessage = command.opts.errorMessage || 'IveBot has experienced an internal error.'
    // No impl for next.
    this.caseInsensitive = command.opts.caseInsensitive === undefined || command.opts.caseInsensitive
    this.deleteCommand = command.opts.deleteCommand
    this.guildOnly = command.opts.guildOnly
    this.dmOnly = command.opts.dmOnly
    // For help.
    this.description = command.opts.description
    this.fullDescription = command.opts.fullDescription
    this.usage = command.opts.usage
    this.example = command.opts.example
    this.hidden = command.opts.hidden // Unimplemented in help.
    // Requirements.
    this.requirements = command.opts.requirements
    // No cooldown implementation.
    // No reaction implementation.
  }

  requirementsCheck (message: Message) {
    if (!this.requirements) return true
    // No role name or ID impl.
    const userIDs = this.requirements.userIDs // If it doesn't exist it's a pass.
      ? this.requirements.userIDs.includes(message.author.id)
      : false // Next line calls custom if it exists.
    const custom = this.requirements.custom ? this.requirements.custom(message) : false
    // If it's not a guild there are no permissions.
    if (message.channel.type !== 0) return userIDs || custom
    const permissions = this.requirements.permissions
      ? isEquivalent(Object.assign( // Assign the required permissions onto the member's permission.
        message.member.permission.json, this.requirements.permissions
      ), message.member.permission.json) // This should eval true if user has permissions.
      : false
    // If any of these are true, it's a go.
    return userIDs || custom || permissions
  }

  async execute (context: Context, message: Message, args: string[]) { // eslint-disable-line indent
    // Define 2 vars.
    let messageToSend: MessageContent | void | Promise<MessageContent> | Promise<void>
    // If it's a function, we call it first.
    if (typeof this.generator === 'function') messageToSend = this.generator(message, args, context)
    else messageToSend = this.generator
    // We don't process Promises because we unconditionally return a Promise.
    // Async functions returning arrays aren't supported.
    return messageToSend
  }
}

export default class CommandParser {
  commands: { [name: string]: Command } // eslint-disable-line no-undef
  client: Client // eslint-disable-line no-undef
  tempDB: DB // eslint-disable-line no-undef
  db: Db // eslint-disable-line no-undef
  constructor (client: Client, tempDB: DB, db: Db) {
    this.commands = {}
    this.client = client
    this.tempDB = tempDB
    this.db = db
    this.onMessage = this.onMessage.bind(this)
  }

  registerCommand = (command: IveBotCommand) => { // eslint-disable-line no-undef
    this.commands[command.name] = new Command(command)
  }

  async executeCommand (command: Command, message: Message) {
    // We give our generators what they need.
    const context: Context = {
      tempDB: this.tempDB, db: this.db, commandParser: this, client: this.client
    }
    const args = message.content.split(' ')
    args.shift()
    // We check for arguments.
    if (args.length === 0 && command.argsRequired) {
      message.channel.createMessage(command.invalidUsageMessage)
      return
      // Guild and DM only.
    } else if (command.guildOnly && message.channel.type !== 0) return
    else if (command.dmOnly && message.channel.type !== 1) return
    // Check for permissions.
    else if (!command.requirementsCheck(message)) {
      message.channel.createMessage(
        `**Thankfully, you don't have enough permissions for that, you ${getInsult()}.**`
      )
      return
    }
    // We get the exact content to send.
    const messageToSend = await command.execute(context, message, args)
    // We define a sent variable to keep track.
    let sent
    if ( // No permission protection is here as well.
      messageToSend && message.member &&
      message.member.guild.channels.find(i => i.id === message.channel.id)
        .permissionsOf(this.client.user.id).has('sendMessages')
    ) sent = await message.channel.createMessage(messageToSend)
    if (command.postGenerator) command.postGenerator(message, args, sent, context)
    try {
      if (command.deleteCommand) message.delete('Automatically deleted by IveBot.')
    } catch (e) {}
  }

  async onMessage (message: Message) {
    if (!message.content.split(' ')[0].startsWith('/')) {
      botCallback(message, this.client, this.tempDB, this.db)
      return // Don't process it if it's not a command.
    }
    const commandExec = message.content.split(' ')[0].substr(1).toLowerCase()
    // Webhook and bot protection.
    try { if (message.author.bot) return } catch (e) { return }
    // Check for the commands in this.commands.
    const keys = Object.keys(this.commands)
    for (let i = 0; i < keys.length; i++) {
      if (commandExec === keys[i]) {
        // Execute command.
        try {
          await this.executeCommand(this.commands[keys[i]], message)
        } catch (e) {
          message.channel.createMessage(this.commands[keys[i]].errorMessage)
          console.error(e)
        }
        return
      } else if (
        this.commands[keys[i]].aliases && this.commands[keys[i]].aliases.includes(commandExec)
      ) {
        // Execute command.
        try {
          await this.executeCommand(this.commands[keys[i]], message)
        } catch (e) {
          message.channel.createMessage(this.commands[keys[i]].errorMessage)
          console.error(e)
        }
        return
      }
    }
    botCallback(message, this.client, this.tempDB, this.db)
  }
}

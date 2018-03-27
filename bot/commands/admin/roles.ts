import { getArguments, getIdFromMention } from '../../imports/tools'
import { checkUserForPermission, checkRolePosition } from '../../imports/permissions'
import { request } from 'graphql-request'
// Get types.
import { client, event } from '../../imports/types'

// Add role.
export function handleAddrole (
  client: client, event: event, sendResponse: Function, message: string,
  serverSettings: { addRoleForAll: boolean }
) {
  // Check for enough arguments.
  if (message.split(' ').length <= 1) return
  // Check for permissions.
  let allowed = false
  // Check user for permissions.
  if (checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'GENERAL_MANAGE_ROLES')) allowed = true
  else if (serverSettings.addRoleForAll) allowed = true
  if (!allowed) {
    sendResponse('Your server does not allow you to add roles.')
    return
  }
  // Check if add to another user.
  let possibleUser = getIdFromMention(getArguments(message).split(' ')[0])
  const possibleUser2 = getArguments(message).split(' ')[0]
  if (possibleUser2 in client.users) possibleUser = possibleUser2
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === possibleUser2.toLocaleLowerCase())
  ) possibleUser = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === possibleUser2.toLocaleLowerCase()).id
  if (possibleUser in client.users) {
    // Role name.
    const role = getArguments(getArguments(message))
    const roleID = Object.values(
      client.servers[client.channels[event.d.channel_id].guild_id].roles
    ).find(a => a.name === role).id
    // Respect role order.
    if (client.servers[client.channels[event.d.channel_id].guild_id].roles[roleID].position >
      checkRolePosition(client, possibleUser, client.channels[event.d.channel_id].guild_id)
    ) {
      sendResponse('You cannot have this role! People nowadays.')
      return
    }
    client.addToRole({
      serverID: client.channels[event.d.channel_id].guild_id,
      userID: possibleUser,
      roleID
    }, (err: string) => {
      if (err) sendResponse('Could not add role to user. Did you specify a role?')
      else sendResponse(`Added role ${role} to <@${possibleUser}>.`)
    })
    return
  }
  // Role name.
  const role = getArguments(getArguments(message))
  const roleID = Object.values(
    client.servers[client.channels[event.d.channel_id].guild_id].roles
  ).find(a => a.name === role).id
  // Respect role order.
  if (client.servers[client.channels[event.d.channel_id].guild_id].roles[roleID].position >
    checkRolePosition(client, possibleUser, client.channels[event.d.channel_id].guild_id)
  ) {
    sendResponse('You cannot have this role! People nowadays.')
    return
  }
  client.addToRole({
    serverID: client.channels[event.d.channel_id].guild_id,
    userID: event.d.author.id,
    roleID
  }, (err: string) => {
    if (err) sendResponse('Could not add role to user. Did you specify a role?')
    else sendResponse(`Added you to role ${role}.`)
  })
}

// Remove role.
export function handleRemoverole (
  client: client, event: event, sendResponse: Function, message: string,
  serverSettings: { addRoleForAll: boolean }
) {
  // Check for enough arguments.
  if (message.split(' ').length <= 1) return
  // Check for permissions.
  let allowed = false
  // Check user for permissions.
  if (checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'GENERAL_MANAGE_ROLES')) allowed = true
  else if (serverSettings.addRoleForAll) allowed = true
  if (!allowed) {
    sendResponse('Your server does not allow you to add roles.')
    return
  }
  // Respect role order.
  // Check if add to another user.
  let possibleUser = getIdFromMention(getArguments(message).split(' ')[0])
  const possibleUser2 = getArguments(message).split(' ')[0]
  if (possibleUser2 in client.users) possibleUser = possibleUser2
  else if (
    Object.values(client.users).find(a => a.username.toLocaleLowerCase() === possibleUser2.toLocaleLowerCase())
  ) possibleUser = Object.values(client.users).find(a => a.username.toLocaleLowerCase() === possibleUser2.toLocaleLowerCase()).id
  if (possibleUser in client.users) {
    // Role name.
    const role = getArguments(getArguments(message))
    client.removeFromRole({
      serverID: client.channels[event.d.channel_id].guild_id,
      userID: possibleUser,
      roleID: Object.values(
        client.servers[client.channels[event.d.channel_id].guild_id].roles
      ).find(a => a.name === role).id
    }, (err: string) => {
      if (err) sendResponse('Could not remove role from user. Did you specify a role?')
      else sendResponse(`Removed role ${role} from <@${possibleUser}>.`)
    })
    return
  }
  // Role name.
  const role = getArguments(getArguments(message))
  client.removeFromRole({
    serverID: client.channels[event.d.channel_id].guild_id,
    userID: event.d.author.id,
    roleID: Object.values(
      client.servers[client.channels[event.d.channel_id].guild_id].roles
    ).find(a => a.name === role).id
  }, (err: string) => {
    if (err) sendResponse('Could not remove role from user. Did you specify a role?')
    else sendResponse(`Removed you from role ${role}.`)
  })
}

// Toggle public role system.
export async function handleTogglepublicroles (
  client: client, event: event, sendResponse: Function, message: string,
  serverSettings: { addRoleForAll: boolean }
) {
  // Can person manage server?
  if (!checkUserForPermission(client, event.d.author.id, client.channels[event.d.channel_id].guild_id, 'GENERAL_MANAGE_GUILD')) {
    sendResponse('**Thankfully, you don\'t have enough permissions for that, you ungrateful bastard.**')
    return
  }
  // Query.
  const port = parseInt(process.env.PORT, 10) || 3000 // If port variable has been set.
  // If no arguments..
  if (message.split(' ').length === 1) {
    // eslint-disable-next-line typescript/no-explicit-any
    await request(`http://localhost:${port}/graphql`, `
mutation {
  editServerSettings(serverId: "${client.channels[event.d.channel_id].guild_id}", addRoleForAll: ${!serverSettings.addRoleForAll}) {
    addRoleForAll
  }
}
    `)
    sendResponse(`Public role system set to ${!serverSettings.addRoleForAll}.`)
    if (!serverSettings.addRoleForAll) sendResponse(`Regular members may give themselves roles if the role is below their highest one.`)
  } else if (message.split(' ')[1] === 'on') {
    // eslint-disable-next-line typescript/no-explicit-any
    await request(`http://localhost:${port}/graphql`, `
mutation {
  editServerSettings(serverId: "${client.channels[event.d.channel_id].guild_id}", addRoleForAll: true) {
    addRoleForAll
  }
}
    `)
    sendResponse(`Public role system set to ${true}.
Regular members may now give themselves roles if the role is below their highest one.`)
  } else if (message.split(' ')[1] === 'off') {
    // eslint-disable-next-line typescript/no-explicit-any
    await request(`http://localhost:${port}/graphql`, `
mutation {
  editServerSettings(serverId: "${client.channels[event.d.channel_id].guild_id}", addRoleForAll: false) {
    addRoleForAll
  }
}
    `)
    sendResponse(`Public role system set to ${false}.`)
  } else {
    sendResponse('Proper usage: /togglepublicroles (on/off)')
  }
}

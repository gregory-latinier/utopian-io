const Boom = require('boom')
const User = require('../../users/user.model')
const UtopianBlockchainAccounts = require('../../users/utopianBlockchainAccounts.model')
const { getSteemConnectTokens } = require('../../../utils/blockchains/steem')
const { encrypt } = require('../../../utils/security')
const steem = require('steem')

const linkSteemAccount = async (req, h) => {
  const user = await User.findOne({ username: req.auth.credentials.username })
  if (user) {
    const tokens = await getSteemConnectTokens(req.payload.code)
    if (user.blockchainAccounts.some((account) => account.blockchain === 'steem' && account.address === tokens.username)) {
      throw Boom.badData('steem.accountAlreadyLinked')
    }

    user.blockchainAccounts.push({
      blockchain: 'steem',
      address: tokens.username,
      active: (user.blockchainAccounts || []).length === 0
    })
    const response = await User.updateOne(
      { username: req.auth.credentials.username },
      { blockchainAccounts: user.blockchainAccounts }
    )
    if (response.n === 1) {
      return h.response({
        message: 'linkAccountSuccess',
        username: tokens.username,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token)
      })
    }
  }

  throw Boom.badData('users.doesNotExist')
}

const isSteemAccountAvailable = async (req, h) => {
  const accounts = await steem.api.lookupAccountNamesAsync([req.params.username])

  return h.response({ available: !accounts[0] })
}

const generateAuthFromKeys = (keys) => {
  const auth = {}
  Object.keys(keys).forEach((key) => {
    auth[key] = {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [
        [keys[key], 1]
      ]
    }
  })

  return auth
}

const createSteemAccount = async (req, h) => {
  const { username, keys } = req.payload
  try {
    const user = await User.findOne({ _id: req.auth.credentials.uid })

    const hasClaimed = await UtopianBlockchainAccounts.countDocuments({
      blockchain: 'steem',
      $or: user.authProviders.map((authProvider) => ({
        $and: [{
          provider: authProvider.type,
          username: authProvider.username
        }]
      })).concat({ userId: req.auth.credentials.uid })
    })

    if (hasClaimed > 1) {
      throw new Error('claimed')
    }

    const authKeys = generateAuthFromKeys(keys)
    await steem.broadcast.createClaimedAccountAsync(
      process.env.ACCOUNT_CREATOR_ACTIVE_KEY,
      process.env.ACCOUNT_CREATOR,
      username,
      authKeys.owner,
      authKeys.active,
      authKeys.posting,
      authKeys.memo.key_auths[0][0],
      {}, []
    )

    const authProvider = (user.authProviders.find((provider) => provider.type === req.auth.credentials.providerType))

    const newBlockchainAccount = new UtopianBlockchainAccounts({
      blockchain: 'steem',
      address: username,
      provider: req.auth.credentials.providerType,
      username: typeof authProvider === 'object' ? authProvider.username : '',
      userId: req.auth.credentials.uid
    })

    newBlockchainAccount.save()
  } catch (err) {
    if (err.message === 'claimed') {
      throw Boom.badData('steem.userAlreadyClaimed')
    }

    throw Boom.badData('steem.accountCreationError')
  }

  return h.response(true)
}

module.exports = {
  linkSteemAccount,
  isSteemAccountAvailable,
  createSteemAccount
}

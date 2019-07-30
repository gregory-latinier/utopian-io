const Boom = require('boom')
const Article = require('../articles/article.model')
const BountySolutions = require('../bounty-solutions/bounty-solution.model')
const User = require('../users/user.model')
const Tip = require('./tip.model')

const tipDelay = 6 * 24 * 60 * 60 * 1000

/**
 * Request the steem username of an article, bounty solution, ...
 *
 * @param {object} req - request
 * @param {object} req.params - request parameters
 * @param {string} req.params.obj - targeted collection
 * @param {string} req.params.id - targeted object
 *
 * @returns Steem username
 * @author Grégory LATINIER
 */
const getAuthorInfo = async (req, h) => {
  let Object
  const { obj, id } = req.params
  if (obj === 'articles') {
    Object = Article
  } else if (obj === 'bountySolutions') {
    Object = BountySolutions
  }

  const entity = await Object.findOne({ _id: id })

  if (!entity) {
    throw Boom.badData('general.documentDoesNotExist')
  }

  const users = await getSteemAccount(entity.author)

  return h.response(users)
}

/**
 * Request the steem power tip information of an article, bounty solution, ...
 *
 * @param {object} req - request
 * @param {object} req.params - request parameters
 * @param {string} req.params.obj - targeted collection
 * @param {string} req.params.id - targeted object
 *
 * @returns Steem power tipping information
 * @author Grégory LATINIER
 */
const getSteemPowerTipInfo = async (req, h) => {
  let Object
  const { obj, id } = req.params
  const user = req.auth.credentials.uid
  const tip = await Tip.countDocuments({
    objRef: obj,
    objId: id,
    user,
    currency: 'steemPower'
  })

  // A user can only tip once in SP
  if (tip) return h.response(null)

  if (obj === 'articles') {
    Object = Article
  } else if (obj === 'bountySolutions') {
    Object = BountySolutions
  }

  const entity = await Object.findOne({ _id: id })
  if (!entity) {
    throw Boom.badData('general.documentDoesNotExist')
  }

  // The post can't receive anymore votes
  if (entity.steemPowerTip.date.getTime() + tipDelay < Date.now()) {
    // We need to create the parent comment that will hold the child comments to tip the author
    const steemPowerTip = entity.steemPowerTip
    let operations = []
    if (!steemPowerTip.parentPermlink) {
      const permlink = `re-${entity.blockchains[0].data.permlink}-${Date.now()}`
      operations.push([
        'comment',
        {
          author: process.env.FOREVER_ADDRESS,
          body: 'OpenChange forever main comment',
          json_metadata: '',
          parent_author: entity.blockchains[0].data.author,
          parent_permlink: entity.blockchains[0].data.permlink,
          permlink,
          title: ''
        }
      ])

      // TODO error with posting auth? Why?
      operations.push([
        'comment_options',
        {
          author: process.env.FOREVER_ADDRESS,
          permlink,
          parent_author: entity.blockchains[0].data.author,
          parent_permlink: entity.blockchains[0].data.permlink,
          max_accepted_payout: '0.000 SBD',
          percent_steem_dollars: 0,
          allow_votes: true,
          allow_curation_rewards: false,
          extensions: []
        }
      ])

      const transaction = await req.steem.broadcast.sendAsync({
        extensions: [],
        operations
      }, { posting: process.env.FOREVER_KEY })
      if (transaction.id) {
        steemPowerTip.parentPermlink = permlink
      }
    }

    if (!steemPowerTip.parentPermlink) {
      throw Boom.badData('general.steemTipParentError')
    }

    // Create the comment that will receive the Steem Power tips
    operations = []
    const commentPermlink = `re-${steemPowerTip.parentPermlink}-${Date.now()}`
    operations.push([
      'comment',
      {
        author: process.env.FOREVER_ADDRESS,
        body: 'Upvote the last comment to reward the author',
        json_metadata: '',
        parent_author: process.env.FOREVER_ADDRESS,
        parent_permlink: steemPowerTip.parentPermlink,
        permlink: commentPermlink,
        title: ''
      }
    ])
    operations.push([
      'comment_options',
      {
        author: process.env.FOREVER_ADDRESS,
        permlink: commentPermlink,
        max_accepted_payout: '1000000.000 SBD',
        percent_steem_dollars: 0,
        allow_votes: true,
        allow_curation_rewards: true,
        extensions: [
          [0,
            {
              beneficiaries: [
                { account: 'openchange', weight: 500 },
                { account: entity.blockchains[0].data.author, weight: 9500 }
              ]
            }
          ]
        ]
      }
    ])
    const transactionComment = await req.steem.broadcast.sendAsync({
      extensions: [],
      operations
    }, { posting: process.env.FOREVER_KEY })
    if (transactionComment.id) {
      steemPowerTip.date = Date.now()
      steemPowerTip.author = process.env.FOREVER_ADDRESS
      steemPowerTip.permlink = commentPermlink
      await Object.findOneAndUpdate(
        { _id: id },
        {
          $set: { steemPowerTip }
        }
      )
    } else {
      throw Boom.badData('general.steemTipCommentError')
    }

    return h.response({
      author: process.env.FOREVER_ADDRESS,
      permlink: commentPermlink
    })
  }

  return h.response(entity.steemPowerTip)
}

const hasUserTippedInSteemPower = async (req, h) => {
  const { obj, id } = req.params
  const user = req.auth.credentials.uid
  const tip = await Tip.countDocuments({
    objRef: obj,
    objId: id,
    user,
    currency: 'steemPower'
  })

  // A user can only tip once in SP
  if (tip > 0) return h.response(true)
  return h.response(false)
}

/**
 * Save a tip for any contribution
 *
 * @param req
 * @param h
 * @returns {Promise<void>}
 *
 * @author Grégory LATINIER
 */
const createTip = async (req, h) => {
  const tipper = req.auth.credentials.uid
  const { obj, id, tips, anonymous, data } = req.payload
  let tipProcessed = false
  let Object
  switch (obj) {
  case 'articles':
    Object = Article
    break
  case 'bountySolutions':
    Object = BountySolutions
    break
  default:
    break
  }

  const entity = await Object.findOne({ _id: id })
  if (!Object || !entity) {
    throw Boom.badData('general.documentDoesNotExist')
  }

  // Steem accounts of the tipper and receiver
  let from
  let to
  for await (const tip of tips) {
    const { currency, amount } = tip
    if (currency === 'steem' || currency === 'sbd') {
      if (!to) {
        to = (await getSteemAccount(entity.author)).steemUser
      }

      if (!from) {
        from = (await getSteemAccount(tipper)).steemUser
      }

      if (!to || !from) {
        continue
      }

      const block = await req.steem.api.getBlockAsync(data.block)
      if (!block) {
        throw Boom.badData('general.documentDoesNotExist')
      }

      const blockchainTransaction = block.transactions.find((t) => t.transaction_id === data.id)
      if (!blockchainTransaction) {
        throw Boom.badData('general.documentDoesNotExist')
      }

      const operation = blockchainTransaction.operations[0][1]
      if (
        operation.from === from &&
        operation.to === to &&
        operation.amount === `${amount} ${currency.toUpperCase()}`
      ) {
        const exists = await Tip.findOne({
          objRef: obj,
          objId: id,
          user: tipper,
          currency,
          amount,
          data
        })
        if (!exists) {
          const newTip = new Tip({
            objRef: obj,
            objId: id,
            user: tipper,
            currency,
            amount,
            anonymous,
            data
          })
          await newTip.save()
          tipProcessed = true
        } else {
          tipProcessed = false
        }
      }
    } else if (currency === 'steemPower') {
      const newTip = new Tip({
        objRef: obj,
        objId: id,
        user: tipper,
        currency,
        amount,
        anonymous,
        data
      })
      await newTip.save()
      tipProcessed = true
    }
  }

  return h.response(tipProcessed)
}

/**
 *
 * @param id - user to search
 * @returns string - steem account
 */
const getSteemAccount = async (id) => {
  const user = await User.findOne({ _id: id })
  if (!user) {
    throw Boom.badData('general.documentDoesNotExist')
  }

  if (user.blockchainAccounts) {
    const account = user.blockchainAccounts.find((b) => b.blockchain === 'steem')
    if (account) {
      return {
        steemUser: account.address,
        username: user.username
      }
    }
  }

  return {
    steemUser: null,
    username: null
  }
}

module.exports = {
  getAuthorInfo,
  getSteemPowerTipInfo,
  hasUserTippedInSteemPower,
  createTip
}

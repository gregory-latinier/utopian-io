const Handlers = require('./handlers')
const Validate = require('./validate')

const routes = []
routes.push([
  {
    method: 'POST',
    path: '/v1/blockchains/steem/linkaccount',
    handler: (req, h) => Handlers.linkSteemAccount(req, h),
    options: {
      tags: ['blockchains', 'steem'],
      validate: Validate.linkSteemAccount
    }
  },
  {
    method: 'GET',
    path: '/v1/blockchains/steem/{username}/available',
    handler: (req, h) => Handlers.isSteemAccountAvailable(req, h),
    options: {
      tags: ['blockchains', 'steem'],
      validate: Validate.isSteemAccountAvailable
    }
  },
  {
    method: 'POST',
    path: '/v1/blockchains/steem/createaccount',
    handler: (req, h) => Handlers.createSteemAccount(req, h),
    options: {
      tags: ['blockchains', 'steem'],
      validate: Validate.createSteemAccount
    }
  }
])
module.exports = routes

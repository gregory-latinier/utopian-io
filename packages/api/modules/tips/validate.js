const Joi = require('joi')
const { validation } = require('../../utils/constants')

const getAuthorInfo = {
  params: {
    obj: Joi.string().trim().required().allow('articles', 'bountySolutions'),
    id: validation.id.required()
  }
}

/**
 * @param data - contains any relevant information that can be used to verify the tip on the blockchain
 *
 */
const createTip = {
  payload: {
    obj: Joi.string().trim().required().allow('articles', 'bountySolutions'),
    id: validation.id.required(),
    tips: Joi.array().max(2).items({
      currency: Joi.string().trim().required().allow('bitcoin', 'litecoin', 'ethereum', 'steem', 'sbd', 'steemPower'),
      amount: Joi.number().required()
    }),
    anonymous: Joi.boolean(),
    data: Joi.object().required()
  }
}

const getSteemPowerTipInfo = {
  params: {
    obj: Joi.string().trim().required().allow('articles', 'bountySolutions'),
    id: validation.id.required()
  }
}

const hasUserTippedInSteemPower = {
  params: {
    obj: Joi.string().trim().required().allow('articles', 'bountySolutions'),
    id: validation.id.required()
  }
}

module.exports = {
  getAuthorInfo,
  getSteemPowerTipInfo,
  hasUserTippedInSteemPower,
  createTip
}

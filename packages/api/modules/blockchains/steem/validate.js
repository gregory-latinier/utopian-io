const Joi = require('joi')

const linkSteemAccount = {
  payload: {
    code: Joi.string().trim().required()
  }
}

const isSteemAccountAvailable = {
  params: {
    username: Joi.string().trim().required()
  }
}

const createSteemAccount = {
  payload: {
    username: Joi.string().trim().required(),
    keys: Joi.object({
      owner: Joi.string().required(),
      active: Joi.string().required(),
      posting: Joi.string().required(),
      memo: Joi.string().required()
    })
  }
}

module.exports = {
  linkSteemAccount,
  isSteemAccountAvailable,
  createSteemAccount
}

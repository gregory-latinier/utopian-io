const Axios = require('axios')
const Boom = require('boom')

const requestLinkedinAccessToken = async (code) => {
  try {
    const response = await Axios({
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: 'https://www.linkedin.com/oauth/v2/accessToken',
      data:
        `client_id=${encodeURIComponent(process.env.LINKEDIN_CLIENT_ID)}&` +
        `client_secret=${encodeURIComponent(process.env.LINKEDIN_CLIENT_SECRET)}&` +
        `redirect_uri=${encodeURIComponent(process.env.LINKEDIN_REDIRECT_URL)}&` +
        `grant_type=${encodeURIComponent('authorization_code')}&` +
        `code=${encodeURIComponent(code)}`
    })
    if (response.status === 200 && response.data.access_token) {
      return response.data.access_token
    }

    throw Boom.badData('linkedin.getUserPermission')
  } catch (err) {
    console.log(err)
    throw Boom.badData('linkedin.getUserPermission')
  }
}

const getLinkedinUserInformation = async (token) => {
  try {
    const linkedInResponse = await Axios({
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      url: 'https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))'
    })
    const linkedInEmailResponse = await Axios({
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))'
    })

    if (linkedInResponse.status === 200 && linkedInResponse.data &&
      linkedInEmailResponse.status === 200 && linkedInEmailResponse.data) {
      return {
        emailAddress: linkedInEmailResponse.data.elements[0]['handle~'].emailAddress,
        pictureUrl: linkedInResponse.data.profilePicture['displayImage~'].elements[0].identifiers[0].identifier,
        id: linkedInResponse.data.id
      }
    }

  } catch (err) {
    console.log(err)
    throw Boom.badData('linkedin.getUserData')
  }
}

module.exports = {
  requestLinkedinAccessToken,
  getLinkedinUserInformation
}

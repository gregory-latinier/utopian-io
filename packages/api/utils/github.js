const Axios = require('axios')
const Boom = require('boom')

const requestGitHubAccessToken = async (code) => {
  try {
    const response = await Axios({
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      url: 'https://github.com/login/oauth/access_token',
      data: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      }
    })
    if (response.status === 200 && response.data.access_token) {
      return response.data.access_token
    }

    throw Boom.badData('github-get-access-token')
  } catch (err) {
    throw Boom.badData('github-get-access-token')
  }
}

const getGitHubUserInformation = async (token) => {
  try {
    let userEmail = null;
    const getGithubInfo = await Axios({
      method: 'GET',
      headers: {
        'Authorization': `bearer ${token}`
      },
      url: 'https://api.github.com/user'
    });

    const getGithubEmails = await Axios({
      method: 'GET',
      headers: {
        'Authorization': `bearer ${token}`
      },
      url: 'https://api.github.com/user/emails'
    })

    if (getGithubInfo.status !== 200 || getGithubEmails.status !== 200) {
      throw Boom.badData('github.getUserData')
    }

    getGithubEmails.data.forEach(gitHubEmail => {
      if (gitHubEmail.primary === true) {
        userEmail = gitHubEmail.email;
      }
    })

    return {
      login: getGithubInfo.data.login,
      avatarUrl: getGithubInfo.data.avatar_url,
      email: userEmail
    }

    throw Boom.badData('github.getUserData')
  } catch (err) {
    throw Boom.badData('github.getUserData')
  }
}

const getUserProjectPermission = async ({ token, owner, name }) => {
  try {
    const githubResponse = await Axios({
      method: 'POST',
      headers: {
        'Authorization': `bearer ${token}`
      },
      url: 'https://api.github.com/graphql',
      data: {
        query: `
        query {
          repository(owner: "${owner}", name: "${name}") {
            viewerPermission
          }
        }
        `
      }
    })
    if (githubResponse.status === 200 && githubResponse.data) {
      return githubResponse.data.data.repository.viewerPermission
    }

    throw Boom.badData('github.getUserPermission')
  } catch (err) {
    console.log(err)
    throw Boom.badData('github.getUserPermission')
  }
}

module.exports = {
  getGitHubUserInformation,
  requestGitHubAccessToken,
  getUserProjectPermission
}

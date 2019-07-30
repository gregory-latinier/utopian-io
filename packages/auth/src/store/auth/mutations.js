export const setCredentials = (state, credentials = null) => {
  state.credentials = credentials
}

export const clear = (state) => {
  state.user = null
  state.credentials = []
}
